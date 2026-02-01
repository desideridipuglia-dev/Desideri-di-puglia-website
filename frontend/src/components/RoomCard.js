import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const RoomCard = ({ room, index }) => {
  const { language, t } = useLanguage();
  
  const name = language === 'it' ? room.name_it : room.name_en;
  const description = language === 'it' ? room.description_it : room.description_en;
  const mainImage = room.images?.[0]?.url || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800';
  const imageAlt = language === 'it' ? room.images?.[0]?.alt_it : room.images?.[0]?.alt_en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      viewport={{ once: true }}
      className="room-card group bg-white border border-stone-100/50 hover:border-stone-200 shadow-sm hover:shadow-xl transition-all duration-500 rounded-xl overflow-hidden"
      data-testid={`room-card-${room.id}`}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden h-80">
        <img 
          src={mainImage} 
          alt={imageAlt || name}
          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        />
        {/* Overlay leggero al passaggio del mouse per atmosfera */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* CLEAN STRATEGY: Nessun prezzo visualizzato qui. L'immagine parla da sola. */}
      </div>

      {/* Content */}
      <div className="p-8">
        <h3 className="font-heading text-2xl text-adriatic-blue mb-3 group-hover:text-antique-gold transition-colors duration-300">
          {name}
        </h3>
        
        <div className="flex items-center gap-2 text-stone-500 mb-4 text-xs tracking-wider uppercase">
          <Users className="w-4 h-4 text-antique-gold" />
          <span>{t('rooms.maxGuests').replace('{count}', room.max_guests)}</span>
        </div>
        
        <p className="text-gray-600 text-sm leading-relaxed mb-8 line-clamp-3 font-light">
          {description}
        </p>

        <div className="flex gap-4">
          <Link to={`/rooms/${room.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-stone-200 text-adriatic-blue hover:bg-adriatic-blue hover:text-white hover:border-adriatic-blue transition-all duration-300 py-6 uppercase text-xs tracking-widest font-bold"
              data-testid={`view-room-${room.id}`}
            >
              {t('rooms.viewDetails')}
            </Button>
          </Link>
          <Link to={`/booking?room=${room.id}`} className="flex-1">
            <Button 
              className="w-full bg-antique-gold text-white hover:bg-adriatic-blue transition-all duration-300 py-6 uppercase text-xs tracking-widest font-bold shadow-md hover:shadow-lg"
              data-testid={`book-room-${room.id}`}
            >
              {t('rooms.book')}
              <ArrowRight className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;