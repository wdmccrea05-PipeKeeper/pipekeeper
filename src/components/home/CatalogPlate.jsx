import React from 'react';
import InsightHighlightCard from '@/components/insights/InsightHighlightCard';

export default function CatalogPlate({ heroImage, bgImage, photos = [], ...props }) {
  return <InsightHighlightCard {...props} photos={[...photos, heroImage, bgImage]} />;
}
