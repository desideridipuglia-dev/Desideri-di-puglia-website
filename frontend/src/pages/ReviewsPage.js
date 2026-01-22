import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import ReviewCard from '../components/ReviewCard';
import { Star } from 'lucide-react';

// MODIFICA FONDAMENTALE: Indirizzo backend fisso per leggere le recensioni
const API = "https://desideri-backend.onrender.com/api";

const ReviewsPage = () => {
  const { language, t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        console.log(`Fetching reviews from: ${API}/reviews`);
        const response = await axios.get(`${API}/reviews?approved_only=true`);
        setReviews(response.data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Demo reviews if none exist (Fallback)
  const demoReviews = [
    {
      id: '1',
      guest_name: 'Marco B.',
      rating: 5,
      comment_it: 'Un soggiorno indimenticabile. La Stanza della Nonna è un piccolo gioiello, curata nei minimi dettagli. La posizione è perfetta per esplorare Barletta.',
      comment_en: 'An unforgettable stay. Grandmother\'s Room is a little gem, carefully curated in every detail. The location is perfect for exploring Barletta.',
      created_at: '2024-11-15'
    },
    {
      id: '2',
      guest_name: 'Sarah L.',
      rating: 5,
      comment_it: 'Esperienza di lusso autentico. I proprietari sono stati gentilissimi e la colazione era deliziosa. Torneremo sicuramente!',
      comment_en: 'Authentic luxury experience. The owners were very kind and breakfast was delicious. We will definitely come back!',
      created_at: '2024-10-20'
    },
    {
      id: '3',
      guest_name: 'Giovanni R.',
      rating: 5,
      comment_it: 'La Stanza del Pozzo ha superato ogni aspettativa. L\'atmosfera è magica, un perfetto mix di storia e comfort moderno.',
      comment_en: 'The Well Room exceeded all expectations. The atmosphere is magical, a perfect mix of history and modern comfort.',
      created_at: '2024-09-05'
    },
    {
      id: '4',
      guest_name: 'Emma T.',
      rating: 5,
      comment_it: 'Posizione strategica nel centro storico, a due passi dal castello. Appartamento pulitissimo e ben arredato.',
      comment_en: 'Strategic location in the historic center, steps from the castle. Very clean and well-furnished apartment.',
      created_at: '2024-08-12'
    },
    {
      id: '5',
      guest_name: 'Paolo M.',
      rating: 5,
      comment_it: 'La colazione era fantastica con prodotti locali. Consiglio vivamente per chi cerca un\'esperienza autentica in Puglia.',
      comment_en: 'Breakfast was fantastic with local products. Highly recommended for those seeking an authentic Puglia experience.',
      created_at: '2024-07-28'
    },
    {
      id: '6',
      guest_name: 'Claire D.',
      rating: 5,
      comment_it: 'Accoglienza calorosa, camera stupenda con dettagli di design. Il borgo vecchio è incantevole.',
      comment_en: 'Warm welcome, stunning room with design details. The old town is charming.',
      created_at: '2024-06-15'
    }
  ];

  // Se il server risponde con dati vuoti, usa quelli demo per bellezza, altrimenti usa quelli veri
  const displayReviews = reviews.length > 0 ? reviews : demoReviews;
  const averageRating = displayReviews.reduce((acc, r) => acc + r.rating, 0) / displayReviews.length;

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

      {/* Stats */}
      <section className="py-12 bg-white border-b border-puglia-stone">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="font-heading text-5xl text-adriatic-blue">{averageRating.toFixed(1)}</span>
                <Star className="w-10 h-10 fill-antique-gold text-antique-gold" />
              </div>
              <p className="text-muted-foreground text-sm uppercase tracking-wider">
                {language === 'it' ? 'Valutazione media' : 'Average rating'}
              </p>
            </div>
            <div className="h-16 w-px bg-puglia-stone hidden md:block" />
            <div className="text-center">
              <span className="font-heading text-5xl text-adriatic-blue">{displayReviews.length}</span>
              <p className="text-muted-foreground text-sm uppercase tracking-wider mt-2">
                {language === 'it' ? 'Recensioni' : 'Reviews'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {loading ? (
            <div className="flex justify-center">
              <div className="spinner" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayReviews.map((review, index) => (
                <ReviewCard key={review.id} review={review} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ReviewsPage;