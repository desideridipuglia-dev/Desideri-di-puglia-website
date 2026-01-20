import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingSuccessPage = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [booking, setBooking] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const pollPaymentStatus = async () => {
      if (!sessionId || attempts >= 5) {
        if (attempts >= 5) setStatus('error');
        return;
      }

      try {
        const response = await axios.get(`${API}/bookings/status/${sessionId}`);
        
        if (response.data.payment_status === 'paid') {
          setStatus('success');
          setBooking(response.data.booking);
        } else if (response.data.status === 'expired') {
          setStatus('error');
        } else {
          // Continue polling
          setAttempts(prev => prev + 1);
          setTimeout(pollPaymentStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setAttempts(prev => prev + 1);
        if (attempts >= 4) {
          setStatus('error');
        } else {
          setTimeout(pollPaymentStatus, 2000);
        }
      }
    };

    pollPaymentStatus();
  }, [sessionId, attempts]);

  return (
    <div data-testid="booking-success-page" className="min-h-screen bg-puglia-sand pt-20 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 text-center">
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="w-16 h-16 text-antique-gold animate-spin mx-auto mb-6" />
            <h1 className="font-heading text-2xl text-adriatic-blue mb-4">
              {language === 'it' ? 'Verifica pagamento...' : 'Verifying payment...'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'it' 
                ? 'Stiamo confermando il tuo pagamento. Attendi qualche secondo.' 
                : 'We are confirming your payment. Please wait a moment.'}
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="font-heading text-3xl text-adriatic-blue mb-4">
              {t('booking.success')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('booking.successMessage')}
            </p>

            {booking && (
              <div className="bg-white p-6 border border-puglia-stone/50 text-left mb-8">
                <h2 className="font-heading text-lg text-adriatic-blue mb-4">
                  {language === 'it' ? 'Dettagli prenotazione' : 'Booking details'}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="text-adriatic-blue">{booking.check_in}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="text-adriatic-blue">{booking.check_out}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-puglia-stone/30">
                    <span className="text-muted-foreground">{t('booking.total')}</span>
                    <span className="text-antique-gold font-medium">€{booking.total_price}</span>
                  </div>
                </div>
              </div>
            )}

            <Link to="/">
              <Button 
                className="bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                data-testid="back-home-button"
              >
                <Home className="w-4 h-4 mr-2" />
                {t('booking.backHome')}
              </Button>
            </Link>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="font-heading text-3xl text-adriatic-blue mb-4">
              {language === 'it' ? 'Errore nel pagamento' : 'Payment Error'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {language === 'it' 
                ? 'Si è verificato un errore durante la verifica del pagamento. Contattaci per assistenza.' 
                : 'An error occurred while verifying your payment. Please contact us for assistance.'}
            </p>

            <div className="flex gap-4 justify-center">
              <Link to="/booking">
                <Button 
                  variant="outline"
                  className="border-adriatic-blue text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                >
                  {language === 'it' ? 'Riprova' : 'Try Again'}
                </Button>
              </Link>
              <Link to="/">
                <Button 
                  className="bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-8 py-3"
                >
                  {t('booking.backHome')}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BookingSuccessPage;
