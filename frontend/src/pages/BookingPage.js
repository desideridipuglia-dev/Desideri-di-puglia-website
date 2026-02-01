import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { Calendar } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, isBefore, isSameDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { ArrowRight, Loader2, Wine, Grape, Anchor, ShoppingBasket, Sparkles, Coffee, Gift, Check, Lock, ShieldCheck, Star, HeartHandshake } from 'lucide-react';

const API = "https://desideri-backend.onrender.com/api";

const getOptimizedUrl = (url) => {
  if (!url) return "";
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=400&auto=format&fit=crop`;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&q=80&output=webp`;
};

const UPSELL_ICONS = {
  wine: Wine,
  grape: Grape,
  anchor: Anchor,
  'shopping-basket': ShoppingBasket,
  sparkles: Sparkles,
  coffee: Coffee,
  gift: Gift
};

// --- COMPONENTE GIORNO (ELEGANTE) ---
const AnimatedDayContent = ({ date }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative z-10">
        <motion.span
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="font-sans text-sm"
        >
            {date.getDate()}
        </motion.span>
    </div>
  );
};

const BookingPage = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedRoom = searchParams.get('room');

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(preselectedRoom || '');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [customPrices, setCustomPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [upsells, setUpsells] = useState([]);
  const [selectedUpsells, setSelectedUpsells] = useState([]);
  const [stayReasons, setStayReasons] = useState([]);
  
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    num_guests: 1,
    notes: '',
    coupon_code: '',
    stay_reason: ''
  });
  
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [roomsRes, reasonsRes, upsellsRes] = await Promise.all([
          axios.get(`${API}/rooms`),
          axios.get(`${API}/stay-reasons`),
          axios.get(`${API}/upsells?active_only=true`)
        ]);
        setRooms(roomsRes.data);
        setStayReasons(reasonsRes.data);
        setUpsells(upsellsRes.data);
        if (preselectedRoom && roomsRes.data.find(r => r.id === preselectedRoom)) {
          setSelectedRoom(preselectedRoom);
        }
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [preselectedRoom]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedRoom) return;
      try {
        const startDate = format(new Date(), 'yyyy-MM-dd');
        const endDate = format(addDays(new Date(), 365), 'yyyy-MM-dd');
        const response = await axios.get(`${API}/availability/${selectedRoom}?start_date=${startDate}&end_date=${endDate}`);
        setUnavailableDates(response.data.unavailable_dates.map(d => new Date(d)));
        setCustomPrices(response.data.custom_prices || {});
      } catch (error) {
        console.error('Error availability', error);
      }
    };
    fetchAvailability();
    setSelectedUpsells([]);
  }, [selectedRoom]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const nights = dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  
  const calculateRoomPrice = () => {
    if (!selectedRoomData || !dateRange.from || !dateRange.to) return 0;
    let total = 0;
    let current = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    while (current < end) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const dayPrice = customPrices[dateStr] || selectedRoomData.price_per_night;
      total += dayPrice;
      current = addDays(current, 1);
    }
    return total;
  };
  
  const roomPrice = calculateRoomPrice();
  
  const upsellsTotal = selectedUpsells.reduce((sum, upsellId) => {
    const upsell = upsells.find(u => u.id === upsellId);
    return sum + (upsell?.price || 0);
  }, 0);
  
  const subtotal = roomPrice + upsellsTotal;
  
  let discountAmount = 0;
  if (couponDiscount && couponStatus === 'valid') {
    if (couponDiscount.discount_type === 'percentage') {
      discountAmount = roomPrice * (couponDiscount.discount_value / 100);
    } else {
      discountAmount = Math.min(couponDiscount.discount_value, roomPrice);
    }
  }
  const totalPrice = subtotal - discountAmount;
  const availableUpsells = upsells.filter(upsell => upsell.min_nights <= nights);
  
  const toggleUpsell = (upsellId) => {
    setSelectedUpsells(prev => 
      prev.includes(upsellId) ? prev.filter(id => id !== upsellId) : [...prev, upsellId]
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'coupon_code') {
      setCouponStatus(null);
      setCouponDiscount(null);
    }
  };
  
  const validateCoupon = async () => {
    if (!formData.coupon_code) return;
    try {
      const response = await axios.get(`${API}/coupons/validate/${formData.coupon_code}?nights=${nights}`);
      setCouponStatus('valid');
      setCouponDiscount(response.data);
      toast.success(language === 'it' ? 'Coupon applicato!' : 'Coupon applied!');
    } catch (error) {
      setCouponStatus('invalid');
      setCouponDiscount(null);
      toast.error(language === 'it' ? 'Coupon non valido' : 'Invalid coupon');
    }
  };

  const isDateUnavailable = (date) => {
    return unavailableDates.some(unavailable => isSameDay(date, unavailable)) || isBefore(date, new Date());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoom || !dateRange.from || !dateRange.to) {
      toast.error(t('booking.selectDates'));
      return;
    }
    if (!formData.guest_name || !formData.guest_email || !formData.guest_phone) {
      toast.error(language === 'it' ? 'Compila tutti i campi obbligatori' : 'Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      const bookingData = {
        room_id: selectedRoom,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        check_in: format(dateRange.from, 'yyyy-MM-dd'),
        check_out: format(dateRange.to, 'yyyy-MM-dd'),
        num_guests: parseInt(formData.num_guests),
        notes: formData.notes || null,
        origin_url: window.location.origin,
        coupon_code: couponStatus === 'valid' ? formData.coupon_code : null,
        upsell_ids: selectedUpsells.length > 0 ? selectedUpsells : null,
        stay_reason: formData.stay_reason || null
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error(t('common.error'));
      setSubmitting(false);
    }
  };

  const locale = language === 'it' ? it : enUS;

  const calendarComponents = useMemo(() => ({
    DayContent: AnimatedDayContent
  }), []);

  if (loading) {
      return (
        <div className="min-h-screen pt-20 flex items-center justify-center bg-stone-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-antique-gold" />
        </div>
      );
  }

  return (
    <div data-testid="booking-page" className="min-h-screen bg-stone-50 pt-20 pb-40 lg:pb-0 font-sans">
      
      {/* --- CSS FORCE WHATSAPP UP --- */}
      <style>{`
        @media (max-width: 768px) {
          [class*="eapps-widget"],
          [class*="whatsapp"],
          #whatsapp-widget,
          .wa-chat-widget,
          div[id^="wa"],
          a[href*="wa.me"] {
            bottom: 120px !important;
            transition: bottom 0.3s ease;
            z-index: 40 !important;
          }
        }
      `}</style>

      {/* Header Immersivo */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-adriatic-blue">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 text-center text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="font-accent text-antique-gold text-xs md:text-sm tracking-[0.4em] uppercase mb-4">Desideri di Puglia</p>
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl mb-6">{t('booking.title')}</h1>
            <p className="text-white/80 mt-2 font-light max-w-2xl mx-auto text-lg leading-relaxed">{t('booking.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="bg-white border-b border-stone-100 py-4 hidden md:block">
          <div className="max-w-7xl mx-auto px-12 flex justify-center gap-12 text-stone-500 text-xs uppercase tracking-widest font-medium">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-antique-gold" /> {language === 'it' ? 'Miglior Tariffa Garantita' : 'Best Rate Guaranteed'}</div>
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-antique-gold" /> {language === 'it' ? 'Esperienza Autentica' : 'Authentic Experience'}</div>
              <div className="flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-antique-gold" /> {language === 'it' ? 'Assistenza Diretta' : 'Direct Support'}</div>
          </div>
      </div>

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 space-y-10">
              <form onSubmit={handleSubmit} id="booking-form" className="space-y-12">
                
                {/* 1. SELEZIONE STANZA */}
                <div className="space-y-6">
                  <h2 className="font-heading text-2xl text-adriatic-blue flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full border border-antique-gold text-antique-gold text-sm font-bold font-sans">1</span>
                    {language === 'it' ? 'La tua Dimora' : 'Your Retreat'}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {rooms.map((room) => {
                      const roomName = language === 'it' ? room.name_it : room.name_en;
                      const isSelected = selectedRoom === room.id;
                      const thumbUrl = getOptimizedUrl(room.images?.[0]?.url || '');
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoom(room.id)}
                          className={`group flex items-center gap-5 p-4 text-left transition-all duration-500 rounded-xl border relative overflow-hidden bg-white ${
                            isSelected ? 'border-antique-gold shadow-lg shadow-antique-gold/10' : 'border-stone-200 hover:border-adriatic-blue/30 hover:shadow-md'
                          }`}
                        >
                          <div className="w-24 h-24 md:w-32 md:h-24 shrink-0 rounded-lg overflow-hidden bg-stone-200">
                             {thumbUrl && <img src={thumbUrl} alt={roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />}
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <h3 className={`font-heading text-xl truncate mb-1 ${isSelected ? 'text-adriatic-blue' : 'text-stone-700'}`}>{roomName}</h3>
                            <p className="text-stone-500 text-xs uppercase tracking-wider flex items-center gap-2">
                                Max {room.max_guests} {t('booking.guests')}
                            </p>
                            <p className="mt-2 text-stone-400 text-xs line-clamp-1 italic font-light">
                                {language === 'it' ? room.description_it : room.description_en}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                              isSelected ? 'border-antique-gold bg-antique-gold text-white' : 'border-stone-300 text-transparent'
                          }`}>
                              <Check className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CALENDARIO */}
                <div className="space-y-6">
                  <h2 className="font-heading text-2xl text-adriatic-blue flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full border border-antique-gold text-antique-gold text-sm font-bold font-sans">2</span>
                    {t('booking.selectDates')}
                  </h2>
                  <div className="bg-white p-6 md:p-8 rounded-xl border border-stone-100 shadow-sm flex justify-center">
                    <div className="w-full max-w-lg">
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={1}
                            pagedNavigation
                            locale={locale}
                            disabled={isDateUnavailable}
                            className="p-0"
                            components={calendarComponents}
                            classNames={{
                                month: "space-y-6 w-full",
                                caption: "flex justify-between items-center px-2 mb-4",
                                caption_label: "text-xl font-heading text-adriatic-blue font-normal",
                                nav: "flex gap-2",
                                nav_button: "h-8 w-8 hover:bg-stone-50 text-stone-400 hover:text-adriatic-blue rounded-full flex items-center justify-center transition-colors",
                                table: "w-full border-collapse",
                                head_row: "flex justify-between mb-2",
                                head_cell: "text-stone-400 w-10 text-[10px] uppercase tracking-widest",
                                row: "flex justify-between mt-2",
                                cell: "h-10 w-10 text-center p-0 relative",
                                day: "h-10 w-10 p-0 font-light text-stone-600 hover:bg-stone-50 rounded-full transition-all",
                                day_selected: "bg-antique-gold text-white shadow-md shadow-antique-gold/20 font-medium",
                                day_today: "text-adriatic-blue font-medium underline decoration-antique-gold underline-offset-4",
                                day_outside: "text-stone-300 opacity-50",
                                day_disabled: "text-stone-200 line-through opacity-40",
                                day_range_middle: "!bg-antique-gold/10 !text-adriatic-blue rounded-none mx-0 w-full",
                                day_range_start: "rounded-l-full rounded-r-none",
                                day_range_end: "rounded-r-full rounded-l-none",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>
                  </div>
                </div>

                {/* 3. DETTAGLI */}
                <div className="space-y-6">
                   <h2 className="font-heading text-2xl text-adriatic-blue flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full border border-antique-gold text-antique-gold text-sm font-bold font-sans">3</span>
                    {language === 'it' ? 'I tuoi dettagli' : 'Your Details'}
                  </h2>
                  <div className="bg-white p-6 md:p-8 rounded-xl border border-stone-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="guest_name" className="text-stone-500 text-xs uppercase tracking-widest">{t('booking.name')} *</Label>
                      <Input id="guest_name" name="guest_name" value={formData.guest_name} onChange={handleInputChange} required className="h-12 rounded-none border-0 border-b border-stone-200 focus:border-antique-gold focus:ring-0 px-0 text-adriatic-blue bg-transparent" placeholder="Nome Cognome" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_email" className="text-stone-500 text-xs uppercase tracking-widest">{t('booking.email')} *</Label>
                      <Input id="guest_email" name="guest_email" type="email" value={formData.guest_email} onChange={handleInputChange} required className="h-12 rounded-none border-0 border-b border-stone-200 focus:border-antique-gold focus:ring-0 px-0 text-adriatic-blue bg-transparent" placeholder="email@esempio.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_phone" className="text-stone-500 text-xs uppercase tracking-widest">{t('booking.phone')} *</Label>
                      <Input id="guest_phone" name="guest_phone" type="tel" value={formData.guest_phone} onChange={handleInputChange} required className="h-12 rounded-none border-0 border-b border-stone-200 focus:border-antique-gold focus:ring-0 px-0 text-adriatic-blue bg-transparent" placeholder="+39 ..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="num_guests" className="text-stone-500 text-xs uppercase tracking-widest">{t('booking.guests')}</Label>
                      <Select value={String(formData.num_guests)} onValueChange={(value) => setFormData(prev => ({ ...prev, num_guests: parseInt(value) }))}>
                        <SelectTrigger className="h-12 rounded-none border-0 border-b border-stone-200 focus:ring-0 px-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map(num => (<SelectItem key={num} value={String(num)}>{num}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <Label htmlFor="coupon_code" className="text-stone-500 text-xs uppercase tracking-widest">{language === 'it' ? 'Codice Promozionale' : 'Promo Code'}</Label>
                            <div className="flex gap-2 items-end">
                                <Input id="coupon_code" name="coupon_code" value={formData.coupon_code} onChange={handleInputChange} className={`h-10 rounded-none border-0 border-b border-stone-200 focus:ring-0 px-0 uppercase text-sm flex-1 ${couponStatus === 'valid' ? 'text-green-600 border-green-500' : ''}`} />
                                <button type="button" onClick={validateCoupon} disabled={!formData.coupon_code} className="text-xs font-bold text-antique-gold uppercase hover:text-adriatic-blue transition-colors pb-3">
                                    {language === 'it' ? 'Applica' : 'Apply'}
                                </button>
                            </div>
                        </div>
                     </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="notes" className="text-stone-500 text-xs uppercase tracking-widest">{t('booking.notes')}</Label>
                      <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className="rounded-none border-0 border-b border-stone-200 focus:border-antique-gold focus:ring-0 px-0 text-adriatic-blue bg-transparent resize-none" placeholder={language === 'it' ? 'Allergie, orario di arrivo, richieste speciali...' : 'Allergies, arrival time, special requests...'} />
                    </div>
                  </div>
                </div>
                
                {/* 4. UPSELLS */}
                {nights > 0 && availableUpsells.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="font-heading text-2xl text-adriatic-blue">{language === 'it' ? 'Esperienze Esclusive' : 'Exclusive Experiences'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableUpsells.map((upsell) => {
                        const IconComponent = UPSELL_ICONS[upsell.icon] || Gift;
                        const isSelected = selectedUpsells.includes(upsell.id);
                        return (
                          <button key={upsell.id} type="button" onClick={() => toggleUpsell(upsell.id)} className={`p-5 flex items-start gap-4 text-left transition-all duration-300 rounded-xl border relative group bg-white ${isSelected ? 'border-antique-gold bg-antique-gold/5' : 'border-stone-200 hover:border-stone-300'}`}>
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${isSelected ? 'bg-antique-gold text-white' : 'bg-stone-100 text-stone-400 group-hover:text-adriatic-blue'}`}><IconComponent className="w-5 h-5" /></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start"><h3 className={`font-medium text-base ${isSelected ? 'text-adriatic-blue' : 'text-stone-600'}`}>{language === 'it' ? upsell.title_it : upsell.title_en}</h3><span className="text-antique-gold font-bold text-xs whitespace-nowrap ml-2">+ €{upsell.price}</span></div>
                                <p className={`text-xs mt-1 leading-relaxed transition-all duration-300 ${isSelected ? 'text-stone-600 line-clamp-none' : 'text-stone-400 line-clamp-2'}`}>
                                    {language === 'it' ? upsell.description_it : upsell.description_en}
                                </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* RIGHT COLUMN */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-white p-0 rounded-2xl border border-stone-100 shadow-2xl sticky top-24 overflow-hidden">
                <div className="h-48 bg-stone-200 relative">
                    {selectedRoomData ? (
                        <>
                            <img 
                                src={getOptimizedUrl(selectedRoomData.images?.[0]?.url || '')} 
                                alt="Selected Room" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div className="absolute bottom-4 left-6 text-white">
                                <span className="text-[10px] uppercase tracking-widest opacity-80">{language === 'it' ? 'La tua scelta' : 'Your Choice'}</span>
                                <h3 className="font-heading text-xl">{language === 'it' ? selectedRoomData.name_it : selectedRoomData.name_en}</h3>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100">
                            <span className="text-xs uppercase tracking-widest">Seleziona una stanza</span>
                        </div>
                    )}
                </div>

                <div className="p-8">
                    {selectedRoomData ? (
                        <div className="space-y-6">
                            {dateRange.from && dateRange.to && (
                                <div className="flex justify-between text-sm border-b border-stone-100 pb-6">
                                    <div>
                                        <span className="block text-[10px] text-stone-400 uppercase tracking-widest mb-1">Check-in</span>
                                        <span className="font-bold text-stone-700">{format(dateRange.from, 'dd MMM yyyy')}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] text-stone-400 uppercase tracking-widest mb-1">Check-out</span>
                                        <span className="font-bold text-stone-700">{format(dateRange.to, 'dd MMM yyyy')}</span>
                                    </div>
                                </div>
                            )}
                            
                            {nights > 0 && (
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm"><span className="text-stone-500">{nights} {t('booking.nights')}</span><span className="text-stone-700">€{roomPrice.toFixed(2)}</span></div>
                                    {selectedUpsells.length > 0 && selectedUpsells.map(id => { const u = upsells.find(x => x.id === id); return u ? <div key={id} className="flex justify-between text-xs text-stone-500"><span>{language === 'it' ? u.title_it : u.title_en}</span><span>+€{u.price}</span></div> : null; })}
                                    {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Sconto</span><span>-€{discountAmount.toFixed(2)}</span></div>}
                                    
                                    <div className="flex justify-between items-end pt-6 border-t border-stone-100 mt-4">
                                        <span className="font-heading text-adriatic-blue text-lg">{t('booking.total')}</span>
                                        <span className="font-heading text-antique-gold text-3xl">€{totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" form="booking-form" disabled={submitting || !selectedRoom || !dateRange.from || !dateRange.to} className="w-full bg-antique-gold text-white hover:bg-adriatic-blue py-6 text-xs uppercase tracking-[0.2em] font-bold shadow-lg hover:shadow-xl transition-all duration-500 rounded-none">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('booking.proceed')} <ArrowRight className="w-4 h-4 ml-2" /></>}
                            </Button>
                        </div>
                    ) : (
                        <p className="text-stone-400 text-xs text-center italic">Completa la selezione per vedere il riepilogo.</p>
                    )}
                    
                    <div className="mt-6 flex items-center justify-center gap-2 text-stone-300">
                        <Lock size={10} />
                        <span className="text-[9px] uppercase tracking-widest">Secure Booking</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MOBILE STICKY BAR --- */}
      <AnimatePresence>
        {selectedRoom && dateRange.from && dateRange.to && (
            <motion.div 
                initial={{ y: 100 }} 
                animate={{ y: 0 }} 
                exit={{ y: 100 }} 
                className="fixed bottom-6 left-4 right-4 bg-adriatic-blue text-white p-4 rounded-2xl shadow-2xl z-50 lg:hidden flex items-center justify-between border border-white/10"
            >
                <div className="flex flex-col">
                    <span className="text-[9px] text-white/60 uppercase tracking-widest font-medium mb-1">
                        {nights > 0 ? `Totale (${nights} notti)` : 'Totale stimato'}
                    </span>
                    <span className="font-heading text-2xl text-antique-gold leading-none">
                        €{totalPrice > 0 ? totalPrice.toFixed(0) : (selectedRoomData?.price_per_night || 0)}
                    </span>
                </div>
                
                <Button 
                  onClick={(e) => { 
                      handleSubmit(e); 
                  }} 
                  disabled={submitting} 
                  className="bg-antique-gold text-adriatic-blue hover:bg-white px-6 h-12 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all duration-300"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : (
                      <span className="flex items-center gap-2">
                          {t('booking.proceed')} <ArrowRight className="w-4 h-4" />
                      </span>
                  )}
                </Button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPage;