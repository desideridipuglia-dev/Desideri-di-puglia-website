import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { 
  Wifi, 
  Wind, 
  UtensilsCrossed, 
  Tv, 
  Bath, 
  Coffee, 
  PawPrint, 
  Accessibility 
} from 'lucide-react';

const services = [
  { key: 'wifi', icon: Wifi },
  { key: 'ac', icon: Wind },
  { key: 'kitchen', icon: UtensilsCrossed },
  { key: 'tv', icon: Tv },
  { key: 'bathroom', icon: Bath },
  { key: 'breakfast', icon: Coffee },
  { key: 'pets', icon: PawPrint },
  { key: 'accessibility', icon: Accessibility },
];

const ServicesSection = () => {
  const { t } = useLanguage();

  return (
    <section data-testid="services-section" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
            {t('services.subtitle')}
          </p>
          <h2 className="font-heading text-3xl md:text-5xl text-adriatic-blue">
            {t('services.title')}
          </h2>
          <div className="section-divider" />
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center group"
                data-testid={`service-${service.key}`}
              >
                <div className="amenity-icon mx-auto mb-4 group-hover:bg-antique-gold group-hover:text-white group-hover:border-antique-gold transition-all duration-300">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg text-adriatic-blue mb-2">
                  {t(`services.${service.key}`)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t(`services.${service.key}Desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
