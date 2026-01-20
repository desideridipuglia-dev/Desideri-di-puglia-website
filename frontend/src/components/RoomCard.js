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
      className="room-card"
      data-testid={`room-card-${room.id}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-80">
        <img 
          src={mainImage} 
          alt={imageAlt || name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-adriatic-blue/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Price Badge */}
        <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2">
          <span className="font-heading text-2xl text-adriatic-blue">€{room.price_per_night}</span>
          <span className="text-sm text-adriatic-blue/70">{t('rooms.perNight')}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <h3 className="font-heading text-2xl text-adriatic-blue mb-3">{name}</h3>
        
        <div className="flex items-center gap-2 text-antique-gold mb-4">
          <Users className="w-4 h-4" />
          <span className="text-sm">{t('rooms.maxGuests').replace('{count}', room.max_guests)}</span>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-6 line-clamp-3">
          {description}
        </p>

        <div className="flex gap-4">
          <Link to={`/rooms/${room.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
              data-testid={`view-room-${room.id}`}
            >
              {t('rooms.viewDetails')}
            </Button>
          </Link>
          <Link to={`/booking?room=${room.id}`} className="flex-1">
            <Button 
              className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white"
              data-testid={`book-room-${room.id}`}
            >
              {t('rooms.book')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default RoomCard;
