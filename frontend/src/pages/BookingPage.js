import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // Aggiunto AnimatePresence
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
import { ArrowRight, Loader2, Wine, Grape, Anchor, ShoppingBasket, Sparkles, Coffee, Gift, Check, Phone, X } from 'lucide-react';

// INDIRIZZO BACKEND
const API = "https://desideri-backend.onrender.com/api";

// Helper per immagini (lo stesso usato altrove)
const getOptimizedUrl = (url) => {
  if (!url) return "";
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=200&auto=format&fit=crop`; // Low res per thumbnail
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&q=80&output=webp`;
};

// Icon mapping for upsells
const UPSELL_ICONS = {
  wine: Wine,
  grape: Grape,
  anchor: Anchor,
  'shopping-basket': ShoppingBasket,
  sparkles: Sparkles,
  coffee: Coffee,
  gift: Gift
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
  
  // Upsells state
  const [upsells, setUpsells] = useState([]);
  const [selectedUpsells, setSelectedUpsells] = useState([]);
  
  // Stay reasons
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

  // Fetch rooms and stay reasons
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log(`Fetching data from: ${API}`);
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
        console.error('Error fetching initial data:', error);
        toast.error("Errore di connessione al server");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [preselectedRoom]);

  // Fetch availability when room is selected
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
        console.error('Error fetching availability:', error);
      }
    };
    fetchAvailability();
    // Reset selected upsells when room changes
    setSelectedUpsells([]);
  }, [selectedRoom]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const nights = dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  
  // Calculate room price with dynamic pricing
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
  
  // Calculate upsells total
  const upsellsTotal = selectedUpsells.reduce((sum, upsellId) => {
    const upsell = upsells.find(u => u.id === upsellId);
    return sum + (upsell?.price || 0);
  }, 0);
  
  const subtotal = roomPrice + upsellsTotal;
  
  // Calculate discount (only on room price, not upsells)
  let discountAmount = 0;
  if (couponDiscount && couponStatus === 'valid') {
    if (couponDiscount.discount_type === 'percentage') {
      discountAmount = roomPrice * (couponDiscount.discount_value / 100);
    } else {
      discountAmount = Math.min(couponDiscount.discount_value, roomPrice);
    }
  }
  const totalPrice = subtotal - discountAmount;
  
  // Filter upsells based on min_nights
  const availableUpsells = upsells.filter(upsell => upsell.min_nights <= nights);
  
  const toggleUpsell = (upsellId) => {
    setSelectedUpsells(prev => 
      prev.includes(upsellId) 
        ? prev.filter(id => id !== upsellId)
        : [...prev, upsellId]
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset coupon status when code changes
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
      toast.error(error.response?.data?.detail || (language === 'it' ? 'Coupon non valido' : 'Invalid coupon'));
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
      toast.error(language === 'it' ? 'Compila tutti i campi obbligatori (incluso il telefono)' : 'Please fill all required fields (including phone)');
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
      console.error('Booking error:', error);
      toast.error(error.response?.data?.detail || t('common.error'));
      setSubmitting(false);
    }
  };

  const locale = language === 'it' ? it : enUS;

  if (loading) {
      return (
        <div className="min-h-screen pt-20 flex items-center justify-center bg-puglia-sand">
          <div className="spinner" />
        </div>
      );
  }

  return (
    <div data-testid="booking-page" className="min-h-screen bg-stone-50 pt-20 pb-32 lg:pb-0"> {/* Aggiunto padding bottom per mobile bar */}
      
      {/* Header */}
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              Desideri di Puglia
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">
              {t('booking.title')}
            </h1>
            <p className="text-white/80 mt-4 font-light max-w-2xl mx-auto">{t('booking.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* LEFT COLUMN: Form */}
            <div className="lg:col-span-8 space-y-8">
              <form onSubmit={handleSubmit} id="booking-form" className="space-y-8">
                
                {/* 1. Room Selection - VISUAL IMPROVED */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-6 md:p-8 rounded-2xl border border-stone-100 shadow-sm"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold text-sm font-bold">1</span>
                    {language === 'it' ? 'Seleziona la stanza' : 'Select Room'}
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {rooms.map((room) => {
                      const roomName = language === 'it' ? room.name_it : room.name_en;
                      const isSelected = selectedRoom === room.id;
                      const thumbUrl = getOptimizedUrl(room.images?.[0]?.url || '');

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoom(room.id)}
                          className={`group flex items-center gap-4 p-3 pr-6 text-left transition-all duration-300 rounded-xl border relative overflow-hidden ${
                            isSelected 
                              ? 'border-antique-gold bg-antique-gold/5 shadow-md' 
                              : 'border-stone-200 hover:border-adriatic-blue/50 hover:shadow-sm bg-white'
                          }`}
                          data-testid={`select-room-${room.id}`}
                        >
                          {/* Thumbnail Image */}
                          <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 rounded-lg overflow-hidden bg-stone-200">
                             {thumbUrl && (
                                <img src={thumbUrl} alt={roomName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                             )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`font-heading text-lg md:text-xl truncate ${isSelected ? 'text-adriatic-blue' : 'text-gray-700'}`}>
                                {roomName}
                            </h3>
                            <p className="text-stone-500 text-sm mt-1 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-antique-gold"></span>
                                Max {room.max_guests} {t('booking.guests')}
                            </p>
                          </div>

                          {/* Selection Indicator */}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-antique-gold bg-antique-gold' : 'border-stone-300'
                          }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 2. Date Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white p-6 md:p-8 rounded-2xl border border-stone-100 shadow-sm"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold text-sm font-bold">2</span>
                    {t('booking.selectDates')}
                  </h2>
                  
                  <div className="flex justify-center bg-stone-50/50 p-2 md:p-6 rounded-xl border border-stone-100">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={window.innerWidth > 768 ? 2 : 1} // Adatta mesi per mobile
                      locale={locale}
                      disabled={isDateUnavailable}
                      className="border-none bg-transparent"
                      data-testid="booking-calendar"
                    />
                  </div>
                </motion.div>

                {/* 3. Guest Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white p-6 md:p-8 rounded-2xl border border-stone-100 shadow-sm"
                >
                   <h2 className="font-heading text-2xl text-adriatic-blue mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-antique-gold/10 text-antique-gold text-sm font-bold">3</span>
                    {language === 'it' ? 'I tuoi dati' : 'Your Details'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="guest_name">{t('booking.name')} *</Label>
                      <Input
                        id="guest_name"
                        name="guest_name"
                        value={formData.guest_name}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-lg border-stone-200 focus:border-antique-gold focus:ring-antique-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_email">{t('booking.email')} *</Label>
                      <Input
                        id="guest_email"
                        name="guest_email"
                        type="email"
                        value={formData.guest_email}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-lg border-stone-200 focus:border-antique-gold focus:ring-antique-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest_phone">{t('booking.phone')} *</Label>
                      <Input
                        id="guest_phone"
                        name="guest_phone"
                        type="tel"
                        value={formData.guest_phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+39 ..."
                        className="h-12 rounded-lg border-stone-200 focus:border-antique-gold focus:ring-antique-gold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="num_guests">{t('booking.guests')}</Label>
                      <Select
                        value={String(formData.num_guests)}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, num_guests: parseInt(value) }))}
                      >
                        <SelectTrigger className="h-12 rounded-lg border-stone-200 focus:border-antique-gold focus:ring-antique-gold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedRoomData && Array.from({ length: selectedRoomData.max_guests }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                          {!selectedRoomData && [1, 2].map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="notes">{t('booking.notes')}</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="rounded-lg border-stone-200 focus:border-antique-gold focus:ring-antique-gold resize-none"
                      />
                    </div>

                    {/* Stay Reason & Coupon */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-6 border-t border-stone-100">
                        <div className="space-y-2">
                            <Label htmlFor="stay_reason" className="text-xs uppercase tracking-widest text-stone-500">
                                {language === 'it' ? 'Occasione Speciale?' : 'Special Occasion?'}
                            </Label>
                            <Select
                                value={formData.stay_reason}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, stay_reason: value }))}
                            >
                                <SelectTrigger className="h-10 rounded-lg border-stone-200 text-sm">
                                <SelectValue placeholder={language === 'it' ? 'Seleziona...' : 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                {stayReasons.map(reason => (
                                    <SelectItem key={reason.id} value={reason.id}>
                                    {language === 'it' ? reason.it : reason.en}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="coupon_code" className="text-xs uppercase tracking-widest text-stone-500">
                                {language === 'it' ? 'Hai un codice?' : 'Have a code?'}
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                id="coupon_code"
                                name="coupon_code"
                                value={formData.coupon_code}
                                onChange={handleInputChange}
                                className={`h-10 rounded-lg uppercase text-sm ${
                                    couponStatus === 'valid' ? 'border-green-500 text-green-700 bg-green-50' : 
                                    couponStatus === 'invalid' ? 'border-red-500 text-red-700 bg-red-50' : ''
                                }`}
                                />
                                <Button
                                type="button"
                                onClick={validateCoupon}
                                disabled={!formData.coupon_code || nights === 0}
                                variant="outline"
                                className="h-10 px-4 border-stone-300"
                                >
                                {language === 'it' ? 'OK' : 'OK'}
                                </Button>
                            </div>
                             {couponStatus === 'valid' && couponDiscount && (
                                <p className="text-green-600 text-xs mt-1">
                                  Sconto applicato!
                                </p>
                              )}
                        </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* 4. Upsells Section */}
                {nights > 0 && availableUpsells.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white p-6 md:p-8 rounded-2xl border border-stone-100 shadow-sm"
                  >
                    <h2 className="font-heading text-2xl text-adriatic-blue mb-2">
                      {language === 'it' ? 'Tocchi Speciali' : 'Special Touches'}
                    </h2>
                    <p className="text-stone-500 text-sm mb-6 font-light">
                      {language === 'it' 
                        ? 'Personalizza il tuo arrivo con queste esperienze.' 
                        : 'Customize your arrival with these experiences.'}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableUpsells.map((upsell) => {
                        const IconComponent = UPSELL_ICONS[upsell.icon] || Gift;
                        const isSelected = selectedUpsells.includes(upsell.id);
                        
                        return (
                          <button
                            key={upsell.id}
                            type="button"
                            onClick={() => toggleUpsell(upsell.id)}
                            className={`p-4 flex items-start gap-4 text-left transition-all duration-300 rounded-xl border relative group ${
                              isSelected 
                                ? 'border-antique-gold bg-antique-gold/5 shadow-sm ring-1 ring-antique-gold' 
                                : 'border-stone-200 hover:border-adriatic-blue/40 hover:bg-stone-50'
                            }`}
                          >
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${isSelected ? 'bg-antique-gold text-white' : 'bg-stone-100 text-stone-500 group-hover:text-adriatic-blue'}`}>
                                <IconComponent className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-medium text-sm md:text-base ${isSelected ? 'text-adriatic-blue' : 'text-gray-700'}`}>
                                        {language === 'it' ? upsell.title_it : upsell.title_en}
                                    </h3>
                                    <span className="text-antique-gold font-bold text-sm whitespace-nowrap ml-2">+ €{upsell.price}</span>
                                </div>
                                <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                    {language === 'it' ? upsell.description_it : upsell.description_en}
                                </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </form>
            </div>

            {/* RIGHT COLUMN: Summary Sticky (DESKTOP ONLY) */}
            <div className="hidden lg:block lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white p-8 rounded-2xl border border-stone-100 shadow-xl sticky top-24"
              >
                <SummaryContent 
                    language={language}
                    t={t}
                    selectedRoomData={selectedRoomData}
                    dateRange={dateRange}
                    nights={nights}
                    roomPrice={roomPrice}
                    selectedUpsells={selectedUpsells}
                    upsells={upsells}
                    subtotal={subtotal}
                    discountAmount={discountAmount}
                    couponDiscount={couponDiscount}
                    totalPrice={totalPrice}
                    submitting={submitting}
                    disabled={!selectedRoom || !dateRange.from || !dateRange.to || submitting}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MOBILE STICKY BOTTOM BAR (New!) --- */}
      <AnimatePresence>
        {selectedRoom && (
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50 lg:hidden flex items-center justify-between gap-4"
            >
                <div className="flex flex-col">
                    <span className="text-xs text-stone-500 uppercase tracking-wider">
                        {nights > 0 ? `Totale per ${nights} notti` : 'Totale stimato'}
                    </span>
                    <span className="font-heading text-2xl text-adriatic-blue">
                        €{totalPrice > 0 ? totalPrice.toFixed(2) : (selectedRoomData?.price_per_night || 0)}
                    </span>
                </div>
                
                <Button
                  onClick={(e) => {
                    // Se non ci sono le date, scrolla al calendario, altrimenti submit
                    if (!dateRange.from || !dateRange.to) {
                        document.getElementById('booking-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        toast.info(language === 'it' ? 'Seleziona le date' : 'Select dates');
                    } else {
                        handleSubmit(e);
                    }
                  }}
                  disabled={submitting}
                  className="bg-antique-gold text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest shadow-lg"
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

// Componente estratto per pulizia (usato nella colonna destra desktop)
const SummaryContent = ({ language, t, selectedRoomData, dateRange, nights, roomPrice, selectedUpsells, upsells, subtotal, discountAmount, couponDiscount, totalPrice, submitting, disabled }) => (
    <>
        <h2 className="font-heading text-2xl text-adriatic-blue mb-6 border-b border-stone-100 pb-4">
            {language === 'it' ? 'Il tuo viaggio' : 'Your Trip'}
        </h2>

        {selectedRoomData ? (
            <div className="space-y-4 pb-6 border-b border-stone-100">
            <div className="flex justify-between items-start">
                <span className="text-stone-500 text-sm">{language === 'it' ? 'Stanza' : 'Room'}</span>
                <span className="text-adriatic-blue font-bold text-right pl-4 text-sm">
                {language === 'it' ? selectedRoomData.name_it : selectedRoomData.name_en}
                </span>
            </div>
            {dateRange.from && dateRange.to && (
                <>
                <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Check-in</span>
                    <span className="text-adriatic-blue">{format(dateRange.from, 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Check-out</span>
                    <span className="text-adriatic-blue">{format(dateRange.to, 'dd MMM yyyy')}</span>
                </div>
                </>
            )}
            </div>
        ) : (
            <p className="text-stone-400 italic text-sm mb-6">Seleziona una stanza per vedere i dettagli.</p>
        )}

        {selectedRoomData && nights > 0 && (
            <div className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
                <span className="text-stone-500">
                {nights} {t('booking.nights')} x €{(roomPrice / nights).toFixed(0)}
                </span>
                <span className="text-adriatic-blue">€{roomPrice.toFixed(2)}</span>
            </div>
            
            {selectedUpsells.length > 0 && (
                <div className="py-2 space-y-2">
                {selectedUpsells.map(upsellId => {
                    const upsell = upsells.find(u => u.id === upsellId);
                    if (!upsell) return null;
                    return (
                    <div key={upsellId} className="flex justify-between text-sm text-stone-600">
                        <span className="truncate pr-2 flex items-center gap-1">
                           <Sparkles className="w-3 h-3 text-antique-gold" />
                           {language === 'it' ? upsell.title_it : upsell.title_en}
                        </span>
                        <span>+€{upsell.price.toFixed(2)}</span>
                    </div>
                    );
                })}
                </div>
            )}
            
            {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                <span>
                    {language === 'it' ? 'Sconto' : 'Discount'}
                </span>
                <span>-€{discountAmount.toFixed(2)}</span>
                </div>
            )}
            
            <div className="flex justify-between items-end pt-6 border-t border-stone-100 mt-4">
                <span className="font-heading text-adriatic-blue text-lg">{t('booking.total')}</span>
                <div className="text-right">
                    <span className="font-heading text-antique-gold text-3xl block leading-none">€{totalPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">Tasse incluse</span>
                </div>
            </div>
            </div>
        )}

        <Button
            type="submit"
            form="booking-form" // Collega il bottone esterno al form
            disabled={disabled}
            className="w-full mt-8 bg-antique-gold text-white hover:bg-adriatic-blue py-6 text-sm uppercase tracking-widest disabled:opacity-50 shadow-lg hover:shadow-xl transition-all rounded-xl font-bold"
        >
            {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
            <>
                {t('booking.proceed')}
                <ArrowRight className="w-4 h-4 ml-2" />
            </>
            )}
        </Button>

        <p className="text-xs text-stone-400 text-center mt-4 flex items-center justify-center gap-1">
            <Lock size={12} />
            {language === 'it' ? 'Pagamento sicuro' : 'Secure payment'}
        </p>
    </>
);

// Simple lock icon
const Lock = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

export default BookingPage;