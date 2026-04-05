import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CollectorDisplayCard from '@/components/ui/CollectorDisplayCard';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/components/utils/localeFormatters';

export default function CollectorGridView({
  items = [],
  getImage = (item) => item?.photos?.[0],
  getTitle = (item) => item?.name,
  getSubtitle = (item) => item?.maker || item?.distillery || item?.brand,
  getBadges = () => null,
  getValue = (item) => item?.estimated_value,
  getIsFavorite = (item) => item?.is_favorite,
  getKey = (item) => item?.id,
  onToggleFavorite = () => {},
  onClick = () => {},
  onEdit = () => {},
  fallbackIcon = null,
  showValue = true,
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  gap = 'gap-8',
}) {
  return (
    <div className={`${columns} ${gap}`}>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={getKey(item)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <CollectorDisplayCard
              image={getImage(item)}
              title={getTitle(item)}
              subtitle={getSubtitle(item)}
              badges={getBadges(item)}
              valueDisplay={
                showValue && getValue(item) ? (
                  <Badge
                    className="border-0 backdrop-blur-md font-semibold shadow-lg text-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(46, 125, 92, 0.9), rgba(40, 110, 80, 0.95))',
                      color: '#fff',
                    }}
                  >
                    {formatCurrency(+getValue(item))}
                  </Badge>
                ) : null
              }
              isFavorite={getIsFavorite(item)}
              onToggleFavorite={() => onToggleFavorite(item)}
              onClick={() => onClick(item)}
              onEdit={() => onEdit(item)}
              fallbackIcon={fallbackIcon}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}