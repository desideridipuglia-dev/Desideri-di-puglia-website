import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DEFAULT_HERO = "https://images.unsplash.com/photo-1614323777193-379d5e6797f7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxwdWdsaWElMjBjb2FzdGxpbmUlMjBhZHJpYXRpYyUyMHNlYSUyMGRlZXAlMjBibHVlfGVufDB8fHx8MTc2ODg4NTYyNnww&ixlib=rb-4.1.0&q=85";

const Hero = ({ onScrollToRooms }) => {
  const { t } = useLanguage();
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO);

  useEffect(() => {
    const fetchSiteImages = async () => {
      try {
        const response = await axios.get(`${API}/site-images`);
        if (response.data.hero_image) {
          setHeroImage(response.data.hero_image);
        }
      } catch (error) {
        console.log('Using default hero image');
      }
    };
    fetchSiteImages();
  }, []);

  return (
    <section data-testid="hero-section" className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Puglia Coastline" 
          className="w-full h-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-accent text-antique-gold text-sm md:text-base tracking-[0.3em] uppercase mb-4"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-heading text-white text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6"
          data-testid="hero-title"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-body text-white/90 text-base md:text-lg max-w-2xl mb-8 leading-relaxed"
        >
          {t('hero.description')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col items-center gap-6"
        >
          <Button
            onClick={onScrollToRooms}
            className="bg-antique-gold text-adriatic-blue hover:bg-white px-8 py-6 text-sm uppercase tracking-widest font-medium transition-all duration-300"
            data-testid="hero-cta-button"
          >
            {t('hero.cta')}
          </Button>

          <div className="flex items-center gap-2 text-white/70 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{t('hero.address')}</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/50 cursor-pointer"
          onClick={onScrollToRooms}
        >
          <ChevronDown className="w-8 h-8" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
