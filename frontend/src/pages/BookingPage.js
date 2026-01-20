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
import { format, differenceInDays, addDays, isBefore, isAfter, isSameDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { CalendarIcon, Users, ArrowRight, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingPage = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedRoom = searchParams.get('room');

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(preselectedRoom || '');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    num_guests: 1,
    notes: '',
    coupon_code: ''
  });
  
  const [couponStatus, setCouponStatus] = useState(null); // null, 'valid', 'invalid'
  const [couponDiscount, setCouponDiscount] = useState(null);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API}/rooms`);
        setRooms(response.data);
        if (preselectedRoom && response.data.find(r => r.id === preselectedRoom)) {
          setSelectedRoom(preselectedRoom);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
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
      } catch (error) {
        console.error('Error fetching availability:', error);
      }
    };
    fetchAvailability();
  }, [selectedRoom]);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const nights = dateRange.from && dateRange.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const subtotal = selectedRoomData ? nights * selectedRoomData.price_per_night : 0;
  
  // Calculate discount
  let discountAmount = 0;
  if (couponDiscount && couponStatus === 'valid') {
    if (couponDiscount.discount_type === 'percentage') {
      discountAmount = subtotal * (couponDiscount.discount_value / 100);
    } else {
      discountAmount = Math.min(couponDiscount.discount_value, subtotal);
    }
  }
  const totalPrice = subtotal - discountAmount;

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
        coupon_code: couponStatus === 'valid' ? formData.coupon_code : null
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
                  </div>
                </motion.div>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        €{selectedRoomData.price_per_night} x {nights} {t('booking.nights')}
                      </span>
                      <span className="text-adriatic-blue">€{totalPrice}</span>
                    </div>
                    <div className="flex justify-between text-lg pt-4 border-t border-puglia-stone/30">
                      <span className="font-heading text-adriatic-blue">{t('booking.total')}</span>
                      <span className="font-heading text-antique-gold text-2xl">€{totalPrice}</span>
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
