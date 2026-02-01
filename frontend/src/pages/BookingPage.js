import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { Calendar } from '../components/ui/calendar'; // Assicurati che questo import sia corretto
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, isBefore, isSameDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { ArrowRight, Loader2, Wine, Grape, Anchor, ShoppingBasket, Sparkles, Coffee, Gift, Check, ChevronLeft, ChevronRight } from 'lucide-react';

// INDIRIZZO BACKEND
const API = "https://desideri-backend.onrender.com/api";

const getOptimizedUrl = (url) => {
  if (!url) return "";
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=300&auto=format&fit=crop`;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&q=80&output=webp`;
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
      prev.includes(upsellId) 
        ? prev.filter(id => id !== upsellId)
        : [...prev, upsellId]
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
    <div data-testid="booking-page" className="min-h-screen bg-stone-50 pt-20 pb-32 lg:pb-0">
      
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
            <div className="lg:col-span-8 space-y-10">
              <form onSubmit={handleSubmit} id="booking-form" className="space-y-10">
                
                {/* 1. Room Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm"
                >
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
                            isSelected 
                              ? 'border-2 border-orange-400 bg-orange-50/50 shadow-md scale-[1.01]' 
                              : 'border border-stone-200 hover:border-adriatic-blue/30 hover:shadow-lg bg-white'
                          }`}
                        >
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-stone-200 shadow-inner">
                             {thumbUrl && (
                                <img src={thumbUrl} alt={roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                             )}
                          </div>

                          <div className="flex-1 min-w-0 py-1">
                            <h3 className={`font-heading text-xl md:text-2xl truncate mb-2 ${isSelected ? 'text-adriatic-blue' : 'text-stone-700'}`}>
                                {roomName}
                            </h3>
                            <p className="text-stone-500 text-sm md:text-base flex items-center gap-2 font-light">
                                <span className={`inline-block w-2 h-2 rounded-full ${isSelected ? 'bg-orange-500' : 'bg-stone-300'}`}></span>
                                Max {room.max_guests} {t('booking.guests')}
                            </p>
                          </div>

                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              isSelected ? 'border-orange-500 bg-orange-500 scale-110' : 'border-stone-300 group-hover:border-adriatic-blue'
                          }`}>
                              {isSelected && <Check className="w-5 h-5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 2. Date Selection - COLORFUL & PLAYFUL CALENDAR */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-sm font-bold">2</span>
                    {t('booking.selectDates')}
                  </h2>
                  
                  {/* Container Calendario Design Pop */}
                  <div className="flex justify-center w-full">
                    {/* Sfondo decorativo "blob" */}
                    <div className="relative p-2 md:p-4 max-w-lg w-full">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>

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
                                classNames={{
                                    month: "space-y-6 w-full",
                                    caption: "flex justify-between items-center px-4 mb-6",
                                    caption_label: "text-2xl font-heading text-adriatic-blue font-bold capitalize tracking-tight",
                                    nav: "flex items-center gap-2",
                                    nav_button: "h-9 w-9 bg-stone-100 hover:bg-orange-100 hover:text-orange-600 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                                    nav_button_previous: "",
                                    nav_button_next: "",
                                    table: "w-full border-collapse",
                                    head_row: "flex w-full justify-between mb-4 px-2",
                                    head_cell: "text-stone-400 w-10 text-xs uppercase tracking-widest font-bold",
                                    row: "flex w-full mt-2 justify-between",
                                    cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                    
                                    // Stili delle celle base
                                    day: "h-10 w-10 p-0 font-medium text-stone-600 hover:bg-stone-100 rounded-full transition-all duration-300",
                                    
                                    // Stati specifici
                                    day_selected: "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110 font-bold", // Selezione principale (inizio/fine)
                                    day_today: "bg-teal-50 text-teal-700 border border-teal-200 font-bold", // Oggi
                                    day_outside: "text-stone-300 opacity-50",
                                    day_disabled: "text-stone-200 line-through opacity-40",
                                    day_range_middle: "bg-orange-100 text-orange-700 rounded-none scale-100 !rounded-none mx-0 w-full", // Il range in mezzo
                                    day_range_start: "rounded-l-full rounded-r-none", // Arrotonda sinistra
                                    day_range_end: "rounded-r-full rounded-l-none",   // Arrotonda destra
                                    day_hidden: "invisible",
                                }}
                                
                                // Animazione personalizzata per i giorni
                                components={{
                                    DayContent: ({ date, ...props }) => (
                                        <motion.div
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="w-full h-full flex items-center justify-center"
                                        >
                                            {date.getDate()}
                                        </motion.div>
                                    )
                                }}
                            />
                        </div>
                    </div>
                  </div>
                </motion.div>

                {/* 3. Guest Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm"
                >
                   <h2 className="font-heading text-2xl text-adriatic-blue mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">3</span>
                    {language === 'it' ? 'I tuoi dati' : 'Your Details'}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="guest_name" className="text-stone-600 font-medium">{t('booking.name')} *</Label>
                      <Input
                        id="guest_name"
                        name="guest_name"
                        value={formData.guest_name}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl border-stone-200 focus:border-orange-400 focus:ring-orange-400 bg-stone-50/50"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="guest_email" className="text-stone-600 font-medium">{t('booking.email')} *</Label>
                      <Input
                        id="guest_email"
                        name="guest_email"
                        type="email"
                        value={formData.guest_email}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl border-stone-200 focus:border-orange-400 focus:ring-orange-400 bg-stone-50/50"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="guest_phone" className="text-stone-600 font-medium">{t('booking.phone')} *</Label>
                      <Input
                        id="guest_phone"
                        name="guest_phone"
                        type="tel"
                        value={formData.guest_phone}
                        onChange={handleInputChange}
                        required
                        placeholder="+39 ..."
                        className="h-12 rounded-xl border-stone-200 focus:border-orange-400 focus:ring-orange-400 bg-stone-50/50"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="num_guests" className="text-stone-600 font-medium">{t('booking.guests')}</Label>
                      <Select
                        value={String(formData.num_guests)}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, num_guests: parseInt(value) }))}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-stone-200 focus:border-orange-400 focus:ring-orange-400 bg-stone-50/50">
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
                    
                    <div className="md:col-span-2 space-y-3">
                      <Label htmlFor="notes" className="text-stone-600 font-medium">{t('booking.notes')}</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="rounded-xl border-stone-200 focus:border-orange-400 focus:ring-orange-400 bg-stone-50/50 resize-none"
                      />
                    </div>

                    {/* Stay Reason & Coupon */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-6 border-t border-stone-100">
                        <div className="space-y-3">
                            <Label htmlFor="stay_reason" className="text-xs uppercase tracking-widest text-stone-500 font-bold">
                                {language === 'it' ? 'Occasione Speciale?' : 'Special Occasion?'}
                            </Label>
                            <Select
                                value={formData.stay_reason}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, stay_reason: value }))}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-stone-200 text-sm bg-stone-50/50">
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

                        <div className="space-y-3">
                            <Label htmlFor="coupon_code" className="text-xs uppercase tracking-widest text-stone-500 font-bold">
                                {language === 'it' ? 'Hai un codice?' : 'Have a code?'}
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                id="coupon_code"
                                name="coupon_code"
                                value={formData.coupon_code}
                                onChange={handleInputChange}
                                className={`h-11 rounded-xl uppercase text-sm bg-stone-50/50 ${
                                    couponStatus === 'valid' ? 'border-green-500 text-green-700 bg-green-50' : 
                                    couponStatus === 'invalid' ? 'border-red-500 text-red-700 bg-red-50' : ''
                                }`}
                                />
                                <Button
                                type="button"
                                onClick={validateCoupon}
                                disabled={!formData.coupon_code || nights === 0}
                                variant="outline"
                                className="h-11 px-4 border-stone-300 hover:bg-stone-50 rounded-xl"
                                >
                                {language === 'it' ? 'OK' : 'OK'}
                                </Button>
                            </div>
                             {couponStatus === 'valid' && couponDiscount && (
                                <p className="text-green-600 text-xs mt-1 font-bold">
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
                    className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm"
                  >
                    <h2 className="font-heading text-2xl text-adriatic-blue mb-2">
                      {language === 'it' ? 'Tocchi Speciali' : 'Special Touches'}
                    </h2>
                    <p className="text-stone-500 text-sm mb-8 font-light">
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
                            className={`p-5 flex items-start gap-4 text-left transition-all duration-300 rounded-2xl border relative group ${
                              isSelected 
                                ? 'border-orange-400 bg-orange-50/50 shadow-sm ring-1 ring-orange-400' 
                                : 'border-stone-200 hover:border-adriatic-blue/40 hover:bg-stone-50'
                            }`}
                          >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${isSelected ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 group-hover:text-adriatic-blue'}`}>
                                <IconComponent className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-medium text-base ${isSelected ? 'text-adriatic-blue' : 'text-gray-700'}`}>
                                        {language === 'it' ? upsell.title_it : upsell.title_en}
                                    </h3>
                                    <span className="text-orange-500 font-bold text-sm whitespace-nowrap ml-2">+ €{upsell.price}</span>
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
                className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl sticky top-24"
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

      {/* --- MOBILE STICKY BOTTOM BAR --- */}
      <AnimatePresence>
        {selectedRoom && (
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-50 lg:hidden flex items-center justify-between gap-4"
            >
                <div className="flex flex-col">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                        {nights > 0 ? `Totale (${nights} notti)` : 'Stima'}
                    </span>
                    <span className="font-heading text-2xl text-adriatic-blue leading-none mt-1">
                        €{totalPrice > 0 ? totalPrice.toFixed(0) : (selectedRoomData?.price_per_night || 0)}
                    </span>
                </div>
                
                <Button
                  onClick={(e) => {
                    if (!dateRange.from || !dateRange.to) {
                        document.getElementById('booking-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        toast.info(language === 'it' ? 'Seleziona le date' : 'Select dates');
                    } else {
                        handleSubmit(e);
                    }
                  }}
                  disabled={submitting}
                  className="bg-adriatic-blue text-white hover:bg-orange-500 px-6 h-12 rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg transition-colors"
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

const SummaryContent = ({ language, t, selectedRoomData, dateRange, nights, roomPrice, selectedUpsells, upsells, subtotal, discountAmount, couponDiscount, totalPrice, submitting, disabled }) => (
    <>
        <h2 className="font-heading text-2xl text-adriatic-blue mb-6 border-b border-stone-100 pb-4">
            {language === 'it' ? 'Il tuo viaggio' : 'Your Trip'}
        </h2>

        {selectedRoomData ? (
            <div className="space-y-4 pb-6 border-b border-stone-100">
            <div className="flex justify-between items-start">
                <span className="text-stone-500 text-sm font-medium uppercase tracking-wide">{language === 'it' ? 'Stanza' : 'Room'}</span>
                <span className="text-adriatic-blue font-bold text-right pl-4 text-base">
                {language === 'it' ? selectedRoomData.name_it : selectedRoomData.name_en}
                </span>
            </div>
            {dateRange.from && dateRange.to && (
                <div className="bg-stone-50 p-3 rounded-lg flex justify-between items-center text-sm">
                    <div className="text-center">
                        <span className="block text-xs text-stone-400 uppercase">Check-in</span>
                        <span className="font-bold text-stone-700">{format(dateRange.from, 'dd MMM')}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300" />
                    <div className="text-center">
                        <span className="block text-xs text-stone-400 uppercase">Check-out</span>
                        <span className="font-bold text-stone-700">{format(dateRange.to, 'dd MMM')}</span>
                    </div>
                </div>
            )}
            </div>
        ) : (
            <p className="text-stone-400 italic text-sm mb-6 bg-stone-50 p-4 rounded-xl text-center">
                Seleziona una stanza per iniziare.
            </p>
        )}

        {selectedRoomData && nights > 0 && (
            <div className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
                <span className="text-stone-500">
                {nights} {t('booking.nights')} x €{(roomPrice / nights).toFixed(0)}
                </span>
                <span className="text-adriatic-blue font-medium">€{roomPrice.toFixed(2)}</span>
            </div>
            
            {selectedUpsells.length > 0 && (
                <div className="py-3 space-y-2 border-t border-dashed border-stone-200 mt-2">
                {selectedUpsells.map(upsellId => {
                    const upsell = upsells.find(u => u.id === upsellId);
                    if (!upsell) return null;
                    return (
                    <div key={upsellId} className="flex justify-between text-sm text-stone-600">
                        <span className="truncate pr-2 flex items-center gap-1">
                           <Sparkles className="w-3 h-3 text-orange-400" />
                           {language === 'it' ? upsell.title_it : upsell.title_en}
                        </span>
                        <span>+€{upsell.price.toFixed(2)}</span>
                    </div>
                    );
                })}
                </div>
            )}
            
            {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 mt-2">
                <span className="font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" /> {language === 'it' ? 'Sconto' : 'Discount'}
                </span>
                <span>-€{discountAmount.toFixed(2)}</span>
                </div>
            )}
            
            <div className="flex justify-between items-end pt-6 border-t-2 border-stone-100 mt-6">
                <span className="font-heading text-adriatic-blue text-xl">{t('booking.total')}</span>
                <div className="text-right">
                    <span className="font-heading text-orange-500 text-4xl block leading-none">€{totalPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">Tutto incluso</span>
                </div>
            </div>
            </div>
        )}

        <Button
            type="submit"
            form="booking-form"
            disabled={disabled}
            className="w-full mt-8 bg-adriatic-blue text-white hover:bg-orange-500 py-6 text-sm uppercase tracking-widest disabled:opacity-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl font-bold"
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

        <div className="mt-6 flex items-center justify-center gap-2 text-stone-400 opacity-60">
             <Lock size={14} />
             <span className="text-[10px] uppercase tracking-widest">{language === 'it' ? 'Pagamento sicuro SSL' : 'SSL Secure Payment'}</span>
        </div>
    </>
);

export default BookingPage;