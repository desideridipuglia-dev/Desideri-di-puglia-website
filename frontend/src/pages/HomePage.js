import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import Hero from '../components/Hero';
import RoomCard from '../components/RoomCard';
import ServicesSection from '../components/ServicesSection';
import ReviewCard from '../components/ReviewCard';
import { Button } from '../components/ui/button';
import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

// INDIRIZZO API
const API = "https://desideri-backend.onrender.com/api";

const HomePage = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const roomsRef = useRef(null);

  // --- DATI DEMO PER LE STANZE (Fallback di sicurezza) ---
  const demoRooms = [
    {
      id: 1,
      name: "La Stanza della Nonna",
      description_it: "Un tuffo nel passato con comfort moderni e vista sul centro storico.",
      description_en: "A blast from the past with modern comforts and a view of the historic center.",
      price: 120,
      images: ["https://images.unsplash.com/photo-1590490360182-f33efe29a79d?q=80&w=2070&auto=format&fit=crop"],
      max_guests: 2
    },
    {
      id: 2,
      name: "La Stanza del Pozzo",
      description_it: "Atmosfera magica in pietra viva, perfetta per fughe romantiche.",
      description_en: "Magical atmosphere in exposed stone, perfect for romantic getaways.",
      price: 140,
      images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=2070&auto=format&fit=crop"],
      max_guests: 2
    },
    {
      id: 3,
      name: "Suite Terrazza",
      description_it: "Ampia suite luminosa con terrazza privata esclusiva.",
      description_en: "Large bright suite with exclusive private terrace.",
      price: 180,
      images: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop"],
      max_guests: 3
    }
  ];

  const demoReviews = [
    {
      id: '1',
      guest_name: 'Marco B.',
      rating: 5,
      comment_it: 'Un soggiorno indimenticabile. La Stanza della Nonna è un piccolo gioiello.',
      comment_en: 'An unforgettable stay. Grandmother\'s Room is a little gem.',
      created_at: '2024-11-15'
    },
    {
      id: '2',
      guest_name: 'Sarah L.',
      rating: 5,
      comment_it: 'Esperienza di lusso autentico. I proprietari sono stati gentilissimi.',
      comment_en: 'Authentic luxury experience. The owners were very kind.',
      created_at: '2024-10-20'
    },
    {
      id: '3',
      guest_name: 'Giovanni R.',
      rating: 5,
      comment_it: 'La Stanza del Pozzo ha superato ogni aspettativa.',
      comment_en: 'The Well Room exceeded all expectations.',
      created_at: '2024-09-05'
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Tentativo connessione a:", API);
        const [roomsRes, reviewsRes] = await Promise.all([
          axios.get(`${API}/rooms`).catch(e => {
            console.error("Errore fetch rooms:", e);
            return { data: [] };
          }), 
          axios.get(`${API}/reviews?approved_only=true`).catch(e => {
             console.error("Errore fetch reviews:", e);
             return { data: [] };
          })
        ]);

        if (Array.isArray(roomsRes.data) && roomsRes.data.length > 0) {
            setRooms(roomsRes.data);
        }
        if (Array.isArray(reviewsRes.data) && reviewsRes.data.length > 0) {
            setReviews(reviewsRes.data);
        }

      } catch (error) {
        console.error('Errore generale fetch:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const scrollToRooms = () => {
    roomsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const displayRooms = (rooms.length > 0) ? rooms : demoRooms;
  const displayReviews = (reviews.length > 0) ? reviews : demoReviews;

  return (
    <div data-testid="home-page" className="bg-stone-50"> {/* Sfondo generale leggermente caldo */}
      <Hero onScrollToRooms={scrollToRooms} />

      {/* --- SEZIONE STANZE --- */}
      <section 
        ref={roomsRef}
        data-testid="rooms-section" 
        className="py-24 md:py-32"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.4em] uppercase mb-4">
              {t('rooms.subtitle')}
            </p>
            {/* Titolo Ingrandito */}
            <h2 className="font-heading text-4xl md:text-6xl text-adriatic-blue mb-6">
              {t('rooms.title')}
            </h2>
            
            {/* NUOVO DIVISORE ELEGANTE */}
            <div className="flex items-center justify-center gap-4 opacity-70">
              <div className="h-[1px] w-12 bg-antique-gold"></div>
              <Star className="w-4 h-4 text-antique-gold fill-antique-gold" />
              <div className="h-[1px] w-12 bg-antique-gold"></div>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adriatic-blue" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {displayRooms.map((room, index) => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  index={index}
                  isReversed={index % 2 !== 0} // Predisposizione per layout alternato
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <ServicesSection />

      {/* --- SEZIONE RECENSIONI --- */}
      <section data-testid="reviews-preview-section" className="py-24 md:py-32 bg-puglia-sand/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.4em] uppercase mb-4">
              {t('reviews.subtitle')}
            </p>
            <h2 className="font-heading text-4xl md:text-6xl text-adriatic-blue mb-6">
              {t('reviews.title')}
            </h2>
             {/* NUOVO DIVISORE ELEGANTE */}
             <div className="flex items-center justify-center gap-4 opacity-70">
              <div className="h-[1px] w-12 bg-antique-gold"></div>
              <Star className="w-4 h-4 text-antique-gold fill-antique-gold" />
              <div className="h-[1px] w-12 bg-antique-gold"></div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {displayReviews.slice(0, 3).map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/reviews">
              <Button 
                variant="outline" 
                className="border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-10 py-6 text-sm uppercase tracking-widest transition-all duration-300"
                data-testid="view-all-reviews"
              >
                {t('reviews.title')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- SEZIONE CTA FINALE (PARALLAX + GLASSMORPHISM) --- */}
      <section className="relative py-32 overflow-hidden flex items-center justify-center min-h-[60vh]">
        
        {/* Immagine di Sfondo con PARALLAX (bg-fixed) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ 
            backgroundImage: `url(https://images.unsplash.com/photo-1652376172934-95d8d0a8ec47?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxiYXJsZXR0YSUyMGNhc3RsZSUyMGZvcnRyZXNzJTIwc3RvbmUlMjB0ZXh0dXJlfGVufDB8fHx8MTc2ODg4NTYyOXww&ixlib=rb-4.1.0&q=85)` 
          }}
        />
        
        {/* Overlay Scuro Leggero */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Contenitore GLASSMORPHISM */}
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="backdrop-blur-md bg-white/10 border border-white/20 p-8 md:p-14 rounded-2xl shadow-2xl"
          >
            <p className="font-accent text-white/90 text-sm tracking-[0.4em] uppercase mb-4">
              Desideri di Puglia
            </p>
            <h2 className="font-heading text-4xl md:text-6xl text-white mb-8 drop-shadow-md">
              {t('booking.title')}
            </h2>
            <p className="text-white/90 text-lg mb-10 max-w-xl mx-auto font-light leading-relaxed">
              {t('booking.subtitle')}
            </p>
            
            <Link to="/booking">
              <Button 
                className="bg-white text-adriatic-blue hover:bg-antique-gold hover:text-white px-12 py-7 text-sm uppercase tracking-widest transition-all duration-500 ease-out shadow-lg hover:shadow-gold/50"
                data-testid="cta-book-now"
              >
                {t('nav.book')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;