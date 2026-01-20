import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { XCircle, Home, ArrowLeft } from 'lucide-react';

const BookingCancelPage = () => {
  const { language, t } = useLanguage();

  return (
    <div data-testid="booking-cancel-page" className="min-h-screen bg-puglia-sand pt-20 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <XCircle className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-heading text-3xl text-adriatic-blue mb-4">
            {t('booking.cancelled')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('booking.cancelledMessage')}
          </p>

          <div className="flex gap-4 justify-center">
            <Link to="/booking">
              <Button 
                variant="outline"
                className="border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                data-testid="try-again-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {language === 'it' ? 'Riprova' : 'Try Again'}
              </Button>
            </Link>
            <Link to="/">
              <Button 
                className="bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                data-testid="back-home-button"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('booking.backHome')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingCancelPage;
