import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { MapPin, Phone, Mail, Clock, Globe, Send, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContactPage = () => {
  const { language, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error(language === 'it' ? 'Compila tutti i campi' : 'Please fill all fields');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API}/contact`, {
        ...formData,
        language
      });
      
      toast.success(t('contact.form.sent'));
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="contact-page" className="min-h-screen bg-puglia-sand pt-20">
      {/* Header */}
      <section className="py-16 md:py-24 bg-adriatic-blue">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-accent text-antique-gold text-sm tracking-[0.3em] uppercase mb-4">
              {t('contact.subtitle')}
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-white">
              {t('contact.title')}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-3xl text-adriatic-blue mb-8">
                Desideri di Puglia
              </h2>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-antique-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-adriatic-blue mb-1">{t('contact.address')}</h3>
                    <p className="text-muted-foreground">
                      Via Borgo Vecchio 65<br />
                      76121 Barletta (BT)<br />
                      Italia
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-antique-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-adriatic-blue mb-1">{t('contact.phone')}</h3>
                    <a href="tel:+393884253947" className="text-muted-foreground hover:text-antique-gold transition-colors">+39 388 425 3947</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-antique-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-adriatic-blue mb-1">{t('contact.email')}</h3>
                    <p className="text-muted-foreground">info@desideridipuglia.it</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-antique-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-adriatic-blue mb-1">{t('contact.hours')}</h3>
                    <p className="text-muted-foreground">
                      Check-in: 13:00 - 00:00<br />
                      Check-out: 10:00 - 10:30
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-antique-gold/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-antique-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-adriatic-blue mb-1">
                      {language === 'it' ? 'Lingue parlate' : 'Languages spoken'}
                    </h3>
                    <p className="text-muted-foreground">Italiano, English, Español</p>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="mt-12 h-64 bg-puglia-stone relative overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.5!2d16.2833!3d41.3167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDE5JzAwLjEiTiAxNsKwMTcnMDAuMCJF!5e0!3m2!1sen!2sit!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Location Map"
                />
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white p-8 md:p-12 border border-puglia-stone/50">
                <h2 className="font-heading text-2xl text-adriatic-blue mb-6">
                  {language === 'it' ? 'Inviaci un messaggio' : 'Send us a message'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name">{t('contact.form.name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                      data-testid="contact-name-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t('contact.form.email')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                      data-testid="contact-email-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">{t('contact.form.message')}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="mt-2 rounded-none border-puglia-stone focus:border-adriatic-blue"
                      data-testid="contact-message-input"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white py-6 text-sm uppercase tracking-widest"
                    data-testid="contact-submit-button"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t('contact.form.send')}
                        <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
