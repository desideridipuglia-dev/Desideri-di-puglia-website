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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const roomsRef = useRef(null);

  // --- DATI DEMO PER LE STANZE (Così le vedi subito!) ---
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
        // Proviamo a scaricare i dati veri, ma non blocchiamo tutto se fallisce
        const [roomsRes, reviewsRes] = await Promise.all([
          axios.get(`${API}/rooms`).catch(e => ({ data: [] })), 
          axios.get(`${API}/reviews?approved_only=true`).catch(e => ({ data: [] }))
        ]);

        if (Array.isArray(roomsRes.data) && roomsRes.data.length > 0) {
            setRooms(roomsRes.data);
        }
        if (Array.isArray(reviewsRes.data) && reviewsRes.data.length > 0) {
            setReviews(reviewsRes.data);
        }

      } catch (error) {
        console.log('Uso dati demo perché il backend non risponde');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const scrollToRooms = () => {
    roomsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Logica intelligente: Se abbiamo dati veri usiamo quelli, altrimenti usiamo quelli demo
  const displayRooms = (rooms.length > 0) ? rooms : demoRooms;
  const displayReviews = (reviews.length > 0) ? reviews : demoReviews;

  return (
    <div data-testid="home-page">
      <Hero onScrollToRooms={scrollToRooms} />

      <section 
        ref={roomsRef}
        data-testid="rooms-section" 
        className="py-24 md:py-32 bg-puglia-sand"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('rooms.subtitle')}
            </p>
            <h2 className="font-heading text-3xl md:text-5xl text-adriatic-blue">
              {t('rooms.title')}
            </h2>
            <div className="section-divider" />
          </motion.div>

          {loading ? (
            <div className="flex justify-center">
              <div className="spinner" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {displayRooms.map((room, index) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ServicesSection />

      <section data-testid="reviews-preview-section" className="py-24 md:py-32 bg-puglia-sand">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('reviews.subtitle')}
            </p>
            <h2 className="font-heading text-3xl md:text-5xl text-adriatic-blue">
              {t('reviews.title')}
            </h2>
            <div className="section-divider" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {displayReviews.slice(0, 3).map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>

          <div className="text-center">
            <Link to="/reviews">
              <Button 
                variant="outline" 
                className="border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                data-testid="view-all-reviews"
              >
                {t('reviews.title')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(https://images.unsplash.com/photo-1652376172934-95d8d0a8ec47?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxiYXJsZXR0YSUyMGNhc3RsZSUyMGZvcnRyZXNzJTIwc3RvbmUlMjB0ZXh0dXJlfGVufDB8fHx8MTc2ODg4NTYyOXww&ixlib=rb-4.1.0&q=85)` 
          }}
        />
        <div className="absolute inset-0 bg-adriatic-blue/80" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              Desideri di Puglia
            </p>
            <h2 className="font-heading text-3xl md:text-5xl text-white mb-6">
              {t('booking.title')}
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              {t('booking.subtitle')}
            </p>
            <Link to="/booking">
              <Button 
                className="bg-antique-gold text-adriatic-blue hover:bg-white px-10 py-6 text-sm uppercase tracking-widest"
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