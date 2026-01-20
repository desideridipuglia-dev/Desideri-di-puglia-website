import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_3750f7fe-2e26-4c3d-b65d-c6df82c61a10/artifacts/2la4ul28_unnamed.png";

const Navbar = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/rooms', label: t('nav.rooms') },
    { to: '/services', label: t('nav.services') },
    { to: '/reviews', label: t('nav.reviews') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const isHomePage = location.pathname === '/';
  const navBg = isScrolled || !isHomePage 
    ? 'bg-white/95 backdrop-blur-md shadow-sm' 
    : 'bg-transparent';
  const textColor = isScrolled || !isHomePage ? 'text-adriatic-blue' : 'text-white';

  return (
    <nav 
      data-testid="navbar"
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="navbar-logo">
            <img src={LOGO_URL} alt="Desideri di Puglia" className="h-12 w-12" />
            <span className={`font-heading text-lg hidden md:block ${textColor}`}>
              Desideri di Puglia
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm uppercase tracking-widest hover:text-antique-gold transition-colors ${textColor} ${location.pathname === link.to ? 'text-antique-gold' : ''}`}
                data-testid={`nav-link-${link.to.replace('/', '') || 'home'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-6">
            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className={`lang-switch ${textColor}`}
              data-testid="language-toggle"
            >
              <span className={language === 'it' ? 'lang-active' : 'lang-inactive'}>IT</span>
              <span className="text-antique-gold">/</span>
              <span className={language === 'en' ? 'lang-active' : 'lang-inactive'}>EN</span>
            </button>

            {/* Book Now Button */}
            <Link to="/booking" className="hidden md:block">
              <Button 
                className="bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white px-6 py-2 text-sm uppercase tracking-widest"
                data-testid="book-now-button"
              >
                {t('nav.book')}
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className={`lg:hidden ${textColor}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-puglia-stone"
            data-testid="mobile-menu"
          >
            <div className="px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block text-adriatic-blue text-sm uppercase tracking-widest py-2 ${location.pathname === link.to ? 'text-antique-gold' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/booking" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-antique-gold text-adriatic-blue hover:bg-adriatic-blue hover:text-white mt-4 py-3">
                  {t('nav.book')}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
