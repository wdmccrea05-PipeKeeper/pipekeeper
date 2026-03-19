import React from 'react';
import { Leaf, TrendingUp, Package2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PipeIcon from '@/components/icons/PipeIcon';

function InsightCard({ icon, title, subtitle, accent = '#B48C4B', onClick }) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left"
      style={{
        background: 'rgba(42,31,24,0.55)',
        border: '1px solid rgba(180,140,75,0.16)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${accent}20`,
            border: `1px solid ${accent}35`,
          }}
        >
          {typeof Icon === 'function' ? (
            <Icon className="w-4 h-4" color={accent} />
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F5F1E7] break-words">{title}</p>
          <p className="text-sm text-[#D8C7A6]/78 break-words">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

export default function CollectionIntelligencePanel({
  insights = {},
  onOpenPipe,
  onOpenBlend,
  onOpenBottle,
}) {
  const navigate = useNavigate();

  const handlePipe = (id) => {
    if (onOpenPipe) return onOpenPipe(id);
    if (id) navigate(`/PipeDetail?id=${encodeURIComponent(id)}`);
  };

  const handleBlend = (id) => {
    if (onOpenBlend) return onOpenBlend(id);
    if (id) navigate(`/TobaccoDetail?id=${encodeURIComponent(id)}`);
  };

  const handleBottle = (id) => {
    if (onOpenBottle) return onOpenBottle(id);
    if (id) navigate(`/BottleDetail?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="space-y-3">
      {insights.unsmokedPipe ? (
        <InsightCard
          icon={PipeIcon}
          accent="#CFA56C"
          title={`${insights.unsmokedPipe.count} pipes haven't been smoked yet`}
          subtitle="Consider adding them to your rotation"
          onClick={() => handlePipe(insights.unsmokedPipe.id)}
        />
      ) : null}

      {insights.cellaredBlend ? (
        <InsightCard
          icon={Leaf}
          accent="#79B26A"
          title={`${insights.cellaredBlend.count} cellared blends with good aging potential`}
          subtitle={insights.cellaredBlend.name}
          onClick={() => handleBlend(insights.cellaredBlend.id)}
        />
      ) : null}

      {insights.topBlend ? (
        <InsightCard
          icon={TrendingUp}
          accent="#8FBD7B"
          title={`Your highest-rated blend: ${insights.topBlend.name}`}
          subtitle={insights.topBlend.subtitle || ''}
          onClick={() => handleBlend(insights.topBlend.id)}
        />
      ) : null}

      {insights.unopenedBottle ? (
        <InsightCard
          icon={Package2}
          accent="#85A96E"
          title={`${insights.unopenedBottle.count} unopened bottles in your collection`}
          subtitle={insights.unopenedBottle.name}
          onClick={() => handleBottle(insights.unopenedBottle.id)}
        />
      ) : null}
    </div>
  );
}
