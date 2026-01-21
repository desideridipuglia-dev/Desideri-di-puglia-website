import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Bed, Calendar as CalendarIcon, MessageSquare, 
  Edit, Check, X, Mail, Tag, Lock, Trash2, Plus,
  BarChart3, Image, LogOut, TrendingUp, Euro,
  ArrowUp, ArrowDown, Home, Coffee, Gift, DollarSign
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Login Component
const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { username, password });
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        onLogin(response.data.token);
        toast.success('Accesso effettuato');
      }
    } catch (error) {
      toast.error('Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-puglia-sand flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 border border-puglia-stone/50 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Lock className="w-12 h-12 text-antique-gold mx-auto mb-4" />
          <h1 className="font-heading text-2xl text-adriatic-blue">Area Partner</h1>
          <p className="text-muted-foreground text-sm mt-2">Accedi per gestire il tuo B&B</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 rounded-none"
              required
              data-testid="admin-username"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded-none"
              required
              data-testid="admin-password"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
            data-testid="admin-login-btn"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

// Main Admin Page
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [blockedDates, setBlockedDates] = useState({});
  const [siteImages, setSiteImages] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [topStats, setTopStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Upsells state
  const [upsells, setUpsells] = useState([]);
  const [newUpsell, setNewUpsell] = useState({
    slug: '', title_it: '', title_en: '', description_it: '', description_en: '',
    price: '', min_nights: 0, icon: 'gift'
  });
  const [editingUpsell, setEditingUpsell] = useState(null);
  
  // Custom prices state
  const [customPrices, setCustomPrices] = useState({});
  const [priceRange, setPriceRange] = useState({ from: undefined, to: undefined });
  const [customPrice, setCustomPrice] = useState('');
  const [priceReason, setPriceReason] = useState('');
  
  // Analytics filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateFilter, setDateFilter] = useState('year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Edit states
  const [editingRoom, setEditingRoom] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('nonna');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [blockReason, setBlockReason] = useState('');
  const [editingImages, setEditingImages] = useState({});
  
  // Coupon state
  const [newCoupon, setNewCoupon] = useState({
    code: '', discount_type: 'percentage', discount_value: '',
    min_nights: 1, max_uses: '', valid_until: '', description_it: ''
  });

  // Check authentication on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tkn) => {
    try {
      await axios.get(`${API}/admin/verify?token=${tkn}`);
      setToken(tkn);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('adminToken');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await axios.post(`${API}/admin/logout?token=${token}`);
      } catch {}
    }
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [activeTab, isAuthenticated, selectedYear, dateFilter, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: format(start, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    } else if (dateFilter === 'year') {
      return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return { start: `${now.getFullYear()}-01-01`, end: format(now, 'yyyy-MM-dd') };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'analytics') {
        const range = getDateRange();
        const [analyticsRes, monthlyRes, statsRes] = await Promise.all([
          axios.get(`${API}/analytics/overview?start_date=${range.start}&end_date=${range.end}`),
          axios.get(`${API}/analytics/monthly?year=${selectedYear}`),
          axios.get(`${API}/analytics/top-stats`)
        ]);
        setAnalytics(analyticsRes.data);
        setMonthlyData(monthlyRes.data);
        setTopStats(statsRes.data);
      } else if (activeTab === 'rooms') {
        const response = await axios.get(`${API}/rooms`);
        setRooms(response.data);
      } else if (activeTab === 'images') {
        const [roomsRes, imagesRes] = await Promise.all([
          axios.get(`${API}/rooms`),
          axios.get(`${API}/site-images`)
        ]);
        setRooms(roomsRes.data);
        setSiteImages(imagesRes.data);
      } else if (activeTab === 'bookings') {
        const response = await axios.get(`${API}/bookings`);
        setBookings(response.data);
      } else if (activeTab === 'dates') {
        const [roomsRes, nonnaBlocked, pozzoBlocked] = await Promise.all([
          axios.get(`${API}/rooms`),
          axios.get(`${API}/blocked-dates/nonna`),
          axios.get(`${API}/blocked-dates/pozzo`)
        ]);
        setRooms(roomsRes.data);
        setBlockedDates({ nonna: nonnaBlocked.data, pozzo: pozzoBlocked.data });
      } else if (activeTab === 'coupons') {
        const response = await axios.get(`${API}/coupons`);
        setCoupons(response.data);
      } else if (activeTab === 'upsells') {
        const response = await axios.get(`${API}/upsells`);
        setUpsells(response.data);
      } else if (activeTab === 'pricing') {
        const [roomsRes, nonnaPrices, pozzoPrices] = await Promise.all([
          axios.get(`${API}/rooms`),
          axios.get(`${API}/custom-prices/nonna?start_date=${format(new Date(), 'yyyy-MM-dd')}&end_date=${format(addDays(new Date(), 365), 'yyyy-MM-dd')}`),
          axios.get(`${API}/custom-prices/pozzo?start_date=${format(new Date(), 'yyyy-MM-dd')}&end_date=${format(addDays(new Date(), 365), 'yyyy-MM-dd')}`)
        ]);
        setRooms(roomsRes.data);
        setCustomPrices({ nonna: nonnaPrices.data, pozzo: pozzoPrices.data });
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

  // Handler functions
  const handleUpdatePrice = async (roomId) => {
    try {
      await axios.put(`${API}/rooms/${roomId}`, { price_per_night: parseFloat(editPrice) });
      toast.success('Prezzo aggiornato');
      setEditingRoom(null);
      fetchData();
    } catch { toast.error('Errore nell\'aggiornamento'); }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`);
      toast.success('Stato aggiornato');
      fetchData();
    } catch { toast.error('Errore nell\'aggiornamento'); }
  };

  const handleResendConfirmation = async (bookingId) => {
    try {
      await axios.post(`${API}/bookings/${bookingId}/resend-confirmation`);
      toast.success('Email reinviata');
    } catch { toast.error('Errore nell\'invio'); }
  };

  const handleBlockDates = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Seleziona un intervallo di date');
      return;
    }
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      await axios.post(`${API}/blocked-dates/range?room_id=${selectedRoom}&start_date=${startDate}&end_date=${endDate}&reason=${encodeURIComponent(blockReason || 'Bloccato')}`);
      toast.success('Date bloccate');
      setDateRange({ from: undefined, to: undefined });
      setBlockReason('');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleUnblockDate = async (roomId, date) => {
    try {
      await axios.delete(`${API}/blocked-dates/${roomId}/${date}`);
      toast.success('Data sbloccata');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) {
      toast.error('Codice e valore obbligatori');
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
      toast.success('Coupon creato');
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_nights: 1, max_uses: '', valid_until: '', description_it: '' });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };

  const handleToggleCoupon = async (couponId, isActive) => {
    try {
      await axios.put(`${API}/coupons/${couponId}?is_active=${!isActive}`);
      toast.success(isActive ? 'Disattivato' : 'Attivato');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Eliminare questo coupon?')) return;
    try {
      await axios.delete(`${API}/coupons/${couponId}`);
      toast.success('Eliminato');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}/approve`);
      toast.success('Approvata');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleUpdateSiteImage = async (key, value) => {
    try {
      await axios.put(`${API}/site-images`, { [key]: value });
      toast.success('Immagine aggiornata');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleUpdateRoomImages = async (roomId, images) => {
    try {
      await axios.put(`${API}/rooms/${roomId}`, { images });
      toast.success('Immagini stanza aggiornate');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  // Upsell handlers
  const handleCreateUpsell = async () => {
    if (!newUpsell.slug || !newUpsell.title_it || !newUpsell.price) {
      toast.error('Compila slug, titolo e prezzo');
      return;
    }
    try {
      await axios.post(`${API}/upsells`, {
        ...newUpsell,
        price: parseFloat(newUpsell.price),
        min_nights: parseInt(newUpsell.min_nights) || 0
      });
      toast.success('Upsell creato');
      setNewUpsell({ slug: '', title_it: '', title_en: '', description_it: '', description_en: '', price: '', min_nights: 0, icon: 'gift' });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };

  const handleToggleUpsell = async (upsellId, isActive) => {
    try {
      await axios.put(`${API}/upsells/${upsellId}`, { is_active: !isActive });
      toast.success(isActive ? 'Disattivato' : 'Attivato');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleDeleteUpsell = async (upsellId) => {
    if (!window.confirm('Eliminare questo upsell?')) return;
    try {
      await axios.delete(`${API}/upsells/${upsellId}`);
      toast.success('Eliminato');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  // Custom pricing handlers
  const handleSetCustomPrices = async () => {
    if (!priceRange.from || !priceRange.to || !customPrice) {
      toast.error('Seleziona date e prezzo');
      return;
    }
    try {
      const startDate = format(priceRange.from, 'yyyy-MM-dd');
      const endDate = format(priceRange.to, 'yyyy-MM-dd');
      await axios.post(`${API}/custom-prices`, {
        room_id: selectedRoom,
        start_date: startDate,
        end_date: endDate,
        price: parseFloat(customPrice),
        reason: priceReason || null
      });
      toast.success('Prezzi personalizzati impostati');
      setPriceRange({ from: undefined, to: undefined });
      setCustomPrice('');
      setPriceReason('');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const handleDeleteCustomPrice = async (roomId, date) => {
    try {
      await axios.delete(`${API}/custom-prices/${roomId}/${date}`);
      toast.success('Prezzo rimosso');
      fetchData();
    } catch { toast.error('Errore'); }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'rooms', label: 'Stanze', icon: Bed },
    { id: 'pricing', label: 'Prezzi', icon: DollarSign },
    { id: 'upsells', label: 'Upsells', icon: Gift },
    { id: 'images', label: 'Immagini', icon: Image },
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

  if (loading && !isAuthenticated) {
    return <div className="min-h-screen bg-puglia-sand flex items-center justify-center"><div className="spinner" /></div>;
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div data-testid="admin-page" className="min-h-screen bg-puglia-sand pt-20">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-adriatic-blue min-h-[calc(100vh-80px)] p-6 hidden lg:block">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-xl text-white">Area Partner</h2>
            <button onClick={handleLogout} className="text-white/60 hover:text-white" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id ? 'bg-antique-gold text-adriatic-blue' : 'text-white/80 hover:bg-white/10'
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-puglia-stone z-40 overflow-x-auto">
          <div className="flex py-2 px-2 gap-1">
            {tabs.slice(0, 6).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-2 px-3 min-w-fit ${activeTab === tab.id ? 'text-antique-gold' : 'text-adriatic-blue/60'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 pb-24 lg:pb-12">
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="spinner" /></div>
          ) : (
            <>
              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                    <h1 className="font-heading text-3xl text-adriatic-blue">Dashboard Analytics</h1>
                    
                    {/* Date Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-40 rounded-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Questo Mese</SelectItem>
                          <SelectItem value="year">Anno</SelectItem>
                          <SelectItem value="custom">Personalizzato</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {dateFilter === 'year' && (
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                          <SelectTrigger className="w-28 rounded-none"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {dateFilter === 'custom' && (
                        <div className="flex gap-2">
                          <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-none w-36" />
                          <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-none w-36" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Stats Cards */}
                  {topStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-white p-5 border border-puglia-stone/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-100 flex items-center justify-center"><ArrowDown className="w-5 h-5 text-green-600" /></div>
                          <span className="text-sm text-muted-foreground">Check-in Oggi</span>
                        </div>
                        <p className="text-3xl font-heading text-adriatic-blue">{topStats.todays_checkins}</p>
                      </div>
                      <div className="bg-white p-5 border border-puglia-stone/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 flex items-center justify-center"><ArrowUp className="w-5 h-5 text-blue-600" /></div>
                          <span className="text-sm text-muted-foreground">Check-out Oggi</span>
                        </div>
                        <p className="text-3xl font-heading text-adriatic-blue">{topStats.todays_checkouts}</p>
                      </div>
                      <div className="bg-white p-5 border border-puglia-stone/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-yellow-100 flex items-center justify-center"><CalendarIcon className="w-5 h-5 text-yellow-600" /></div>
                          <span className="text-sm text-muted-foreground">In Attesa</span>
                        </div>
                        <p className="text-3xl font-heading text-adriatic-blue">{topStats.pending_bookings}</p>
                      </div>
                      <div className="bg-white p-5 border border-puglia-stone/50">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-antique-gold/20 flex items-center justify-center"><Euro className="w-5 h-5 text-antique-gold" /></div>
                          <span className="text-sm text-muted-foreground">Mese Corrente</span>
                        </div>
                        <p className="text-3xl font-heading text-antique-gold">€{topStats.month_revenue}</p>
                      </div>
                    </div>
                  )}

                  {/* Main Analytics */}
                  {analytics && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Fatturato Totale</h3>
                          <p className="text-4xl font-heading text-antique-gold">€{analytics.summary.total_revenue}</p>
                          {analytics.summary.total_discounts > 0 && (
                            <p className="text-sm text-green-600 mt-1">-€{analytics.summary.total_discounts} sconti</p>
                          )}
                        </div>
                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Prenotazioni</h3>
                          <p className="text-4xl font-heading text-adriatic-blue">{analytics.summary.total_bookings}</p>
                          <p className="text-sm text-muted-foreground mt-1">{analytics.summary.total_nights} notti totali</p>
                        </div>
                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Tasso Occupazione</h3>
                          <p className="text-4xl font-heading text-adriatic-blue">{analytics.summary.occupancy_rate}%</p>
                          <div className="w-full bg-puglia-stone/30 h-2 mt-3">
                            <div className="bg-antique-gold h-2" style={{width: `${Math.min(analytics.summary.occupancy_rate, 100)}%`}} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-5 border border-puglia-stone/50">
                          <h4 className="text-xs text-muted-foreground uppercase mb-1">Prezzo Medio/Notte</h4>
                          <p className="text-2xl font-heading text-adriatic-blue">€{analytics.summary.avg_price_per_night}</p>
                        </div>
                        <div className="bg-white p-5 border border-puglia-stone/50">
                          <h4 className="text-xs text-muted-foreground uppercase mb-1">Tasso Conversione</h4>
                          <p className="text-2xl font-heading text-adriatic-blue">{analytics.summary.conversion_rate}%</p>
                        </div>
                        <div className="bg-white p-5 border border-puglia-stone/50">
                          <h4 className="text-xs text-muted-foreground uppercase mb-1">Ospiti Medi</h4>
                          <p className="text-2xl font-heading text-adriatic-blue">{analytics.summary.avg_guests}</p>
                        </div>
                        <div className="bg-white p-5 border border-puglia-stone/50">
                          <h4 className="text-xs text-muted-foreground uppercase mb-1">Uso Coupon</h4>
                          <p className="text-2xl font-heading text-adriatic-blue">{analytics.summary.coupon_usage_rate}%</p>
                        </div>
                      </div>

                      {/* By Room */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="font-heading text-lg text-adriatic-blue mb-4">Per Stanza</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-puglia-sand">
                              <div className="flex items-center gap-3">
                                <Home className="w-5 h-5 text-antique-gold" />
                                <span>Stanza della Nonna</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-adriatic-blue">{analytics.by_room.bookings.nonna} prenotazioni</p>
                                <p className="text-sm text-antique-gold">€{analytics.by_room.revenue.nonna}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-puglia-sand">
                              <div className="flex items-center gap-3">
                                <Coffee className="w-5 h-5 text-antique-gold" />
                                <span>Stanza del Pozzo</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-adriatic-blue">{analytics.by_room.bookings.pozzo} prenotazioni</p>
                                <p className="text-sm text-antique-gold">€{analytics.by_room.revenue.pozzo}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="font-heading text-lg text-adriatic-blue mb-4">Per Stato</h3>
                          <div className="space-y-3">
                            {Object.entries(analytics.by_status).map(([status, count]) => (
                              <div key={status} className="flex items-center justify-between">
                                <span className={`status-badge ${statusColors[status]}`}>{status}</span>
                                <span className="font-bold text-adriatic-blue">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Monthly Chart */}
                      {monthlyData && (
                        <div className="bg-white p-6 border border-puglia-stone/50">
                          <h3 className="font-heading text-lg text-adriatic-blue mb-6">Andamento Mensile {selectedYear}</h3>
                          <div className="overflow-x-auto">
                            <div className="flex gap-2 min-w-[800px]">
                              {monthlyData.months.map((m) => (
                                <div key={m.month} className="flex-1 text-center">
                                  <div className="h-32 flex items-end justify-center mb-2">
                                    <div 
                                      className="w-8 bg-antique-gold hover:bg-adriatic-blue transition-colors" 
                                      style={{height: `${Math.max((m.revenue / Math.max(...monthlyData.months.map(x => x.revenue || 1))) * 100, 5)}%`}}
                                      title={`€${m.revenue}`}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">{m.month_name.slice(0, 3)}</p>
                                  <p className="text-xs font-bold text-adriatic-blue">€{m.revenue}</p>
                                  <p className="text-xs text-muted-foreground">{m.bookings} pren.</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Rooms Tab */}
              {activeTab === 'rooms' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Stanze</h1>
                  <div className="space-y-6">
                    {rooms.map((room) => (
                      <div key={room.id} className="bg-white p-6 border border-puglia-stone/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-heading text-xl text-adriatic-blue">{room.name_it}</h3>
                            <p className="text-muted-foreground text-sm">Max {room.max_guests} ospiti</p>
                          </div>
                          {editingRoom === room.id ? (
                            <div className="flex items-center gap-2">
                              <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-24 rounded-none" />
                              <span className="text-muted-foreground">€/notte</span>
                              <Button size="icon" variant="ghost" onClick={() => handleUpdatePrice(room.id)} className="text-green-600"><Check className="w-5 h-5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditingRoom(null)} className="text-red-600"><X className="w-5 h-5" /></Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <span className="font-heading text-2xl text-antique-gold">€{room.price_per_night}</span>
                              <Button size="icon" variant="ghost" onClick={() => { setEditingRoom(room.id); setEditPrice(room.price_per_night); }}><Edit className="w-5 h-5" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Images Tab */}
              {activeTab === 'images' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Immagini</h1>
                  
                  {/* Site Images */}
                  <div className="bg-white p-6 border border-puglia-stone/50 mb-8">
                    <h2 className="font-heading text-xl text-adriatic-blue mb-4">Immagini Sito</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Hero Background</Label>
                        <div className="mt-2 aspect-video bg-puglia-stone overflow-hidden mb-2">
                          <img src={siteImages.hero_image} alt="Hero" className="w-full h-full object-cover" />
                        </div>
                        <Input
                          value={editingImages.hero_image ?? siteImages.hero_image ?? ''}
                          onChange={(e) => setEditingImages({...editingImages, hero_image: e.target.value})}
                          placeholder="URL immagine hero"
                          className="rounded-none text-sm"
                        />
                        <Button size="sm" className="mt-2" onClick={() => handleUpdateSiteImage('hero_image', editingImages.hero_image)}>Salva</Button>
                      </div>
                      <div>
                        <Label>CTA Background</Label>
                        <div className="mt-2 aspect-video bg-puglia-stone overflow-hidden mb-2">
                          <img src={siteImages.cta_background} alt="CTA" className="w-full h-full object-cover" />
                        </div>
                        <Input
                          value={editingImages.cta_background ?? siteImages.cta_background ?? ''}
                          onChange={(e) => setEditingImages({...editingImages, cta_background: e.target.value})}
                          placeholder="URL immagine CTA"
                          className="rounded-none text-sm"
                        />
                        <Button size="sm" className="mt-2" onClick={() => handleUpdateSiteImage('cta_background', editingImages.cta_background)}>Salva</Button>
                      </div>
                    </div>
                  </div>

                  {/* Room Images */}
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-white p-6 border border-puglia-stone/50 mb-6">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">{room.name_it} - Galleria</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {room.images?.map((img, idx) => (
                          <div key={img.id} className="relative group">
                            <img src={img.url} alt={img.alt_it} className="w-full aspect-square object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-sm">Foto {idx + 1}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {room.images?.map((img, idx) => (
                          <div key={img.id} className="flex gap-2 items-center">
                            <span className="text-sm text-muted-foreground w-16">Foto {idx + 1}:</span>
                            <Input
                              value={editingImages[`${room.id}_${idx}`] ?? img.url}
                              onChange={(e) => setEditingImages({...editingImages, [`${room.id}_${idx}`]: e.target.value})}
                              className="flex-1 rounded-none text-sm"
                              placeholder="URL immagine"
                            />
                          </div>
                        ))}
                        <Button 
                          size="sm" 
                          className="mt-2"
                          onClick={() => {
                            const updatedImages = room.images.map((img, idx) => ({
                              ...img,
                              url: editingImages[`${room.id}_${idx}`] ?? img.url
                            }));
                            handleUpdateRoomImages(room.id, updatedImages);
                          }}
                        >
                          Salva Immagini {room.name_it}
                        </Button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Dates Tab */}
              {activeTab === 'dates' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Blocca Date</h1>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Blocca nuove date</h2>
                      <div className="mb-4">
                        <Label>Stanza</Label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                          <SelectTrigger className="mt-2 rounded-none"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nonna">Stanza della Nonna</SelectItem>
                            <SelectItem value="pozzo">Stanza del Pozzo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mb-4">
                        <Label>Seleziona date</Label>
                        <div className="mt-2 flex justify-center">
                          <Calendar mode="range" selected={dateRange} onSelect={setDateRange} locale={it} numberOfMonths={1} className="border border-puglia-stone" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <Label>Motivo</Label>
                        <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Es: Manutenzione" className="mt-2 rounded-none" />
                      </div>
                      <Button onClick={handleBlockDates} className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white">
                        <Lock className="w-4 h-4 mr-2" />Blocca Date
                      </Button>
                    </div>
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Date bloccate</h2>
                      {['nonna', 'pozzo'].map((roomId) => (
                        <div key={roomId} className="mb-6">
                          <h3 className="font-medium text-adriatic-blue mb-2">{roomId === 'nonna' ? 'Stanza della Nonna' : 'Stanza del Pozzo'}</h3>
                          {blockedDates[roomId]?.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {blockedDates[roomId].map((blocked) => (
                                <div key={blocked.date} className="flex items-center justify-between p-2 bg-red-50 text-sm">
                                  <div>
                                    <span className="font-medium">{blocked.date}</span>
                                    {blocked.reason && <span className="text-muted-foreground ml-2">- {blocked.reason}</span>}
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => handleUnblockDate(roomId, blocked.date)} className="text-red-600"><X className="w-4 h-4" /></Button>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-muted-foreground text-sm">Nessuna data bloccata</p>}
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
                  {bookings.length === 0 ? <p className="text-muted-foreground">Nessuna prenotazione</p> : (
                    <div className="overflow-x-auto">
                      <table className="admin-table">
                        <thead>
                          <tr><th>Ospite</th><th>Stanza</th><th>Check-in</th><th>Check-out</th><th>Totale</th><th>Stato</th><th>Azioni</th></tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>
                                <p className="font-medium">{booking.guest_name}</p>
                                <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                                {booking.coupon_code && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 mt-1 inline-block">Coupon: {booking.coupon_code}</span>}
                              </td>
                              <td>{booking.room_id === 'nonna' ? 'Nonna' : 'Pozzo'}</td>
                              <td>{booking.check_in}</td>
                              <td>{booking.check_out}</td>
                              <td>
                                <span className="font-medium">€{booking.total_price}</span>
                                {booking.discount_amount > 0 && <span className="text-xs text-green-600 block">-€{booking.discount_amount}</span>}
                              </td>
                              <td><span className={`status-badge ${statusColors[booking.status]}`}>{booking.status}</span></td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <select value={booking.status} onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)} className="border border-puglia-stone p-1 text-sm">
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                  </select>
                                  {booking.payment_status === 'paid' && (
                                    <Button size="icon" variant="ghost" onClick={() => handleResendConfirmation(booking.id)} title="Reinvia email"><Mail className="w-4 h-4" /></Button>
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
                  <div className="bg-white p-6 border border-puglia-stone/50 mb-8">
                    <h2 className="font-heading text-xl text-adriatic-blue mb-4">Crea nuovo coupon</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Codice *</Label><Input value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="ESTATE2025" className="mt-1 rounded-none uppercase" /></div>
                      <div><Label>Tipo sconto</Label>
                        <Select value={newCoupon.discount_type} onValueChange={(v) => setNewCoupon({...newCoupon, discount_type: v})}>
                          <SelectTrigger className="mt-1 rounded-none"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="percentage">Percentuale (%)</SelectItem><SelectItem value="fixed">Fisso (€)</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div><Label>Valore *</Label><Input type="number" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({...newCoupon, discount_value: e.target.value})} className="mt-1 rounded-none" /></div>
                      <div><Label>Notti minime</Label><Input type="number" value={newCoupon.min_nights} onChange={(e) => setNewCoupon({...newCoupon, min_nights: e.target.value})} className="mt-1 rounded-none" /></div>
                      <div><Label>Usi max</Label><Input type="number" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value})} placeholder="Illimitato" className="mt-1 rounded-none" /></div>
                      <div><Label>Valido fino</Label><Input type="date" value={newCoupon.valid_until} onChange={(e) => setNewCoupon({...newCoupon, valid_until: e.target.value})} className="mt-1 rounded-none" /></div>
                    </div>
                    <Button onClick={handleCreateCoupon} className="mt-4 bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white"><Plus className="w-4 h-4 mr-2" />Crea Coupon</Button>
                  </div>
                  <div className="bg-white border border-puglia-stone/50">
                    <h2 className="font-heading text-xl text-adriatic-blue p-6 border-b border-puglia-stone/50">Coupon attivi</h2>
                    {coupons.length === 0 ? <p className="text-muted-foreground p-6">Nessun coupon</p> : (
                      <div className="divide-y divide-puglia-stone/30">
                        {coupons.map((coupon) => (
                          <div key={coupon.id} className="p-6 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-lg font-bold text-adriatic-blue">{coupon.code}</span>
                                <span className={`text-xs px-2 py-1 ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{coupon.is_active ? 'Attivo' : 'Disattivato'}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `€${coupon.discount_value}`}
                                {coupon.min_nights > 1 && ` · Min ${coupon.min_nights} notti`}
                                {coupon.max_uses && ` · ${coupon.uses_count}/${coupon.max_uses} usi`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}>{coupon.is_active ? 'Disattiva' : 'Attiva'}</Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Upsells Tab */}
              {activeTab === 'upsells' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Gestione Upsells</h1>
                  <div className="bg-white p-6 border border-puglia-stone/50 mb-8">
                    <h2 className="font-heading text-xl text-adriatic-blue mb-4">Crea nuovo upsell</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Slug (ID) *</Label><Input value={newUpsell.slug} onChange={(e) => setNewUpsell({...newUpsell, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})} placeholder="prosecco-benvenuto" className="mt-1 rounded-none" /></div>
                      <div><Label>Icona</Label>
                        <Select value={newUpsell.icon} onValueChange={(v) => setNewUpsell({...newUpsell, icon: v})}>
                          <SelectTrigger className="mt-1 rounded-none"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="wine">🍷 Vino</SelectItem>
                            <SelectItem value="grape">🍇 Uva</SelectItem>
                            <SelectItem value="coffee">☕ Colazione</SelectItem>
                            <SelectItem value="sparkles">✨ Pulizia</SelectItem>
                            <SelectItem value="anchor">⚓ Mare</SelectItem>
                            <SelectItem value="shopping-basket">🛒 Spesa</SelectItem>
                            <SelectItem value="gift">🎁 Regalo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Titolo IT *</Label><Input value={newUpsell.title_it} onChange={(e) => setNewUpsell({...newUpsell, title_it: e.target.value})} placeholder="Bollicine di Benvenuto" className="mt-1 rounded-none" /></div>
                      <div><Label>Titolo EN</Label><Input value={newUpsell.title_en} onChange={(e) => setNewUpsell({...newUpsell, title_en: e.target.value})} placeholder="Welcome Bubbles" className="mt-1 rounded-none" /></div>
                      <div className="md:col-span-2"><Label>Descrizione IT *</Label><Textarea value={newUpsell.description_it} onChange={(e) => setNewUpsell({...newUpsell, description_it: e.target.value})} placeholder="Descrizione persuasiva..." className="mt-1 rounded-none" rows={2} /></div>
                      <div className="md:col-span-2"><Label>Descrizione EN</Label><Textarea value={newUpsell.description_en} onChange={(e) => setNewUpsell({...newUpsell, description_en: e.target.value})} placeholder="Persuasive description..." className="mt-1 rounded-none" rows={2} /></div>
                      <div><Label>Prezzo (€) *</Label><Input type="number" step="0.01" value={newUpsell.price} onChange={(e) => setNewUpsell({...newUpsell, price: e.target.value})} className="mt-1 rounded-none" /></div>
                      <div><Label>Notti minime (0 = sempre visibile)</Label><Input type="number" value={newUpsell.min_nights} onChange={(e) => setNewUpsell({...newUpsell, min_nights: e.target.value})} className="mt-1 rounded-none" /></div>
                    </div>
                    <Button onClick={handleCreateUpsell} className="mt-4 bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white" data-testid="create-upsell-btn"><Plus className="w-4 h-4 mr-2" />Crea Upsell</Button>
                  </div>
                  <div className="bg-white border border-puglia-stone/50">
                    <h2 className="font-heading text-xl text-adriatic-blue p-6 border-b border-puglia-stone/50">Upsells configurati</h2>
                    {upsells.length === 0 ? <p className="text-muted-foreground p-6">Nessun upsell</p> : (
                      <div className="divide-y divide-puglia-stone/30">
                        {upsells.map((upsell) => (
                          <div key={upsell.id} className="p-6 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-heading text-lg text-adriatic-blue">{upsell.title_it}</span>
                                <span className={`text-xs px-2 py-1 ${upsell.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {upsell.is_active ? 'Attivo' : 'Disattivato'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{upsell.description_it}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-antique-gold font-medium">€{upsell.price}</span>
                                {upsell.min_nights > 0 && <span className="text-muted-foreground">Min {upsell.min_nights} notti</span>}
                                <span className="text-muted-foreground font-mono text-xs">{upsell.slug}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleToggleUpsell(upsell.id, upsell.is_active)}>
                                {upsell.is_active ? 'Disattiva' : 'Attiva'}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDeleteUpsell(upsell.id)} className="text-red-600">
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

              {/* Pricing Tab */}
              {activeTab === 'pricing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Prezzi Dinamici</h1>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Imposta prezzo personalizzato</h2>
                      <div className="mb-4">
                        <Label>Stanza</Label>
                        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                          <SelectTrigger className="mt-2 rounded-none"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nonna">Stanza della Nonna</SelectItem>
                            <SelectItem value="pozzo">Stanza del Pozzo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mb-4">
                        <Label>Seleziona date</Label>
                        <div className="mt-2 flex justify-center">
                          <Calendar mode="range" selected={priceRange} onSelect={setPriceRange} locale={it} numberOfMonths={1} className="border border-puglia-stone" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <Label>Prezzo per notte (€)</Label>
                        <Input type="number" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="es. 100" className="mt-2 rounded-none" />
                      </div>
                      <div className="mb-4">
                        <Label>Motivo (opzionale)</Label>
                        <Input value={priceReason} onChange={(e) => setPriceReason(e.target.value)} placeholder="es. Alta stagione, Evento speciale" className="mt-2 rounded-none" />
                      </div>
                      <Button onClick={handleSetCustomPrices} className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white" data-testid="set-custom-price-btn">
                        <DollarSign className="w-4 h-4 mr-2" />Imposta Prezzi
                      </Button>
                    </div>
                    <div className="bg-white p-6 border border-puglia-stone/50">
                      <h2 className="font-heading text-xl text-adriatic-blue mb-4">Prezzi personalizzati attivi</h2>
                      {['nonna', 'pozzo'].map((roomId) => {
                        const room = rooms.find(r => r.id === roomId);
                        const prices = customPrices[roomId] || [];
                        return (
                          <div key={roomId} className="mb-6">
                            <h3 className="font-medium text-adriatic-blue mb-2 flex items-center justify-between">
                              <span>{room?.name_it || roomId}</span>
                              <span className="text-sm text-muted-foreground">Base: €{room?.price_per_night}/notte</span>
                            </h3>
                            {prices.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {prices.map((price) => (
                                  <div key={price.date} className="flex items-center justify-between p-2 bg-antique-gold/10 text-sm">
                                    <div>
                                      <span className="font-medium">{price.date}</span>
                                      <span className="text-antique-gold font-bold ml-3">€{price.price}</span>
                                      {price.reason && <span className="text-muted-foreground ml-2">- {price.reason}</span>}
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteCustomPrice(roomId, price.date)} className="text-red-600">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-muted-foreground text-sm">Nessun prezzo personalizzato</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="font-heading text-3xl text-adriatic-blue mb-8">Recensioni</h1>
                  {reviews.length === 0 ? <p className="text-muted-foreground">Nessuna recensione</p> : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 border border-puglia-stone/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-adriatic-blue">{review.guest_name}</p>
                              <p className="text-sm text-muted-foreground">{'⭐'.repeat(review.rating)}</p>
                              <p className="mt-2 text-muted-foreground">{review.comment_it || review.comment_en}</p>
                            </div>
                            {review.is_approved ? <span className="text-green-600 text-sm">✓ Approvata</span> : (
                              <Button size="sm" onClick={() => handleApproveReview(review.id)} className="bg-green-600 hover:bg-green-700">Approva</Button>
                            )}
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
                  {messages.length === 0 ? <p className="text-muted-foreground">Nessun messaggio</p> : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="bg-white p-6 border border-puglia-stone/50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium text-adriatic-blue">{message.name}</p>
                              <p className="text-sm text-muted-foreground">{message.email}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{message.created_at && format(new Date(message.created_at), 'dd/MM/yyyy HH:mm')}</span>
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
