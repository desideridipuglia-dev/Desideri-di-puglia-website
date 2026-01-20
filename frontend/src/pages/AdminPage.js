import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Bed, Calendar as CalendarIcon, MessageSquare, 
  Edit, Check, X, Loader2, Mail, Tag, Lock, Trash2, Plus
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [blockedDates, setBlockedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  
  // Block dates state
  const [selectedRoom, setSelectedRoom] = useState('nonna');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [blockReason, setBlockReason] = useState('');
  
  // Coupon state
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_nights: 1,
    max_uses: '',
    valid_until: '',
    description_it: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rooms') {
        const response = await axios.get(`${API}/rooms`);
        setRooms(response.data);
      } else if (activeTab === 'bookings') {
        const response = await axios.get(`${API}/bookings`);
        setBookings(response.data);
      } else if (activeTab === 'reviews') {
        const response = await axios.get(`${API}/reviews?approved_only=false`);
        setReviews(response.data);
      } else if (activeTab === 'messages') {
        const response = await axios.get(`${API}/contact`);
        setMessages(response.data);
      } else if (activeTab === 'dates') {
        const [roomsRes, nonnaBlocked, pozzoBlocked] = await Promise.all([
          axios.get(`${API}/rooms`),
          axios.get(`${API}/blocked-dates/nonna`),
          axios.get(`${API}/blocked-dates/pozzo`)
        ]);
        setRooms(roomsRes.data);
        setBlockedDates({
          nonna: nonnaBlocked.data,
          pozzo: pozzoBlocked.data
        });
      } else if (activeTab === 'coupons') {
        const response = await axios.get(`${API}/coupons`);
        setCoupons(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (roomId) => {
    try {
      await axios.put(`${API}/rooms/${roomId}`, { price_per_night: parseFloat(editPrice) });
      toast.success('Prezzo aggiornato');
      setEditingRoom(null);
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`);
      toast.success('Stato aggiornato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}/approve`);
      toast.success('Recensione approvata');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'approvazione');
    }
  };

  const handleResendConfirmation = async (bookingId) => {
    try {
      await axios.post(`${API}/bookings/${bookingId}/resend-confirmation`);
      toast.success('Email di conferma reinviata');
    } catch (error) {
      toast.error('Errore nell\'invio email');
    }
  };

  const handleBlockDates = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Seleziona un intervallo di date');
      return;
    }
    
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      await axios.post(`${API}/blocked-dates/range?room_id=${selectedRoom}&start_date=${startDate}&end_date=${endDate}&reason=${encodeURIComponent(blockReason || 'Bloccato manualmente')}`);
      toast.success('Date bloccate con successo');
      setDateRange({ from: undefined, to: undefined });
      setBlockReason('');
      fetchData();
    } catch (error) {
      toast.error('Errore nel blocco date');
    }
  };

  const handleUnblockDate = async (roomId, date) => {
    try {
      await axios.delete(`${API}/blocked-dates/${roomId}/${date}`);
      toast.success('Data sbloccata');
      fetchData();
    } catch (error) {
      toast.error('Errore nello sblocco');
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) {
      toast.error('Codice e valore sconto sono obbligatori');
      return;
    }
    
    try {
      await axios.post(`${API}/coupons`, {
        ...newCoupon,
        discount_value: parseFloat(newCoupon.discount_value),
        min_nights: parseInt(newCoupon.min_nights) || 1,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        valid_until: newCoupon.valid_until || null
      });
      toast.success('Coupon creato con successo');
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_nights: 1,
        max_uses: '',
        valid_until: '',
        description_it: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const handleToggleCoupon = async (couponId, isActive) => {
    try {
      await axios.put(`${API}/coupons/${couponId}?is_active=${!isActive}`);
      toast.success(isActive ? 'Coupon disattivato' : 'Coupon attivato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo coupon?')) return;
    
    try {
      await axios.delete(`${API}/coupons/${couponId}`);
      toast.success('Coupon eliminato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const tabs = [
    { id: 'rooms', label: 'Stanze', icon: Bed },
    { id: 'dates', label: 'Blocca Date', icon: Lock },
    { id: 'bookings', label: 'Prenotazioni', icon: CalendarIcon },
    { id: 'coupons', label: 'Coupon', icon: Tag },
    { id: 'reviews', label: 'Recensioni', icon: MessageSquare },
    { id: 'messages', label: 'Messaggi', icon: MessageSquare },
  ];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  return (
    <div data-testid="admin-page" className="min-h-screen bg-puglia-sand pt-20">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-adriatic-blue min-h-[calc(100vh-80px)] p-6 hidden lg:block">
          <h2 className="font-heading text-xl text-white mb-8">Area Partner</h2>
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-antique-gold text-adriatic-blue' 
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  data-testid={`admin-tab-${tab.id}`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-puglia-stone z-40">
          <div className="flex justify-around py-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-2 px-3 min-w-fit ${
                    activeTab === tab.id ? 'text-antique-gold' : 'text-adriatic-blue/60'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-12 pb-24 lg:pb-12">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* Rooms Tab */}
              {activeTab === 'rooms' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Stanze</h1>
                  <div className="space-y-6">
                    {rooms.map((room) => (
                      <div key={room.id} className="bg-white p-6 border border-puglia-stone/50" data-testid={`admin-room-${room.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-heading text-xl text-adriatic-blue">{room.name_it}</h3>
                            <p className="text-muted-foreground text-sm">Max {room.max_guests} ospiti</p>
                          </div>
                          {editingRoom === room.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24 rounded-none"
                              />
                              <span className="text-muted-foreground">€/notte</span>
                              <Button size="icon" variant="ghost" onClick={() => handleUpdatePrice(room.id)} className="text-green-600">
                                <Check className="w-5 h-5" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingRoom(null)} className="text-red-600">
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <span className="font-heading text-2xl text-antique-gold">€{room.price_per_night}</span>
                              <Button size="icon" variant="ghost" onClick={() => { setEditingRoom(room.id); setEditPrice(room.price_per_night); }}>
                                <Edit className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Block Dates Tab */}
              {activeTab === 'dates' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Blocca Date</h1>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Block new dates */}
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Blocca nuove date</h2>
                      
                      <div className="mb-4">
                        <Label>Stanza</Label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                          <SelectTrigger className="mt-2 rounded-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nonna">Stanza della Nonna</SelectItem>
                            <SelectItem value="pozzo">Stanza del Pozzo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="mb-4">
                        <Label>Seleziona date da bloccare</Label>
                        <div className="mt-2 flex justify-center">
                          <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            locale={it}
                            numberOfMonths={1}
                            className="border border-puglia-stone"
                          />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Label>Motivo (opzionale)</Label>
                        <Input
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          placeholder="Es: Manutenzione, Uso personale..."
                          className="mt-2 rounded-none"
                        />
                      </div>
                      
                      <Button 
                        onClick={handleBlockDates}
                        className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
                        data-testid="block-dates-btn"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Blocca Date Selezionate
                      </Button>
                    </div>
                    
                    {/* List blocked dates */}
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Date bloccate</h2>
                      
                      {['nonna', 'pozzo'].map((roomId) => (
                        <div key={roomId} className="mb-6">
                          <h3 className="font-medium text-adriatic-blue mb-2">
                            {roomId === 'nonna' ? 'Stanza della Nonna' : 'Stanza del Pozzo'}
                          </h3>
                          {blockedDates[roomId]?.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {blockedDates[roomId].map((blocked) => (
                                <div key={blocked.date} className="flex items-center justify-between p-2 bg-red-50 text-sm">
                                  <div>
                                    <span className="font-medium">{blocked.date}</span>
                                    {blocked.reason && <span className="text-muted-foreground ml-2">- {blocked.reason}</span>}
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleUnblockDate(roomId, blocked.date)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">Nessuna data bloccata</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Prenotazioni</h1>
                  {bookings.length === 0 ? (
                    <p className="text-muted-foreground">Nessuna prenotazione</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Ospite</th>
                            <th>Stanza</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Totale</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>
                                <div>
                                  <p className="font-medium">{booking.guest_name}</p>
                                  <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                                  {booking.coupon_code && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 mt-1 inline-block">
                                      Coupon: {booking.coupon_code}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>{booking.room_id === 'nonna' ? 'Nonna' : 'Pozzo'}</td>
                              <td>{booking.check_in}</td>
                              <td>{booking.check_out}</td>
                              <td>
                                <span className="font-medium">€{booking.total_price}</span>
                                {booking.discount_amount > 0 && (
                                  <span className="text-xs text-green-600 block">-€{booking.discount_amount}</span>
                                )}
                              </td>
                              <td>
                                <span className={`status-badge ${statusColors[booking.status]}`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={booking.status}
                                    onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                                    className="border border-puglia-stone p-1 text-sm"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  {booking.payment_status === 'paid' && (
                                    <Button size="icon" variant="ghost" onClick={() => handleResendConfirmation(booking.id)} title="Reinvia email" className="text-adriatic-blue hover:text-antique-gold">
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Coupons Tab */}
              {activeTab === 'coupons' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Coupon</h1>
                  
                  {/* Create new coupon */}
                  <div className="bg-white p-6 border border-puglia-stone/50 mb-8">
                    <h2 className="font-heading text-xl text-adriatic-blue mb-4">Crea nuovo coupon</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Codice *</Label>
                        <Input
                          value={newCoupon.code}
                          onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                          placeholder="Es: ESTATE2025"
                          className="mt-1 rounded-none uppercase"
                          data-testid="coupon-code-input"
                        />
                      </div>
                      <div>
                        <Label>Tipo sconto</Label>
                        <Select value={newCoupon.discount_type} onValueChange={(v) => setNewCoupon({...newCoupon, discount_type: v})}>
                          <SelectTrigger className="mt-1 rounded-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentuale (%)</SelectItem>
                            <SelectItem value="fixed">Fisso (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Valore sconto *</Label>
                        <Input
                          type="number"
                          value={newCoupon.discount_value}
                          onChange={(e) => setNewCoupon({...newCoupon, discount_value: e.target.value})}
                          placeholder={newCoupon.discount_type === 'percentage' ? '10' : '20'}
                          className="mt-1 rounded-none"
                          data-testid="coupon-value-input"
                        />
                      </div>
                      <div>
                        <Label>Notti minime</Label>
                        <Input
                          type="number"
                          value={newCoupon.min_nights}
                          onChange={(e) => setNewCoupon({...newCoupon, min_nights: e.target.value})}
                          className="mt-1 rounded-none"
                        />
                      </div>
                      <div>
                        <Label>Usi massimi (vuoto = illimitato)</Label>
                        <Input
                          type="number"
                          value={newCoupon.max_uses}
                          onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value})}
                          placeholder="Illimitato"
                          className="mt-1 rounded-none"
                        />
                      </div>
                      <div>
                        <Label>Valido fino a</Label>
                        <Input
                          type="date"
                          value={newCoupon.valid_until}
                          onChange={(e) => setNewCoupon({...newCoupon, valid_until: e.target.value})}
                          className="mt-1 rounded-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Label>Descrizione</Label>
                        <Input
                          value={newCoupon.description_it}
                          onChange={(e) => setNewCoupon({...newCoupon, description_it: e.target.value})}
                          placeholder="Es: Sconto speciale per i nostri ospiti fedeli"
                          className="mt-1 rounded-none"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateCoupon}
                      className="mt-4 bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
                      data-testid="create-coupon-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crea Coupon
                    </Button>
                  </div>
                  
                  {/* List coupons */}
                  <div className="bg-white border border-puglia-stone/50">
                    <h2 className="font-heading text-xl text-adriatic-blue p-6 border-b border-puglia-stone/50">Coupon attivi</h2>
                    {coupons.length === 0 ? (
                      <p className="text-muted-foreground p-6">Nessun coupon creato</p>
                    ) : (
                      <div className="divide-y divide-puglia-stone/30">
                        {coupons.map((coupon) => (
                          <div key={coupon.id} className="p-6 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-lg font-bold text-adriatic-blue">{coupon.code}</span>
                                <span className={`text-xs px-2 py-1 ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {coupon.is_active ? 'Attivo' : 'Disattivato'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% di sconto` : `€${coupon.discount_value} di sconto`}
                                {coupon.min_nights > 1 && ` · Min ${coupon.min_nights} notti`}
                                {coupon.max_uses && ` · ${coupon.uses_count}/${coupon.max_uses} usi`}
                                {coupon.valid_until && ` · Valido fino: ${coupon.valid_until}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                                className="text-sm"
                              >
                                {coupon.is_active ? 'Disattiva' : 'Attiva'}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Recensioni</h1>
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground">Nessuna recensione</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 border border-puglia-stone/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-adriatic-blue">{review.guest_name}</p>
                              <p className="text-sm text-muted-foreground">{'⭐'.repeat(review.rating)}</p>
                              <p className="mt-2 text-muted-foreground">{review.comment_it || review.comment_en}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {review.is_approved ? (
                                <span className="text-green-600 text-sm flex items-center gap-1">✓ Approvata</span>
                              ) : (
                                <Button size="sm" onClick={() => handleApproveReview(review.id)} className="bg-green-600 hover:bg-green-700">
                                  Approva
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Messaggi</h1>
                  {messages.length === 0 ? (
                    <p className="text-muted-foreground">Nessun messaggio</p>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="bg-white p-6 border border-puglia-stone/50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium text-adriatic-blue">{message.name}</p>
                              <p className="text-sm text-muted-foreground">{message.email}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {message.created_at && format(new Date(message.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
