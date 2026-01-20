import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import RoomCard from '../components/RoomCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RoomsPage = () => {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
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
    <div data-testid="rooms-page" className="min-h-screen bg-puglia-sand pt-20">
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
            <div className="flex justify-center">
              <div className="spinner" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {rooms.map((room, index) => (
                <RoomCard key={room.id} room={room} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RoomsPage;
