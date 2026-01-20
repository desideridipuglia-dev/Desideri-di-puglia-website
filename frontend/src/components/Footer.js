import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_3750f7fe-2e26-4c3d-b65d-c6df82c61a10/artifacts/2la4ul28_unnamed.png";

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer data-testid="footer" className="bg-adriatic-blue text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="lg:col-span-1">
            <img src={LOGO_URL} alt="Desideri di Puglia" className="h-16 w-16 mb-6" />
            <h3 className="font-heading text-2xl mb-4">Desideri di Puglia</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Boutique B&B nel cuore di Barletta
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg mb-6 text-antique-gold">Link Rapidi</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/rooms" className="text-white/70 hover:text-antique-gold transition-colors text-sm">
                  {t('nav.rooms')}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-white/70 hover:text-antique-gold transition-colors text-sm">
                  {t('nav.services')}
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="text-white/70 hover:text-antique-gold transition-colors text-sm">
                  {t('nav.reviews')}
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-white/70 hover:text-antique-gold transition-colors text-sm">
                  {t('nav.book')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading text-lg mb-6 text-antique-gold">{t('contact.title')}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-antique-gold flex-shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm">
                  Via Borgo Vecchio 65<br />
                  76121 Barletta (BT), Italia
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-antique-gold" />
                <span className="text-white/70 text-sm">+39 XXX XXX XXXX</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-antique-gold" />
                <span className="text-white/70 text-sm">info@desideridipuglia.it</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-heading text-lg mb-6 text-antique-gold">{t('contact.hours')}</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              <li>
                <span className="text-white">Check-in:</span><br />
                13:00 - 00:00
              </li>
              <li>
                <span className="text-white">Check-out:</span><br />
                10:00 - 10:30
              </li>
            </ul>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-white/70 hover:text-antique-gold transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-white/70 hover:text-antique-gold transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {currentYear} Desideri di Puglia. {t('footer.rights')}.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-white/50 hover:text-antique-gold text-sm transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="text-white/50 hover:text-antique-gold text-sm transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
