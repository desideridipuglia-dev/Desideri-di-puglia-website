import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import RoomCard from '../components/RoomCard';

// INDIRIZZO BACKEND FISSO
const API = "https://desideri-backend.onrender.com/api";

// --- FUNZIONE MAGICA PER OTTIMIZZARE QUALSIASI LINK (Copiata da Home) ---
const getOptimizedUrl = (url) => {
  if (!url) return "";
  
  // 1. Se è UNSPLASH, usiamo i suoi parametri nativi
  if (url.includes("images.unsplash.com")) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}?q=80&w=1200&auto=format&fit=crop`;
  }

  // 2. PER TUTTI GLI ALTRI (Booking, Airbnb, link diretti, ecc.)
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&q=80&output=webp`;
};

const RoomsPage = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        console.log(`Fetching rooms from: ${API}/rooms`);
        const response = await axios.get(`${API}/rooms`);
        setRooms(response.data);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div data-testid="rooms-page" className="min-h-screen bg-stone-50 pt-20">
      {/* Header */}
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('rooms.subtitle')}
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">
              {t('rooms.title')}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Rooms List */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-adriatic-blue" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {rooms.map((room, index) => {
                // Ottimizzazione immagini prima di passare i dati alla card
                const optimizedRoom = {
                  ...room,
                  images: room.images.map(img => {
                    const url = typeof img === 'string' ? img : img.url;
                    const optimizedUrl = getOptimizedUrl(url); 
                    return typeof img === 'string' ? optimizedUrl : { ...img, url: optimizedUrl };
                  })
                };

                return (
                  <RoomCard 
                    key={room.id} 
                    room={optimizedRoom} 
                    index={index} 
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RoomsPage;