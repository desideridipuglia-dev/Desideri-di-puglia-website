import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Star } from 'lucide-react';

const ReviewCard = ({ review, index }) => {
  const { language } = useLanguage();
  const comment = language === 'it' ? review.comment_it : review.comment_en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-white p-8 border border-puglia-stone/50 hover:shadow-lg transition-shadow duration-300"
      data-testid={`review-card-${review.id}`}
    >
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${i < review.rating ? 'fill-antique-gold text-antique-gold' : 'text-puglia-stone'}`}
          />
        ))}
      </div>

      {/* Comment */}
      <p className="text-muted-foreground leading-relaxed mb-6 italic">
        "{comment || 'Great experience!'}"
      </p>

      {/* Guest info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-adriatic-blue text-white flex items-center justify-center font-heading">
          {review.guest_name?.charAt(0)?.toUpperCase() || 'G'}
        </div>
        <div>
          <p className="font-medium text-adriatic-blue">{review.guest_name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ReviewCard;
