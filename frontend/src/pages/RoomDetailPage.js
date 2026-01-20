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
  ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const amenityIcons = {
  wifi: Wifi,
  ac: Wind,
  kitchen: UtensilsCrossed,
  tv: Tv,
  bathroom: Bath,
  breakfast: Coffee,
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
      <div className="min-h-screen pt-20 flex items-center justify-center bg-puglia-sand">
        <div className="spinner" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-puglia-sand">
        <p>Room not found</p>
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
    <div data-testid="room-detail-page" className="min-h-screen bg-puglia-sand">
      {/* Hero Image Gallery */}
      <section className="relative h-[70vh] overflow-hidden">
        {images.length > 0 && (
          <>
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              src={images[currentImageIndex]?.url}
              alt={language === 'it' ? images[currentImageIndex]?.alt_it : images[currentImageIndex]?.alt_en}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-adriatic-blue/60 to-transparent" />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/90 p-3 hover:bg-white transition-colors"
                  data-testid="prev-image"
                >
                  <ChevronLeft className="w-6 h-6 text-adriatic-blue" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/90 p-3 hover:bg-white transition-colors"
                  data-testid="next-image"
                >
                  <ChevronRight className="w-6 h-6 text-adriatic-blue" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-antique-gold' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Back Button */}
        <Link 
          to="/rooms" 
          className="absolute top-24 left-6 flex items-center gap-2 text-white hover:text-antique-gold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">{t('common.back')}</span>
        </Link>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-heading text-4xl md:text-6xl text-white mb-4"
            >
              {name}
            </motion.h1>
            <div className="flex items-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{t('rooms.maxGuests').replace('{count}', room.max_guests)}</span>
              </div>
              <div className="text-2xl font-heading">
                €{room.price_per_night}<span className="text-sm font-body">{t('rooms.perNight')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                  {language === 'it' ? 'Descrizione' : 'Description'}
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg mb-12">
                  {description}
                </p>

                {/* Amenities */}
                <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                  {t('rooms.amenities')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {room.amenities?.map((amenity) => {
                    const Icon = amenityIcons[amenity] || Wifi;
                    return (
                      <div key={amenity} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-puglia-stone/50 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-adriatic-blue" />
                        </div>
                        <span className="text-adriatic-blue">
                          {t(`services.${amenity}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white p-8 border border-puglia-stone/50 sticky top-24"
              >
                <div className="text-center mb-6">
                  <span className="font-heading text-4xl text-adriatic-blue">€{room.price_per_night}</span>
                  <span className="text-muted-foreground">{t('rooms.perNight')}</span>
                </div>

                <div className="space-y-4 mb-8 text-sm">
                  <div className="flex justify-between py-3 border-b border-puglia-stone/30">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="text-adriatic-blue">{t('booking.checkInTime')}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-puglia-stone/30">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="text-adriatic-blue">{t('booking.checkOutTime')}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">{t('booking.guests')}</span>
                    <span className="text-adriatic-blue">Max {room.max_guests}</span>
                  </div>
                </div>

                <Link to={`/booking?room=${room.id}`}>
                  <Button 
                    className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white py-6 text-sm uppercase tracking-widest"
                    data-testid="book-room-detail"
                  >
                    {t('rooms.book')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Thumbnails */}
      {images.length > 1 && (
        <section className="pb-16 md:pb-24">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <h2 className="font-heading text-2xl text-adriatic-blue mb-6">{t('rooms.gallery')}</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((image, idx) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative overflow-hidden aspect-square ${idx === currentImageIndex ? 'ring-2 ring-antique-gold' : ''}`}
                >
                  <img 
                    src={image.url} 
                    alt={language === 'it' ? image.alt_it : image.alt_en}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
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
