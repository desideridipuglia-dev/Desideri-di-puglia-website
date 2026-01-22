import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { ArrowRight, Loader2, Wine, Grape, Anchor, ShoppingBasket, Sparkles, Coffee, Gift, Check } from 'lucide-react';

// MODIFICA FONDAMENTALE: Indirizzo backend fisso
const API = "https://desideri-backend.onrender.com/api";

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

    if (!formData.guest_name || !formData.guest_email) {
      toast.error(language === 'it' ? 'Compila tutti i campi obbligatori' : 'Please fill all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const bookingData = {
        room_id: selectedRoom,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone || null,
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
      
      // Redirect to Stripe checkout
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
    <div data-testid="booking-page" className="min-h-screen bg-puglia-sand pt-20">
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
            <p className="text-white/80 mt-4">{t('booking.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Room Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-8 border border-puglia-stone/50"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                    {language === 'it' ? 'Seleziona la stanza' : 'Select Room'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.map((room) => {
                      const roomName = language === 'it' ? room.name_it : room.name_en;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoom(room.id)}
                          className={`p-6 border text-left transition-all ${
                            selectedRoom === room.id 
                              ? 'border-antique-gold bg-antique-gold/5' 
                              : 'border-puglia-stone/50 hover:border-adriatic-blue'
                          }`}
                          data-testid={`select-room-${room.id}`}
                        >
                          <h3 className="font-heading text-lg text-adriatic-blue">{roomName}</h3>
                          <p className="text-muted-foreground text-sm mt-1">Max {room.max_guests} {t('booking.guests')}</p>
                          <p className="text-antique-gold font-medium mt-2">€{room.price_per_night}{t('rooms.perNight')}</p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Date Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white p-8 border border-puglia-stone/50"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                    {t('booking.selectDates')}
                  </h2>
                  <div className="flex justify-center">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={locale}
                      disabled={isDateUnavailable}
                      className="border-none"
                      data-testid="booking-calendar"
                    />
                  </div>
                  {dateRange.from && dateRange.to && (
                    <div className="mt-6 p-4 bg-puglia-sand text-center">
                      <p className="text-adriatic-blue">
                        <span className="font-medium">{format(dateRange.from, 'PPP', { locale })}</span>
                        {' → '}
                        <span className="font-medium">{format(dateRange.to, 'PPP', { locale })}</span>
                      </p>
                      <p className="text-muted-foreground mt-1">{nights} {t('booking.nights')}</p>
                    </div>
                  )}
                </motion.div>

                {/* Guest Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white p-8 border border-puglia-stone/50"
                >
                  <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                    {language === 'it' ? 'I tuoi dati' : 'Your Details'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="guest_name">{t('booking.name')} *</Label>
                      <Input
                        id="guest_name"
                        name="guest_name"
                        value={formData.guest_name}
                        onChange={handleInputChange}
                        required
                        className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                        data-testid="guest-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest_email">{t('booking.email')} *</Label>
                      <Input
                        id="guest_email"
                        name="guest_email"
                        type="email"
                        value={formData.guest_email}
                        onChange={handleInputChange}
                        required
                        className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                        data-testid="guest-email-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest_phone">{t('booking.phone')}</Label>
                      <Input
                        id="guest_phone"
                        name="guest_phone"
                        type="tel"
                        value={formData.guest_phone}
                        onChange={handleInputChange}
                        className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                        data-testid="guest-phone-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="num_guests">{t('booking.guests')}</Label>
                      <Select
                        value={String(formData.num_guests)}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, num_guests: parseInt(value) }))}
                      >
                        <SelectTrigger className="mt-2 rounded-none border-puglia-stone" data-testid="num-guests-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="notes">{t('booking.notes')}</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={4}
                        className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                        data-testid="booking-notes"
                      />
                    </div>
                    
                    {/* Coupon Code */}
                    <div className="md:col-span-2">
                      <Label htmlFor="coupon_code">
                        {language === 'it' ? 'Codice sconto (opzionale)' : 'Discount code (optional)'}
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="coupon_code"
                          name="coupon_code"
                          value={formData.coupon_code}
                          onChange={handleInputChange}
                          placeholder={language === 'it' ? 'Inserisci codice' : 'Enter code'}
                          className={`flex-1 rounded-none border-puglia-stone focus:border-adriatic-blue uppercase ${
                            couponStatus === 'valid' ? 'border-green-500 bg-green-50' : 
                            couponStatus === 'invalid' ? 'border-red-500 bg-red-50' : ''
                          }`}
                          data-testid="coupon-input"
                        />
                        <Button
                          type="button"
                          onClick={validateCoupon}
                          disabled={!formData.coupon_code || nights === 0}
                          variant="outline"
                          className="border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
                          data-testid="apply-coupon-btn"
                        >
                          {language === 'it' ? 'Applica' : 'Apply'}
                        </Button>
                      </div>
                      {couponStatus === 'valid' && couponDiscount && (
                        <p className="text-green-600 text-sm mt-1">
                          ✓ {couponDiscount.discount_type === 'percentage' 
                            ? `${couponDiscount.discount_value}% di sconto applicato!` 
                            : `€${couponDiscount.discount_value} di sconto applicato!`}
                        </p>
                      )}
                    </div>
                    
                    {/* Stay Reason */}
                    <div className="md:col-span-2">
                      <Label htmlFor="stay_reason">
                        {language === 'it' ? 'Motivo del soggiorno (opzionale)' : 'Reason for stay (optional)'}
                      </Label>
                      <Select
                        value={formData.stay_reason}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, stay_reason: value }))}
                      >
                        <SelectTrigger className="mt-2 rounded-none border-puglia-stone" data-testid="stay-reason-select">
                          <SelectValue placeholder={language === 'it' ? 'Seleziona un motivo...' : 'Select a reason...'} />
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
                  </div>
                </motion.div>
                
                {/* Upsells Section */}
                {nights > 0 && availableUpsells.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white p-8 border border-puglia-stone/50"
                  >
                    <h2 className="font-heading text-2xl text-adriatic-blue mb-2">
                      {language === 'it' ? 'Rendi speciale il tuo soggiorno' : 'Make your stay special'}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6">
                      {language === 'it' 
                        ? 'Aggiungi esperienze esclusive al tuo soggiorno' 
                        : 'Add exclusive experiences to your stay'}
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
                            className={`p-5 border text-left transition-all relative ${
                              isSelected 
                                ? 'border-antique-gold bg-antique-gold/5 ring-1 ring-antique-gold' 
                                : 'border-puglia-stone/50 hover:border-adriatic-blue'
                            }`}
                            data-testid={`upsell-${upsell.slug}`}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-6 h-6 bg-antique-gold rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-puglia-sand flex items-center justify-center flex-shrink-0">
                                <IconComponent className="w-5 h-5 text-antique-gold" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-heading text-base text-adriatic-blue pr-8">
                                  {language === 'it' ? upsell.title_it : upsell.title_en}
                                </h3>
                                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                                  {language === 'it' ? upsell.description_it : upsell.description_en}
                                </p>
                                <p className="text-antique-gold font-medium mt-2">+€{upsell.price}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white p-8 border border-puglia-stone/50 sticky top-24"
              >
                <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                  {language === 'it' ? 'Riepilogo' : 'Summary'}
                </h2>

                {selectedRoomData && (
                  <div className="space-y-4 pb-6 border-b border-puglia-stone/30">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'it' ? 'Stanza' : 'Room'}</span>
                      <span className="text-adriatic-blue font-medium">
                        {language === 'it' ? selectedRoomData.name_it : selectedRoomData.name_en}
                      </span>
                    </div>
                    {dateRange.from && dateRange.to && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-in</span>
                          <span className="text-adriatic-blue">{format(dateRange.from, 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Check-out</span>
                          <span className="text-adriatic-blue">{format(dateRange.to, 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('booking.nights')}</span>
                          <span className="text-adriatic-blue">{nights}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedRoomData && nights > 0 && (
                  <div className="pt-6 space-y-4">
                    {/* Room price breakdown */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'it' ? 'Soggiorno' : 'Accommodation'} ({nights} {t('booking.nights')})
                      </span>
                      <span className="text-adriatic-blue">€{roomPrice.toFixed(2)}</span>
                    </div>
                    
                    {/* Show daily price breakdown if there are custom prices */}
                    {Object.keys(customPrices).length > 0 && (
                      <div className="text-xs text-muted-foreground pl-2 border-l-2 border-puglia-stone/30 space-y-1">
                        {(() => {
                          let current = new Date(dateRange.from);
                          const end = new Date(dateRange.to);
                          const prices = [];
                          while (current < end) {
                            const dateStr = format(current, 'yyyy-MM-dd');
                            const dayPrice = customPrices[dateStr] || selectedRoomData.price_per_night;
                            const isCustom = customPrices[dateStr] !== undefined;
                            prices.push(
                              <div key={dateStr} className="flex justify-between">
                                <span>{format(current, 'dd/MM', { locale })}</span>
                                <span className={isCustom ? 'text-antique-gold' : ''}>
                                  €{dayPrice}
                                  {isCustom && ' ★'}
                                </span>
                              </div>
                            );
                            current = addDays(current, 1);
                          }
                          return prices.length <= 7 ? prices : (
                            <span className="italic">{language === 'it' ? 'Prezzi variabili per data' : 'Variable daily prices'}</span>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Upsells */}
                    {selectedUpsells.length > 0 && (
                      <>
                        <div className="border-t border-puglia-stone/30 pt-4">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {language === 'it' ? 'Extra selezionati' : 'Selected extras'}
                          </span>
                        </div>
                        {selectedUpsells.map(upsellId => {
                          const upsell = upsells.find(u => u.id === upsellId);
                          if (!upsell) return null;
                          return (
                            <div key={upsellId} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {language === 'it' ? upsell.title_it : upsell.title_en}
                              </span>
                              <span className="text-adriatic-blue">+€{upsell.price.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Subtotal if there are upsells */}
                    {selectedUpsells.length > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t border-puglia-stone/30">
                        <span className="text-muted-foreground">{language === 'it' ? 'Subtotale' : 'Subtotal'}</span>
                        <span className="text-adriatic-blue">€{subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Show discount if applied */}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          {language === 'it' ? 'Sconto coupon' : 'Coupon discount'}
                          {couponDiscount?.discount_type === 'percentage' && ` (${couponDiscount.discount_value}%)`}
                        </span>
                        <span>-€{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg pt-4 border-t border-puglia-stone/30">
                      <span className="font-heading text-adriatic-blue">{t('booking.total')}</span>
                      <span className="font-heading text-antique-gold text-2xl">€{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!selectedRoom || !dateRange.from || !dateRange.to || submitting}
                  className="w-full mt-8 bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white py-6 text-sm uppercase tracking-widest disabled:opacity-50"
                  data-testid="submit-booking"
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

                <p className="text-xs text-muted-foreground text-center mt-4">
                  {language === 'it' 
                    ? 'Pagamento sicuro con Stripe' 
                    : 'Secure payment with Stripe'}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingPage;