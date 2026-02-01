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
  Star,
  CalendarCheck // NUOVA ICONA IMPORTATA
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
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=1200&auto=format&fit=crop`;
  }
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
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-[55vh] md:h-[80vh] overflow-hidden">
        {images.length > 0 && (
          <>
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
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
                  className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md p-2 md:p-4 rounded-full text-white border border-white/20 transition-all duration-300 md:hover:scale-110 group"
                  aria-label="Immagine precedente"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 backdrop-blur-md p-2 md:p-4 rounded-full text-white border border-white/20 transition-all duration-300 md:hover:scale-110 group"
                  aria-label="Immagine successiva"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-antique-gold w-8 md:w-12' : 'bg-white/40 w-3 md:w-4'}`}
                  aria-label={`Vai all'immagine ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Pulsante Indietro */}
        <Link 
          to="/" 
          className="absolute top-6 left-4 md:top-28 md:left-12 flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/20 transition-all duration-300 z-20 backdrop-blur-md bg-black/20 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border border-white/10"
        >
          <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium">{t('common.back')}</span>
        </Link>

        {/* Titolo Principale Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 pb-16 md:pb-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="font-heading text-4xl md:text-7xl lg:text-8xl text-white mb-3 md:mb-6 drop-shadow-2xl leading-tight">
                {name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/90">
                <div className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border border-white/20">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm tracking-wide font-medium">{t('rooms.maxGuests').replace('{count}', room.max_guests)}</span>
                </div>
                
                {/* --- MODIFICA 1: Rimesso badge generico al posto del prezzo --- */}
                <div className="flex items-center gap-2 bg-antique-gold/90 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-adriatic-blue font-bold shadow-lg">
                  <CalendarCheck className="w-4 h-4" />
                  <span className="text-xs md:text-sm uppercase tracking-wide">
                    {language === 'it' ? 'Verifica disponibilità' : 'Check availability'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-10 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">
            
            {/* Colonna Sinistra (Descrizione + Servizi) */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center gap-4 mb-6 md:mb-10 opacity-60">
                  <Star className="w-3 h-3 md:w-4 md:h-4 text-antique-gold fill-antique-gold" />
                  <div className="h-[1px] w-12 md:w-20 bg-antique-gold"></div>
                </div>

                <h2 className="font-heading text-3xl md:text-4xl text-adriatic-blue mb-6 md:mb-8">
                  {language === 'it' ? 'L\'Esperienza' : 'The Experience'}
                </h2>
                
                <p className="text-gray-600 leading-relaxed text-base md:text-xl mb-10 md:mb-16 font-light">
                  {description}
                </p>

                {/* Sezione Servizi */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-6 md:mb-10 opacity-60">
                        <Star className="w-3 h-3 md:w-4 md:h-4 text-antique-gold fill-antique-gold" />
                        <div className="h-[1px] w-12 md:w-20 bg-antique-gold"></div>
                    </div>
                    
                    <h2 className="font-heading text-3xl md:text-4xl text-adriatic-blue mb-6 md:mb-10">
                        {t('rooms.amenities')}
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-y-4 md:gap-y-6 gap-x-4 md:gap-x-8">
                        {room.amenities?.map((amenity) => {
                            const Icon = amenityIcons[amenity] || Wifi;
                            return (
                            <div key={amenity} className="flex items-center gap-3 md:gap-5 group md:p-4 rounded-xl md:hover:bg-white md:hover:shadow-sm transition-all duration-300">
                                <div className="w-8 h-8 md:w-14 md:h-14 bg-transparent md:bg-white md:border md:border-stone-200 flex items-center justify-start md:justify-center rounded-full md:group-hover:border-antique-gold md:group-hover:bg-antique-gold transition-all duration-300">
                                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-antique-gold md:text-adriatic-blue md:group-hover:text-white transition-colors" />
                                </div>
                                <span className="text-gray-700 font-medium text-sm md:text-lg md:group-hover:text-adriatic-blue transition-colors">
                                    {t(`services.${amenity}`)}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                </div>
              </motion.div>
            </div>

            {/* Colonna Destra (Booking Card SENZA PREZZO) */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white p-6 md:p-12 border border-stone-100 shadow-xl md:shadow-2xl rounded-2xl md:rounded-3xl sticky top-24 md:top-32 z-10"
              >
                <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 bg-adriatic-blue text-white px-4 py-1 md:px-6 md:py-2 rounded-full text-[10px] md:text-xs uppercase tracking-widest font-bold shadow-lg whitespace-nowrap">
                    Best Price Guaranteed
                </div>

                {/* --- MODIFICA 2: HEADER CARD SENZA PREZZO --- */}
                <div className="text-center mb-6 md:mb-10 pb-6 md:pb-8 border-b border-stone-100">
                  <div className="flex justify-center items-center gap-2 mb-2">
                      <CalendarCheck className="w-8 h-8 text-antique-gold" />
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl text-adriatic-blue">
                    {language === 'it' ? 'Prenota il tuo soggiorno' : 'Book your stay'}
                  </h3>
                  <p className="text-stone-500 text-xs md:text-sm mt-2">
                    {language === 'it' ? 'Seleziona le date per vedere i prezzi' : 'Select dates to see prices'}
                  </p>
                </div>

                <div className="space-y-4 md:space-y-6 mb-6 md:mb-10 text-sm">
                  <div className="flex justify-between items-center group">
                    <span className="text-stone-500 font-medium md:group-hover:text-antique-gold transition-colors">Check-in</span>
                    <span className="text-adriatic-blue font-bold text-base md:text-lg">{t('booking.checkInTime')}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-stone-500 font-medium md:group-hover:text-antique-gold transition-colors">Check-out</span>
                    <span className="text-adriatic-blue font-bold text-base md:text-lg">{t('booking.checkOutTime')}</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 p-3 md:p-4 rounded-xl">
                    <span className="text-stone-500 font-medium">{t('booking.guests')}</span>
                    <div className="flex items-center gap-2 text-adriatic-blue font-bold">
                        <Users className="w-4 h-4" />
                        <span>Max {room.max_guests}</span>
                    </div>
                  </div>
                </div>

                <Link to={`/booking?room=${room.id}`}>
                  <Button 
                    className="w-full bg-antique-gold text-white hover:bg-adriatic-blue py-6 md:py-8 text-xs md:text-sm uppercase tracking-[0.25em] font-bold shadow-lg md:shadow-xl md:hover:shadow-2xl md:hover:-translate-y-1 transition-all duration-300 rounded-xl"
                    data-testid="book-room-detail"
                    aria-label={`Prenota ${name}`}
                  >
                    {t('rooms.book')} <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </Link>
                
                <div className="mt-6 md:mt-8 text-center flex items-center justify-center gap-2 text-stone-400 text-[10px] md:text-xs">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Disponibilità in tempo reale</span>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* --- GALLERY GRID --- */}
      {images.length > 1 && (
        <section className="pb-20 md:pb-32 pt-10 bg-white border-t border-stone-100">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center mb-10 md:mb-16">
                 <h2 className="font-heading text-3xl md:text-4xl text-adriatic-blue mb-4">{t('rooms.gallery')}</h2>
                 <div className="flex items-center justify-center gap-4 opacity-60">
                    <div className="h-[1px] w-12 bg-antique-gold"></div>
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-antique-gold fill-antique-gold" />
                    <div className="h-[1px] w-12 bg-antique-gold"></div>
                </div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-6">
              {images.map((image, idx) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`group relative overflow-hidden aspect-square rounded-lg md:rounded-2xl cursor-pointer transition-all duration-500 ${idx === currentImageIndex ? 'ring-2 md:ring-4 ring-antique-gold ring-offset-2 md:ring-offset-4' : ''}`}
                  aria-label={`Visualizza immagine ${idx + 1}`}
                >
                  <img 
                    src={getOptimizedUrl(image.url)} 
                    alt={language === 'it' ? image.alt_it : image.alt_en}
                    className="w-full h-full object-cover md:group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    loading="lazy"
                  />
                  <div className={`hidden md:block absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 ${idx === currentImageIndex ? 'bg-transparent' : ''}`} />
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