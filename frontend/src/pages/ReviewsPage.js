import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const ReviewsPage = () => {
  const { t } = useLanguage();

  // Carica lo script di Elfsight all'apertura della pagina
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://elfsightcdn.com/platform.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Pulizia quando si cambia pagina
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div data-testid="reviews-page" className="min-h-screen bg-puglia-sand pt-20">
      {/* Header */}
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('reviews.subtitle')}
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">
              {t('reviews.title')}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* SEZIONE WIDGET ELFSIGHT */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          
          {/* Il contenitore del widget */}
          <div className="elfsight-app-d0abb6f5-7062-4910-b3ca-52e57d6f45e3" data-elfsight-app-lazy></div>

        </div>
      </section>
    </div>
  );
};

export default ReviewsPage;