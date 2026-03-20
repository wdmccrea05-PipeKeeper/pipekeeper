/**
 * Story Card Component
 * Renders individual story cards with various types
 */

import React from 'react';
import { Clock, Flame, TrendingUp, Coffee, Zap, Award, BookOpen, Trophy } from 'lucide-react';

const CARD_ACCENTS = {
  mostSmokedPipe: '#D4A574',
  favoriteBlend: '#8B7355',
  longestStreak: '#A35C5C',
  totalSessions: '#7BA3A3',
  collectionValue: '#D4AF37',
  pipeCount: '#C0A080',
  cellarSize: '#8B9D83',
  journey: '#9B8B7E',
  milestone: '#FFD700'
};

const CARD_ICONS = {
  mostSmokedPipe: Flame,
  favoriteBlend: Coffee,
  longestStreak: TrendingUp,
  totalSessions: BookOpen,
  collectionValue: Zap,
  pipeCount: Award,
  cellarSize: Trophy,
  journey: Coffee,
  milestone: Trophy
};

export default function StoryCard({ card }) {
  const accent = CARD_ACCENTS[card.type] || '#D4A574';
  const Icon = CARD_ICONS[card.type] || Coffee;

  const renderCardContent = () => {
    switch (card.type) {
      case 'mostSmokedPipe':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Most Smoked Pipe"
            value={card.data.name}
            descriptor={`${card.data.bowls} bowls`}
            accent={accent}
          />
        );

      case 'favoriteBlend':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Favorite Blend"
            value={card.data.name}
            descriptor={`${card.data.bowls} bowls`}
            accent={accent}
          />
        );

      case 'longestStreak':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Longest Streak"
            value={`${card.data.days} Days`}
            descriptor="consecutive smoking sessions"
            accent={accent}
          />
        );

      case 'totalSessions':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Total Sessions"
            value={card.data.count}
            descriptor="bowls logged"
            accent={accent}
          />
        );

      case 'collectionValue':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Collection Value"
            value={`$${(card.data.value / 1000).toFixed(1)}k`}
            descriptor="estimated total value"
            accent={accent}
          />
        );

      case 'pipeCount':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Pipe Collection"
            value={card.data.count}
            descriptor={`pipe${card.data.count !== 1 ? 's' : ''}`}
            accent={accent}
          />
        );

      case 'cellarSize':
        return (
          <StoryCardLayout
            icon={Icon}
            title="Tobacco Cellar"
            value={card.data.count}
            descriptor={`blend${card.data.count !== 1 ? 's' : ''}`}
            accent={accent}
          />
        );

      case 'journey':
        const journeyText = `You've logged ${card.data.sessions} sessions, collected ${card.data.pipes} pipes, and curated ${card.data.blends} blends. Your collector's journey continues.`;
        return (
          <JourneyCardLayout
            title="Your Collector's Journey"
            message={journeyText}
            accent={accent}
          />
        );

      case 'milestone':
        return (
          <MilestoneCardLayout
            title={card.data.title}
            message={card.data.message}
            emoji={card.data.emoji}
            accent={accent}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center p-6 rounded-2xl relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 30% 20%, rgba(180,140,75,0.1), transparent 40%), 
                     radial-gradient(circle at 80% 70%, rgba(100,70,45,0.08), transparent 50%), 
                     linear-gradient(135deg, rgba(50,35,25,0.7), rgba(30,20,15,0.9))`,
        border: `2px solid ${accent}30`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 ${accent}15`,
        aspectRatio: '9 / 16'
      }}
    >
      {/* Progress indicator */}
      <div
        className="absolute top-6 right-6 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: `${accent}20`,
          color: accent,
          border: `1px solid ${accent}40`
        }}
      >
        {card.index} / {card.total}
      </div>

      {/* Card content */}
      <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
        {renderCardContent()}
      </div>

      {/* Decorative elements */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 rounded-full opacity-10"
        style={{
          background: accent,
          filter: 'blur(40px)'
        }}
      />
      <div
        className="absolute top-1/2 left-0 w-48 h-48 rounded-full opacity-10"
        style={{
          background: accent,
          filter: 'blur(60px)'
        }}
      />
    </div>
  );
}

function StoryCardLayout({ icon: Icon, title, value, descriptor, accent }) {
  return (
    <>
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `${accent}20`,
          border: `2px solid ${accent}40`
        }}
      >
        <Icon className="w-8 h-8" style={{ color: accent }} />
      </div>

      <div className="text-center space-y-3 px-6">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {title}
        </p>

        <h2
           className="font-bold leading-tight break-words max-w-full overflow-hidden"
           style={{ 
             fontSize: value && String(value).length > 20 ? 'clamp(2rem, 9vw, 3.5rem)' : 'clamp(2.5rem, 10vw, 5rem)',
             color: '#E0D8C8',
             wordBreak: 'break-word',
             overflowWrap: 'break-word',
             hyphens: 'none',
             paddingX: '1rem',
           }}
         >
           {value}
         </h2>

        <p
          className="text-sm px-2"
          style={{ color: 'rgba(224,216,200,0.7)' }}
        >
          {descriptor}
        </p>
      </div>
    </>
  );
}

function JourneyCardLayout({ title, message, accent }) {
  return (
    <>
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `${accent}20`,
          border: `2px solid ${accent}40`
        }}
      >
        <BookOpen className="w-8 h-8" style={{ color: accent }} />
      </div>

      <div className="text-center space-y-4 px-6 max-w-md">
        <h2
          className="text-3xl font-bold break-words"
          style={{ 
            color: '#E0D8C8',
            wordBreak: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          {title}
        </h2>

        <p
          className="text-base leading-relaxed break-words"
          style={{ 
            color: 'rgba(224,216,200,0.8)',
            wordBreak: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          {message}
        </p>
      </div>
    </>
  );
}

function MilestoneCardLayout({ title, message, emoji, accent }) {
  return (
    <>
      <div className="text-6xl mb-6">{emoji}</div>

      <div className="text-center space-y-4 px-6 max-w-md">
        <h2
          className="text-3xl font-bold break-words"
          style={{ 
            color: accent,
            wordBreak: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          {title}
        </h2>

        <p
          className="text-lg leading-relaxed break-words"
          style={{ 
            color: 'rgba(224,216,200,0.85)',
            wordBreak: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          {message}
        </p>
      </div>
    </>
  );
}