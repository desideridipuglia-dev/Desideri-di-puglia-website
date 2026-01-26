import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  Wifi, 
  Wind, 
  UtensilsCrossed, 
  Tv, 
  Bath, 
  Coffee,
  ChevronLeft,
  ChevronRight,
  Star 
} from 'lucide-react';

// INDIRIZZO BACKEND FISSO
const API = "https://desideri-backend.onrender.com/api";

const amenityIcons = {
  wifi: Wifi,
  ac: Wind,
  kitchen: UtensilsCrossed,
  tv: Tv,
  bathroom: Bath,
  breakfast: Coffee,
};

// --- FUNZIONE MAGICA PER OTTIMIZZARE QUALSIASI LINK ---
const getOptimizedUrl = (url) => {
  if (!url) return "";
  
  // 1. Se è UNSPLASH, usiamo i suoi parametri nativi
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=1200&auto=format&fit=crop`;
  }

  // 2. PER TUTTI GLI ALTRI (Booking, Airbnb, ecc.)
  // Usiamo il proxy gratuito wsrv.nl per ridimensionare e convertire in WebP
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&q=80&output=webp`;
};

const RoomDetailPage = () => {
  const { roomId } = useParams();
  const { language, t } = useLanguage();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await axios.get(`${API}/rooms/${roomId}`);
        setRoom(response.data);
      } catch (error) {
        console.error('Error fetching room:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-antique-gold" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-stone-50">
        <p>Room not found</p>
        <Link to="/" className="text-adriatic-blue underline ml-2">Torna alla Home</Link>
      </div>
    );
  }

  const name = language === 'it' ? room.name_it : room.name_en;
  const description = language === 'it' ? room.description_it : room.description_en;
  const images = room.images || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div data-testid="room-detail-page" className="min-h-screen bg-stone-50 font-sans">
      
      {/* --- HERO SECTION CINEMATOGRAFICA --- */}
      <section className="relative h-[80vh] overflow-hidden">
        {images.length > 0 && (
          <>
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              // APPUNTIAMO LA FUNZIONE DI OTTIMIZZAZIONE QUI
              src={getOptimizedUrl(images[currentImageIndex]?.url)}
              alt={language === 'it' ? images[currentImageIndex]?.alt_it : images[currentImageIndex]?.alt_en}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-adriatic-blue/90 via-transparent to-black/20" />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md p-4 rounded-full text-white border border-white/20 transition-all duration-300 hover:scale-110 group"
                  aria-label="Immagine precedente"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md p-4 rounded-full text-white border border-white/20 transition-all duration-300 hover:scale-110 group"
                  aria-label="Immagine successiva"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-antique-gold w-12' : 'bg-white/40 w-4 hover:bg-white'}`}
                  aria-label={`Vai all'immagine ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Pulsante Indietro */}
        <Link 
          to="/" 
          className="absolute top-28 left-6 md:left-12 flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/20 transition-all duration-300 z-20 backdrop-blur-md bg-black/20 px-5 py-2.5 rounded-full border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs uppercase tracking-[0.2em] font-medium">{t('common.back')}</span>
        </Link>

        {/* Titolo Principale Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 pb-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl text-white mb-6 drop-shadow-2xl leading-tight">
                {name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/90">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
                  <Users className="w-5 h-5" />
                  <span className="text-sm tracking-wide font-medium">{t('rooms.maxGuests').replace('{count}', room.max_guests)}</span>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-heading text-antique-gold drop-shadow-md">€{room.price_per_night}</span>
                  <span className="text-sm font-body text-white/80 uppercase tracking-wider">{t('rooms.perNight')}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            
            {/* Colonna Sinistra (Descrizione + Servizi) */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* DIVISORE LUXURY */}
                <div className="flex items-center gap-4 mb-10 opacity-60">
                  <Star className="w-4 h-4 text-antique-gold fill-antique-gold" />
                  <div className="h-[1px] w-20 bg-antique-gold"></div>
                </div>

                <h2 className="font-heading text-4xl text-adriatic-blue mb-8">
                  {language === 'it' ? 'L\'Esperienza' : 'The Experience'}
                </h2>
                
                <p className="text-gray-600 leading-loose text-lg md:text-xl mb-16 font-light">
                  {description}
                </p>

                {/* Sezione Servizi */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-10 opacity-60">
                        <Star className="w-4 h-4 text-antique-gold fill-antique-gold" />
                        <div className="h-[1px] w-20 bg-antique-gold"></div>
                    </div>
                    
                    <h2 className="font-heading text-4xl text-adriatic-blue mb-10">
                        {t('rooms.amenities')}
                    </h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-y-6 gap-x-8">
                        {room.amenities?.map((amenity) => {
                            const Icon = amenityIcons[amenity] || Wifi;
                            return (
                            <div key={amenity} className="flex items-center gap-5 group p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-300">
                                <div className="w-14 h-14 bg-white border border-stone-200 flex items-center justify-center rounded-full group-hover:border-antique-gold group-hover:bg-antique-gold transition-all duration-300 shadow-sm">
                                    <Icon className="w-6 h-6 text-adriatic-blue group-hover:text-white transition-colors" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg group-hover:text-adriatic-blue transition-colors">
                                    {t(`services.${amenity}`)}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                </div>
              </motion.div>
            </div>

            {/* Colonna Destra (Sticky Booking Card) */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white p-10 md:p-12 border border-stone-100 shadow-2xl rounded-3xl sticky top-32 z-10"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-adriatic-blue text-white px-6 py-2 rounded-full text-xs uppercase tracking-widest font-bold shadow-lg">
                    Best Price Guaranteed
                </div>

                <div className="text-center mb-10 pb-8 border-b border-stone-100">
                  <div className="flex justify-center items-baseline gap-2">
                      <span className="font-heading text-6xl text-adriatic-blue">€{room.price_per_night}</span>
                  </div>
                  <div className="text-stone-400 text-xs mt-3 uppercase tracking-[0.2em]">{t('rooms.perNight')}</div>
                </div>

                <div className="space-y-6 mb-10 text-sm">
                  <div className="flex justify-between items-center group">
                    <span className="text-stone-500 font-medium group-hover:text-antique-gold transition-colors">Check-in</span>
                    <span className="text-adriatic-blue font-bold text-lg">{t('booking.checkInTime')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-stone-500 font-medium group-hover:text-antique-gold transition-colors">Check-out</span>
                    <span className="text-adriatic-blue font-bold text-lg">{t('booking.checkOutTime')}</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl">
                    <span className="text-stone-500 font-medium">{t('booking.guests')}</span>
                    <div className="flex items-center gap-2 text-adriatic-blue font-bold">
                        <Users className="w-4 h-4" />
                        <span>Max {room.max_guests}</span>
                    </div>
                  </div>
                </div>

                <Link to={`/booking?room=${room.id}`}>
                  <Button 
                    className="w-full bg-antique-gold text-white hover:bg-adriatic-blue py-8 text-sm uppercase tracking-[0.25em] font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl"
                    data-testid="book-room-detail"
                    aria-label={`Prenota ${name}`}
                  >
                    {t('rooms.book')} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                
                <div className="mt-8 text-center flex items-center justify-center gap-2 text-stone-400 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Disponibilità in tempo reale</span>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* --- GALLERY GRID --- */}
      {images.length > 1 && (
        <section className="pb-32 pt-10 bg-white border-t border-stone-100">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center mb-16">
                 <h2 className="font-heading text-4xl text-adriatic-blue mb-4">{t('rooms.gallery')}</h2>
                 <div className="flex items-center justify-center gap-4 opacity-60">
                    <div className="h-[1px] w-12 bg-antique-gold"></div>
                    <Star className="w-4 h-4 text-antique-gold fill-antique-gold" />
                    <div className="h-[1px] w-12 bg-antique-gold"></div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {images.map((image, idx) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`group relative overflow-hidden aspect-square rounded-2xl cursor-pointer transition-all duration-500 ${idx === currentImageIndex ? 'ring-4 ring-antique-gold ring-offset-4' : 'hover:shadow-xl'}`}
                  aria-label={`Visualizza immagine ${idx + 1}`}
                >
                  <img 
                    // OTTIMIZZAZIONE ANCHE QUI
                    src={getOptimizedUrl(image.url)} 
                    alt={language === 'it' ? image.alt_it : image.alt_en}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 ${idx === currentImageIndex ? 'bg-transparent' : ''}`} />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RoomDetailPage;