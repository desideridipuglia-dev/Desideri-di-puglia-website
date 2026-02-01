import React, { useState, useEffect, useMemo } from 'react'; // Aggiunto useMemo
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
import { ArrowRight, Loader2, Wine, Grape, Anchor, ShoppingBasket, Sparkles, Coffee, Gift, Check, Lock } from 'lucide-react';

const API = "https://desideri-backend.onrender.com/api";

const getOptimizedUrl = (url) => {
  if (!url) return "";
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=300&auto=format&fit=crop`;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&q=80&output=webp`;
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

// --- FIX CRITICO: Componente Giorno definito FUORI e MEMORIZZATO ---
// Questo impedisce il re-rendering infinito e l'errore "Illegal constructor"
const AnimatedDayContent = ({ date }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative z-10">
        {/* Usiamo un div semplice o motion leggero senza props complesse */}
        <motion.span
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 300 }}
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
      toast.success('Coupon applicato!');
    } catch (error) {
      setCouponStatus('invalid');
      setCouponDiscount(null);
      toast.error('Coupon non valido');
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
      toast.error('Compila tutti i campi obbligatori');
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

  // --- MEMOIZZAZIONE DELLE PROPS DEL CALENDARIO ---
  // Questo è fondamentale per evitare che React ricrei l'oggetto components ad ogni render
  const calendarComponents = useMemo(() => ({
    DayContent: AnimatedDayContent
  }), []);

  if (loading) {
      return (
        <div className="min-h-screen pt-20 flex items-center justify-center bg-puglia-sand">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adriatic-blue" />
        </div>
      );
  }

  return (
    <div data-testid="booking-page" className="min-h-screen bg-stone-50 pt-20 pb-32 lg:pb-0">
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">Desideri di Puglia</p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">{t('booking.title')}</h1>
            <p className="text-white/80 mt-4 font-light max-w-2xl mx-auto">{t('booking.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-8 space-y-10">
              <form onSubmit={handleSubmit} id="booking-form" className="space-y-10">
                
                {/* 1. SELEZIONE STANZA */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">1</span>
                    {language === 'it' ? 'Seleziona la stanza' : 'Select Room'}
                  </h2>
                  <div className="flex flex-col gap-6">
                    {rooms.map((room) => {
                      const roomName = language === 'it' ? room.name_it : room.name_en;
                      const isSelected = selectedRoom === room.id;
                      const thumbUrl = getOptimizedUrl(room.images?.[0]?.url || '');
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoom(room.id)}
                          className={`group flex items-center gap-6 p-5 text-left transition-all duration-300 rounded-2xl border relative overflow-hidden ${
                            isSelected ? 'border-2 border-orange-400 bg-orange-50/50 shadow-md scale-[1.01]' : 'border border-stone-200 hover:border-adriatic-blue/30 hover:shadow-lg bg-white'
                          }`}
                        >
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-stone-200 shadow-inner">
                             {thumbUrl && <img src={thumbUrl} alt={roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />}
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <h3 className={`font-heading text-xl md:text-2xl truncate mb-2 ${isSelected ? 'text-adriatic-blue' : 'text-stone-700'}`}>{roomName}</h3>
                            <p className="text-stone-500 text-sm md:text-base flex items-center gap-2 font-light">
                                <span className={`inline-block w-2 h-2 rounded-full ${isSelected ? 'bg-orange-500' : 'bg-stone-300'}`}></span>
                                Max {room.max_guests} {t('booking.guests')}
                            </p>
                          </div>
                          {isSelected && (
                              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white" />
                              </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CALENDARIO FIXATO E OTTIMIZZATO */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-sm font-bold">2</span>
                    {t('booking.selectDates')}
                  </h2>
                  <div className="flex justify-center w-full">
                    <div className="relative p-2 md:p-4 max-w-lg w-full">
                        <div className="relative bg-white/80 backdrop-blur-xl p-4 md:p-8 rounded-[2rem] border border-white shadow-xl">
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={1}
                                pagedNavigation
                                locale={locale}
                                disabled={isDateUnavailable}
                                className="p-0 pointer-events-auto"
                                components={calendarComponents} // USA L'OGGETTO MEMORIZZATO
                                classNames={{
                                    month: "space-y-6 w-full",
                                    caption: "flex justify-between items-center px-4 mb-6",
                                    caption_label: "text-2xl font-heading text-adriatic-blue font-bold capitalize tracking-tight",
                                    nav: "flex items-center gap-2",
                                    nav_button: "h-9 w-9 bg-stone-100 hover:bg-orange-100 hover:text-orange-600 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                                    table: "w-full border-collapse",
                                    head_row: "flex w-full justify-between mb-4 px-2",
                                    head_cell: "text-stone-400 w-10 text-xs uppercase tracking-widest font-bold",
                                    row: "flex w-full mt-2 justify-between",
                                    cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                    day: "h-10 w-10 p-0 font-medium text-stone-600 hover:bg-stone-100 rounded-full transition-all duration-300",
                                    day_selected: "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110 font-bold",
                                    day_today: "bg-teal-50 text-teal-700 border border-teal-200 font-bold",
                                    day_outside: "text-stone-300 opacity-50",
                                    day_disabled: "text-stone-200 line-through opacity-40",
                                    day_range_middle: "bg-orange-100 text-orange-700 rounded-none scale-100 !rounded-none mx-0 w-full",
                                    day_range_start: "rounded-l-full rounded-r-none",
                                    day_range_end: "rounded-r-full rounded-l-none",
                                    day_hidden: "invisible",
                                }}
                            />
                        </div>
                    </div>
                  </div>
                </div>

                {/* 3. DETTAGLI OSPITE */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
                   <h2 className="font-heading text-2xl text-adriatic-blue mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">3</span>
                    {language === 'it' ? 'I tuoi dati' : 'Your Details'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="guest_name">{t('booking.name')} *</Label>
                      <Input id="guest_name" name="guest_name" value={formData.guest_name} onChange={handleInputChange} required className="h-12 rounded-xl border-stone-200 focus:border-orange-400 bg-stone-50/50" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="guest_email">{t('booking.email')} *</Label>
                      <Input id="guest_email" name="guest_email" type="email" value={formData.guest_email} onChange={handleInputChange} required className="h-12 rounded-xl border-stone-200 focus:border-orange-400 bg-stone-50/50" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="guest_phone">{t('booking.phone')} *</Label>
                      <Input id="guest_phone" name="guest_phone" type="tel" value={formData.guest_phone} onChange={handleInputChange} required placeholder="+39 ..." className="h-12 rounded-xl border-stone-200 focus:border-orange-400 bg-stone-50/50" />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="num_guests">{t('booking.guests')}</Label>
                      <Select value={String(formData.num_guests)} onValueChange={(value) => setFormData(prev => ({ ...prev, num_guests: parseInt(value) }))}>
                        <SelectTrigger className="h-12 rounded-xl border-stone-200 focus:border-orange-400 bg-stone-50/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map(num => (<SelectItem key={num} value={String(num)}>{num}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* 4. UPSELLS */}
                {nights > 0 && availableUpsells.length > 0 && (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
                    <h2 className="font-heading text-2xl text-adriatic-blue mb-2">{language === 'it' ? 'Tocchi Speciali' : 'Special Touches'}</h2>
                    <p className="text-stone-500 text-sm mb-8 font-light">{language === 'it' ? 'Personalizza il tuo arrivo.' : 'Customize your arrival.'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableUpsells.map((upsell) => {
                        const IconComponent = UPSELL_ICONS[upsell.icon] || Gift;
                        const isSelected = selectedUpsells.includes(upsell.id);
                        return (
                          <button key={upsell.id} type="button" onClick={() => toggleUpsell(upsell.id)} className={`p-5 flex items-start gap-4 text-left transition-all duration-300 rounded-2xl border relative group ${isSelected ? 'border-orange-400 bg-orange-50/50 shadow-sm ring-1 ring-orange-400' : 'border-stone-200 hover:border-adriatic-blue/40 hover:bg-stone-50'}`}>
                            <div className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${isSelected ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 group-hover:text-adriatic-blue'}`}><IconComponent className="w-6 h-6" /></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start"><h3 className={`font-medium text-base ${isSelected ? 'text-adriatic-blue' : 'text-gray-700'}`}>{language === 'it' ? upsell.title_it : upsell.title_en}</h3><span className="text-orange-500 font-bold text-sm whitespace-nowrap ml-2">+ €{upsell.price}</span></div>
                                <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2">{language === 'it' ? upsell.description_it : upsell.description_en}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* RIGHT COLUMN: RIEPILOGO */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl sticky top-24">
                <h2 className="font-heading text-2xl text-adriatic-blue mb-6 border-b border-stone-100 pb-4">{language === 'it' ? 'Il tuo viaggio' : 'Your Trip'}</h2>
                {selectedRoomData ? (
                    <div className="space-y-4 pb-6 border-b border-stone-100">
                        <div className="flex justify-between items-start"><span className="text-stone-500 text-sm font-medium uppercase tracking-wide">{language === 'it' ? 'Stanza' : 'Room'}</span><span className="text-adriatic-blue font-bold text-right pl-4 text-base">{language === 'it' ? selectedRoomData.name_it : selectedRoomData.name_en}</span></div>
                        {dateRange.from && dateRange.to && (
                            <div className="bg-stone-50 p-3 rounded-lg flex justify-between items-center text-sm">
                                <div className="text-center"><span className="block text-xs text-stone-400 uppercase">Check-in</span><span className="font-bold text-stone-700">{format(dateRange.from, 'dd MMM')}</span></div>
                                <ArrowRight className="w-4 h-4 text-stone-300" />
                                <div className="text-center"><span className="block text-xs text-stone-400 uppercase">Check-out</span><span className="font-bold text-stone-700">{format(dateRange.to, 'dd MMM')}</span></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-stone-400 italic text-sm mb-6 bg-stone-50 p-4 rounded-xl text-center">Seleziona una stanza.</p>
                )}
                {selectedRoomData && nights > 0 && (
                    <div className="pt-6 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-stone-500">{nights} {t('booking.nights')} x €{(roomPrice / nights).toFixed(0)}</span><span className="text-adriatic-blue font-medium">€{roomPrice.toFixed(2)}</span></div>
                        {selectedUpsells.length > 0 && (<div className="py-3 space-y-2 border-t border-dashed border-stone-200 mt-2">{selectedUpsells.map(upsellId => { const u = upsells.find(x => x.id === upsellId); return u ? <div key={u.id} className="flex justify-between text-sm text-stone-600"><span>{language === 'it' ? u.title_it : u.title_en}</span><span>+€{u.price}</span></div> : null; })}</div>)}
                        {discountAmount > 0 && <div className="flex justify-between text-sm text-green-700"><span>Sconto</span><span>-€{discountAmount.toFixed(2)}</span></div>}
                        <div className="flex justify-between items-end pt-6 border-t-2 border-stone-100 mt-6"><span className="font-heading text-adriatic-blue text-xl">{t('booking.total')}</span><span className="font-heading text-orange-500 text-4xl leading-none">€{totalPrice.toFixed(2)}</span></div>
                    </div>
                )}
                <Button type="submit" form="booking-form" disabled={submitting || !selectedRoom || !dateRange.from || !dateRange.to} className="w-full mt-8 bg-adriatic-blue text-white hover:bg-orange-500 py-6 text-sm uppercase tracking-widest disabled:opacity-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl font-bold">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('booking.proceed')} <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
                <div className="mt-6 flex items-center justify-center gap-2 text-stone-400 opacity-60"><Lock size={14} /><span className="text-[10px] uppercase tracking-widest">{language === 'it' ? 'Pagamento sicuro SSL' : 'SSL Secure Payment'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE STICKY BAR */}
      <AnimatePresence>
        {selectedRoom && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-2xl z-50 lg:hidden flex items-center justify-between gap-4">
                <div className="flex flex-col"><span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{nights > 0 ? `Totale (${nights} notti)` : 'Stima'}</span><span className="font-heading text-2xl text-adriatic-blue leading-none mt-1">€{totalPrice > 0 ? totalPrice.toFixed(0) : (selectedRoomData?.price_per_night || 0)}</span></div>
                <Button onClick={(e) => { if (!dateRange.from || !dateRange.to) { document.getElementById('booking-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info(language === 'it' ? 'Seleziona le date' : 'Select dates'); } else { handleSubmit(e); } }} disabled={submitting} className="bg-adriatic-blue text-white hover:bg-orange-500 px-6 h-12 rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg">
                  {submitting ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">{t('booking.proceed')} <ArrowRight className="w-4 h-4" /></span>}
                </Button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPage;