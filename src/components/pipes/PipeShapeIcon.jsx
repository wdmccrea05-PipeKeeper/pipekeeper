import React from 'react';

const SHAPE_ICONS = {
  'Billiard': '🪈',
  'Bulldog': '🪈',
  'Dublin': '🪈',
  'Apple': '🍎',
  'Author': '✒️',
  'Bent': '〰️',
  'Canadian': '🍁',
  'Churchwarden': '🎩',
  'Freehand': '🎨',
  'Lovat': '🪈',
  'Poker': '🃏',
  'Prince': '👑',
  'Rhodesian': '🪈',
  'Zulu': '🪈',
  'Calabash': '🎺',
  'Pot': '🫖',
  'Tomato': '🍅',
  'Other': '🪈'
};

export default function PipeShapeIcon({ shape, className = "text-4xl" }) {
  const icon = SHAPE_ICONS[shape] || '🪈';
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {icon}
    </div>
  );
}