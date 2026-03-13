import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Leaf, BookOpen, TrendingUp, Database, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PipeKeeper() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();

  // Module navigation items
  const moduleNavigation = [
    { name: 'Pipes', path: '/Pipes', icon: Wind, label: t('nav.pipes') || 'Pipes' },
    { name: 'Tobacco', path: '/Tobacco', icon: Leaf, label: t('nav.tobacco') || 'Tobacco' },
    { name: 'Sessions', path: '/Sessions', icon: BookOpen, label: t('nav.sessions') || 'Sessions' },
    { name: 'Insights', path: '/Insights', icon: TrendingUp, label: t('nav.insights') || 'Insights' },
    { name: 'Cellar', path: '/Cellar', icon: Database, label: t('nav.cellar') || 'Cellar' },
  ];

  // Check if we're viewing a submodule
  const isViewingSubmodule = moduleNavigation.some(item => location.pathname === item.path);

  if (isViewingSubmodule) {
    // Render submodule navigation as a secondary nav
    return (
      <div className="space-y-6">
        {/* Module Header */}
        <div className="relative pb-4 border-b border-[#8b6239]/30">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
                    border: '1px solid rgba(120, 90, 65, 0.45)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)',
                  }}
                >
                  <Wind
                    className="w-5 h-5"
                    style={{
                      color: 'rgba(180, 140, 75, 1)',
                      filter: 'drop-shadow(0 0 4px rgba(180,140,75,0.7))',
                    }}
                  />
                </div>

                <h1
                  className="text-4xl font-bold tracking-tight"
                  style={{
                    color: '#F5F1E7',
                    fontFamily: "'Georgia', serif",
                    textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                  }}
                >
                  PipeKeeper
                </h1>
              </div>

              <p
                className="text-base pl-14"
                style={{ color: 'rgba(224, 216, 200, 0.75)' }}
              >
                Manage your pipes, tobacco, and smoking sessions
              </p>
            </div>

            <Button
              onClick={() => navigate('/CollectionHub')}
              variant="outline"
              className="text-sm"
            >
              Back to Hub
            </Button>
          </div>

          {/* Module Navigation */}
          <div className="flex flex-wrap gap-2 mt-4">
            {moduleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-[#A35C5C] text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Submodule content is rendered by the app routing */}
        <div className="text-center py-12">
          <p className="text-[#E0D8C8]/60">Submodule content renders here</p>
        </div>
      </div>
    );
  }

  // Main PipeKeeper dashboard
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
                  border: '1px solid rgba(120, 90, 65, 0.45)',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)',
                }}
              >
                <Wind
                  className="w-5 h-5"
                  style={{
                    color: 'rgba(180, 140, 75, 1)',
                    filter: 'drop-shadow(0 0 4px rgba(180,140,75,0.7))',
                  }}
                />
              </div>

              <h1
                className="text-4xl font-bold tracking-tight"
                style={{
                  color: '#F5F1E7',
                  fontFamily: "'Georgia', serif",
                  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                }}
              >
                PipeKeeper
              </h1>
            </div>

            <p
              className="text-base pl-14"
              style={{ color: 'rgba(224, 216, 200, 0.75)' }}
            >
              Organize and explore your pipe and tobacco collection
            </p>
          </div>

          <Button
            onClick={() => navigate('/CollectionHub')}
            variant="outline"
            className="text-sm"
          >
            Back to Hub
          </Button>
        </div>
      </div>

      {/* Module Navigation Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#E0D8C8]">Explore</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="p-6 rounded-2xl text-left transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
                  border: '1px solid rgba(180, 140, 75, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(212, 165, 116, 0.15)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#D4A574' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#E0D8C8]">{item.label}</h3>
                </div>
                <p className="text-sm text-[#E0D8C8]/60">
                  Manage your {item.label.toLowerCase()} collection
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
          border: '1px solid rgba(180, 140, 75, 0.15)',
        }}
      >
        <h3 className="text-lg font-semibold text-[#E0D8C8] mb-4">Module Overview</h3>
        <p className="text-[#E0D8C8]/70">Select a section above to explore your pipes, tobacco, sessions, and more.</p>
      </div>
    </div>
  );
}