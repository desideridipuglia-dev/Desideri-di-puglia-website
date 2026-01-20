import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Home, Bed, Calendar, MessageSquare, Settings, 
  ChevronRight, Edit, Check, X, Loader2, Eye, EyeOff, Mail
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editPrice, setEditPrice] = useState('');

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
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (roomId) => {
    try {
      await axios.put(`${API}/rooms/${roomId}`, {
        price_per_night: parseFloat(editPrice)
      });
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

  const tabs = [
    { id: 'rooms', label: 'Stanze', icon: Bed },
    { id: 'bookings', label: 'Prenotazioni', icon: Calendar },
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
          <h2 className="font-heading text-xl text-white mb-8">Admin Panel</h2>
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
          <div className="flex justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-2 px-4 ${
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Stanze</h1>
                  <div className="space-y-6">
                    {rooms.map((room) => (
                      <div 
                        key={room.id}
                        className="bg-white p-6 border border-puglia-stone/50"
                        data-testid={`admin-room-${room.id}`}
                      >
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
                                data-testid={`edit-price-${room.id}`}
                              />
                              <span className="text-muted-foreground">€/notte</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleUpdatePrice(room.id)}
                                className="text-green-600"
                              >
                                <Check className="w-5 h-5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingRoom(null)}
                                className="text-red-600"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <span className="font-heading text-2xl text-antique-gold">
                                €{room.price_per_night}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRoom(room.id);
                                  setEditPrice(room.price_per_night);
                                }}
                                data-testid={`edit-room-${room.id}`}
                              >
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

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
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
                            <tr key={booking.id} data-testid={`booking-row-${booking.id}`}>
                              <td>
                                <div>
                                  <p className="font-medium">{booking.guest_name}</p>
                                  <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                                </div>
                              </td>
                              <td>{booking.room_id}</td>
                              <td>{booking.check_in}</td>
                              <td>{booking.check_out}</td>
                              <td className="font-medium">€{booking.total_price}</td>
                              <td>
                                <span className={`status-badge ${statusColors[booking.status]}`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td>
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
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Recensioni</h1>
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground">Nessuna recensione</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div 
                          key={review.id}
                          className="bg-white p-6 border border-puglia-stone/50"
                          data-testid={`review-admin-${review.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-adriatic-blue">{review.guest_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Rating: {'⭐'.repeat(review.rating)}
                              </p>
                              <p className="mt-2 text-muted-foreground">
                                {review.comment_it || review.comment_en}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {review.is_approved ? (
                                <span className="text-green-600 text-sm flex items-center gap-1">
                                  <Eye className="w-4 h-4" /> Approvata
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveReview(review.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Messaggi</h1>
                  {messages.length === 0 ? (
                    <p className="text-muted-foreground">Nessun messaggio</p>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className="bg-white p-6 border border-puglia-stone/50"
                          data-testid={`message-${message.id}`}
                        >
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
