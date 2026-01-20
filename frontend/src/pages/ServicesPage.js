import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import ServicesSection from '../components/ServicesSection';
import { 
  Wifi, Wind, UtensilsCrossed, Tv, Bath, Coffee, PawPrint, 
  Accessibility, Shield, Lock, Camera, Bell, Car, Globe,
  Shirt, Droplets, Bed, Sofa, Monitor, Utensils
} from 'lucide-react';

const allServices = [
  { category: 'general', items: [
    { key: 'wifi', icon: Wifi, desc_it: 'Connessione WiFi gratuita in tutte le aree', desc_en: 'Free WiFi in all areas' },
    { key: 'ac', icon: Wind, desc_it: 'Aria condizionata e riscaldamento', desc_en: 'Air conditioning and heating' },
    { key: 'tv', icon: Tv, desc_it: 'Smart TV con Netflix e canali via cavo', desc_en: 'Smart TV with Netflix and cable' },
    { key: 'breakfast', icon: Coffee, desc_it: 'Prima colazione inclusa', desc_en: 'Breakfast included' },
  ]},
  { category: 'kitchen', items: [
    { key: 'kitchen', icon: UtensilsCrossed, desc_it: 'Cucina completamente attrezzata', desc_en: 'Fully equipped kitchen' },
    { key: 'fridge', icon: Utensils, desc_it: 'Frigorifero e microonde', desc_en: 'Refrigerator and microwave' },
    { key: 'coffee', icon: Coffee, desc_it: 'Macchina da caffè', desc_en: 'Coffee machine' },
    { key: 'dining', icon: Sofa, desc_it: 'Zona pranzo', desc_en: 'Dining area' },
  ]},
  { category: 'bedroom', items: [
    { key: 'bed', icon: Bed, desc_it: 'Letti lunghi oltre 2 metri', desc_en: 'Extra long beds (over 2m)' },
    { key: 'linens', icon: Shirt, desc_it: 'Biancheria di alta qualità', desc_en: 'High quality linens' },
    { key: 'wardrobe', icon: Shirt, desc_it: 'Armadio e cabina armadio', desc_en: 'Wardrobe and walk-in closet' },
    { key: 'desk', icon: Monitor, desc_it: 'Scrivania per lavoro', desc_en: 'Work desk' },
  ]},
  { category: 'bathroom', items: [
    { key: 'bathroom', icon: Bath, desc_it: 'Bagno privato con doccia', desc_en: 'Private bathroom with shower' },
    { key: 'toiletries', icon: Droplets, desc_it: 'Set cortesia in omaggio', desc_en: 'Complimentary toiletries' },
    { key: 'hairdryer', icon: Wind, desc_it: 'Asciugacapelli', desc_en: 'Hairdryer' },
    { key: 'robe', icon: Shirt, desc_it: 'Accappatoio e pantofole', desc_en: 'Bathrobe and slippers' },
  ]},
  { category: 'safety', items: [
    { key: 'safe', icon: Lock, desc_it: 'Cassaforte in camera', desc_en: 'In-room safe' },
    { key: 'security', icon: Shield, desc_it: 'Sicurezza 24 ore', desc_en: '24-hour security' },
    { key: 'cctv', icon: Camera, desc_it: 'Telecamere di sorveglianza', desc_en: 'CCTV surveillance' },
    { key: 'alarm', icon: Bell, desc_it: 'Allarme antincendio e rilevatori', desc_en: 'Fire alarms and detectors' },
  ]},
  { category: 'accessibility', items: [
    { key: 'wheelchair', icon: Accessibility, desc_it: 'Accesso per sedie a rotelle', desc_en: 'Wheelchair access' },
    { key: 'pets', icon: PawPrint, desc_it: 'Animali ammessi senza supplemento', desc_en: 'Pets welcome, no extra charge' },
    { key: 'languages', icon: Globe, desc_it: 'Staff multilingue (IT/EN/ES)', desc_en: 'Multilingual staff (IT/EN/ES)' },
    { key: 'parking', icon: Car, desc_it: 'Indicazioni parcheggio nelle vicinanze', desc_en: 'Nearby parking information' },
  ]},
];

const categoryTitles = {
  general: { it: 'Servizi Generali', en: 'General Services' },
  kitchen: { it: 'Cucina', en: 'Kitchen' },
  bedroom: { it: 'Camera da Letto', en: 'Bedroom' },
  bathroom: { it: 'Bagno', en: 'Bathroom' },
  safety: { it: 'Sicurezza', en: 'Safety & Security' },
  accessibility: { it: 'Accessibilità', en: 'Accessibility' },
};

const ServicesPage = () => {
  const { language, t } = useLanguage();

  return (
    <div data-testid="services-page" className="min-h-screen bg-puglia-sand pt-20">
      {/* Header */}
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('services.subtitle')}
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">
              {t('services.title')}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Services by Category */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {allServices.map((category, catIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: catIndex * 0.1 }}
              viewport={{ once: true }}
              className="mb-16 last:mb-0"
            >
              <h2 className="font-heading text-2xl text-adriatic-blue mb-8 pb-4 border-b border-puglia-stone">
                {categoryTitles[category.category][language]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {category.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={item.key}
                      className="bg-white p-6 border border-puglia-stone/50 hover:shadow-md transition-shadow"
                      data-testid={`service-detail-${item.key}`}
                    >
                      <div className="w-12 h-12 bg-puglia-sand flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-adriatic-blue" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {language === 'it' ? item.desc_it : item.desc_en}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Check-in/Check-out Info */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl text-adriatic-blue mb-8">
              {language === 'it' ? 'Informazioni Arrivo e Partenza' : 'Check-in & Check-out Information'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-puglia-sand">
                <h3 className="font-heading text-xl text-adriatic-blue mb-4">Check-in</h3>
                <p className="text-2xl text-antique-gold font-heading mb-2">13:00 - 00:00</p>
                <p className="text-muted-foreground text-sm">
                  {language === 'it' 
                    ? 'È richiesto un documento di identità e carta di credito. Comunicare in anticipo l\'orario di arrivo.' 
                    : 'ID and credit card required. Please inform us of your arrival time in advance.'}
                </p>
              </div>
              <div className="p-8 bg-puglia-sand">
                <h3 className="font-heading text-xl text-adriatic-blue mb-4">Check-out</h3>
                <p className="text-2xl text-antique-gold font-heading mb-2">10:00 - 10:30</p>
                <p className="text-muted-foreground text-sm">
                  {language === 'it' 
                    ? 'Check-out express disponibile. Fattura disponibile su richiesta.' 
                    : 'Express check-out available. Invoice available upon request.'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
