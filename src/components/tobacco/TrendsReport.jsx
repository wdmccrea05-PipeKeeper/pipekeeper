import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Calendar, Clock, Flame, Award, RefreshCw,
  Download, Share2, ChevronRight, Sparkles, Star
} from "lucide-react";
import { format, subDays, startOfYear, subMonths, isWithinInterval, parseISO } from "date-fns";
import html2canvas from 'html2canvas';
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

const TIME_WINDOWS = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  'ytd': { label: 'Year-to-Date', ytd: true },
  '12m': { label: 'Last 12 Months', months: 12 },
  'all': { label: 'All-Time', all: true }
};

export default function TrendsReport({ logs, pipes, blends, user }) {
  const { t } = useTranslation();
  const [timeWindow, setTimeWindow] = useState('30d');
  const [shareImageRef, setShareImageRef] = useState(null);

  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const now = new Date();
    const window = TIME_WINDOWS[timeWindow];

    return logs.filter(log => {
      try {
        const logDate = parseISO(log.date);
        
        if (window.all) return true;
        if (window.ytd) return isWithinInterval(logDate, { start: startOfYear(now), end: now });
        if (window.months) return isWithinInterval(logDate, { start: subMonths(now, window.months), end: now });
        if (window.days) return isWithinInterval(logDate, { start: subDays(now, window.days), end: now });
        
        return true;
      } catch {
        return false;
      }
    });
  }, [logs, timeWindow]);

  const previousPeriodLogs = useMemo(() => {
    if (!logs || logs.length === 0 || timeWindow === 'all') return [];

    const now = new Date();
    const window = TIME_WINDOWS[timeWindow];
    
    if (window.days) {
      const periodStart = subDays(now, window.days);
      const prevStart = subDays(periodStart, window.days);
      return logs.filter(log => {
        try {
          const logDate = parseISO(log.date);
          return isWithinInterval(logDate, { start: prevStart, end: periodStart });
        } catch {
          return false;
        }
      });
    }
    
    return [];
  }, [logs, timeWindow]);

  const topPipes = useMemo(() => {
    const pipeUsage = {};
    
    filteredLogs.forEach(log => {
      const pipeId = log.pipe_id;
      if (!pipeUsage[pipeId]) {
        pipeUsage[pipeId] = {
          pipe_id: pipeId,
          pipe_name: log.pipe_name,
          count: 0,
          bowls: 0,
          lastUsed: log.date
        };
      }
      pipeUsage[pipeId].count += 1;
      pipeUsage[pipeId].bowls += log.bowls_smoked || 1;
      if (new Date(log.date) > new Date(pipeUsage[pipeId].lastUsed)) {
        pipeUsage[pipeId].lastUsed = log.date;
      }
    });

    const total = filteredLogs.length;
    return Object.values(pipeUsage)
      .map(p => ({ ...p, percentage: total > 0 ? (p.count / total * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredLogs]);

  const topBlends = useMemo(() => {
    const blendUsage = {};
    
    filteredLogs.forEach(log => {
      const blendId = log.blend_id;
      if (!blendUsage[blendId]) {
        blendUsage[blendId] = {
          blend_id: blendId,
          blend_name: log.blend_name,
          count: 0,
          bowls: 0,
          lastUsed: log.date
        };
      }
      blendUsage[blendId].count += 1;
      blendUsage[blendId].bowls += log.bowls_smoked || 1;
      if (new Date(log.date) > new Date(blendUsage[blendId].lastUsed)) {
        blendUsage[blendId].lastUsed = log.date;
      }
    });

    const total = filteredLogs.length;
    return Object.values(blendUsage)
      .map(b => ({ ...b, percentage: total > 0 ? (b.count / total * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredLogs]);

  const frequencyStats = useMemo(() => {
    const totalSessions = filteredLogs.length;
    const prevTotalSessions = previousPeriodLogs.length;
    const trend = prevTotalSessions > 0 
      ? ((totalSessions - prevTotalSessions) / prevTotalSessions * 100)
      : 0;

    const dayOfWeek = {};
    const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    
    filteredLogs.forEach(log => {
      try {
        const date = parseISO(log.date);
        const day = format(date, 'EEEE');
        dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;

        const hour = date.getHours();
        if (hour >= 5 && hour < 12) timeOfDay.morning++;
        else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
        else if (hour >= 17 && hour < 21) timeOfDay.evening++;
        else timeOfDay.night++;
      } catch {}
    });

    const mostCommonDay = Object.entries(dayOfWeek)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    const mostCommonTime = Object.entries(timeOfDay)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    const window = TIME_WINDOWS[timeWindow];
    const daysInPeriod = window.all 
      ? Math.max(1, Math.ceil((Date.now() - new Date(Math.min(...logs.map(l => new Date(l.date)))).getTime()) / (1000 * 60 * 60 * 24)))
      : window.days || 30;
    
    const sessionsPerWeek = (totalSessions / daysInPeriod) * 7;

    return {
      totalSessions,
      trend,
      sessionsPerWeek,
      mostCommonDay,
      mostCommonTime: mostCommonTime.charAt(0).toUpperCase() + mostCommonTime.slice(1)
    };
  }, [filteredLogs, previousPeriodLogs, timeWindow, logs]);

  const tasteProfile = useMemo(() => {
    const blendCategories = {};
    const cutTypes = {};
    const strengthLevels = {};

    filteredLogs.forEach(log => {
      const blend = blends.find(b => b.id === log.blend_id);
      if (!blend) return;

      if (blend.blend_type) {
        blendCategories[blend.blend_type] = (blendCategories[blend.blend_type] || 0) + 1;
      }
      if (blend.cut) {
        cutTypes[blend.cut] = (cutTypes[blend.cut] || 0) + 1;
      }
      if (blend.strength) {
        strengthLevels[blend.strength] = (strengthLevels[blend.strength] || 0) + 1;
      }
    });

    return {
      categories: Object.entries(blendCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      cuts: Object.entries(cutTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      strengths: Object.entries(strengthLevels)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    };
  }, [filteredLogs, blends]);

  const geometryInsights = useMemo(() => {
    const usedPipeIds = new Set(filteredLogs.map(l => l.pipe_id));
    const usedPipes = pipes.filter(p => usedPipeIds.has(p.id));

    const shapes = {};
    const bowlStyles = {};
    const shankShapes = {};
    const bends = {};
    const sizeClasses = {};

    usedPipes.forEach(pipe => {
      if (pipe.shape) shapes[pipe.shape] = (shapes[pipe.shape] || 0) + 1;
      if (pipe.bowlStyle) bowlStyles[pipe.bowlStyle] = (bowlStyles[pipe.bowlStyle] || 0) + 1;
      if (pipe.shankShape) shankShapes[pipe.shankShape] = (shankShapes[pipe.shankShape] || 0) + 1;
      if (pipe.bend) bends[pipe.bend] = (bends[pipe.bend] || 0) + 1;
      if (pipe.sizeClass) sizeClasses[pipe.sizeClass] = (sizeClasses[pipe.sizeClass] || 0) + 1;
    });

    const topShape = Object.entries(shapes).sort(([, a], [, b]) => b - a)[0];
    const topBowlStyle = Object.entries(bowlStyles).sort(([, a], [, b]) => b - a)[0];
    const topShankShape = Object.entries(shankShapes).sort(([, a], [, b]) => b - a)[0];

    const goToCombo = [topShape?.[0], topBowlStyle?.[0], topShankShape?.[0]]
      .filter(Boolean)
      .join(' + ') || 'N/A';

    return {
      shapes: Object.entries(shapes).sort(([, a], [, b]) => b - a).slice(0, 5),
      bowlStyles: Object.entries(bowlStyles).sort(([, a], [, b]) => b - a).slice(0, 5),
      bends: Object.entries(bends).sort(([, a], [, b]) => b - a).slice(0, 3),
      sizeClasses: Object.entries(sizeClasses).sort(([, a], [, b]) => b - a).slice(0, 3),
      goToCombo
    };
  }, [filteredLogs, pipes]);

  const discoveries = useMemo(() => {
    const allLogs = logs || [];
    const windowStart = (() => {
      const now = new Date();
      const window = TIME_WINDOWS[timeWindow];
      if (window.all) return new Date(0);
      if (window.ytd) return startOfYear(now);
      if (window.months) return subMonths(now, window.months);
      if (window.days) return subDays(now, window.days);
      return new Date(0);
    })();

    const firstTimeUsed = {};
    allLogs.forEach(log => {
      const pipeKey = `pipe_${log.pipe_id}`;
      const blendKey = `blend_${log.blend_id}`;
      const logDate = parseISO(log.date);

      if (!firstTimeUsed[pipeKey] || logDate < firstTimeUsed[pipeKey]) {
        firstTimeUsed[pipeKey] = logDate;
      }
      if (!firstTimeUsed[blendKey] || logDate < firstTimeUsed[blendKey]) {
        firstTimeUsed[blendKey] = logDate;
      }
    });

    const newThisPeriod = [];
    Object.entries(firstTimeUsed).forEach(([key, date]) => {
      if (isWithinInterval(date, { start: windowStart, end: new Date() })) {
        if (key.startsWith('pipe_')) {
          const pipe = pipes.find(p => p.id === key.replace('pipe_', ''));
          if (pipe) newThisPeriod.push({ type: 'pipe', name: pipe.name, date });
        } else {
          const blend = blends.find(b => b.id === key.replace('blend_', ''));
          if (blend) newThisPeriod.push({ type: 'blend', name: blend.name, date });
        }
      }
    });

    return {
      newThisPeriod: newThisPeriod.slice(0, 10)
    };
  }, [logs, pipes, blends, timeWindow]);

  const narrative = useMemo(() => {
    const sessions = frequencyStats.totalSessions;
    const topPipe = topPipes[0];
    const topCategory = tasteProfile.categories[0];
    const topShape = geometryInsights.shapes[0];

    if (sessions === 0) return t("trends.noSessionsLogged","No sessions logged for this period.");

    const parts = [];
    parts.push(t("trends.youLogged","You logged {{count}} session{{count, plural, one {} other {s}}} this period.",{count: sessions}));
    
    if (topPipe) {
      parts.push(t("trends.topPipe","Your #1 pipe was {{name}} ({{count}} session{{count, plural, one {} other {s}}}).",{name: topPipe.pipe_name, count: topPipe.count}));
    }
    
    if (topCategory) {
      parts.push(t("trends.leanedHeavily","You leaned heavily {{category}}.",{category: topCategory[0]}));
    }
    
    if (topShape) {
      parts.push(t("trends.goToShape","Your go-to shape was {{shape}}.",{shape: topShape[0]}));
    }

    return parts.join(' ');
  }, [frequencyStats, topPipes, tasteProfile, geometryInsights, t]);

  const handleShare = async () => {
    if (!shareImageRef) return;

    try {
      const canvas = await html2canvas(shareImageRef, {
        backgroundColor: '#1a2c42',
        scale: 2
      });
      
      canvas.toBlob(blob => {
        if (!blob) {
          toast.error(t("trends.failedToGenerateImage","Failed to generate image"));
          return;
        }

        if (navigator.share && navigator.canShare({ files: [new File([blob], 'trends.png', { type: 'image/png' })] })) {
          navigator.share({
            files: [new File([blob], 'trends.png', { type: 'image/png' })],
            title: t("trends.myPipeKeeperTrends","My PipeKeeper Trends"),
            text: narrative
          }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pipekeeper-trends.png';
          a.click();
          URL.revokeObjectURL(url);
          toast.success(t("trends.imageDownloaded","Image downloaded"));
        }
      });
    } catch (err) {
      console.error('Share error:', err);
      toast.error(t("trends.failedToShare","Failed to share"));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text(t("trends.pdfTitle","PipeKeeper Trends Report"), 20, 20);
      
      doc.setFontSize(12);
      doc.text(`${t("trends.period","Period")}: ${TIME_WINDOWS[timeWindow].label}`, 20, 30);
      doc.text(`${t("reports.generated","Generated")}: ${format(new Date(), 'MMM d, yyyy')}`, 20, 37);

      doc.setFontSize(14);
      doc.text(t("trends.summary","Summary"), 20, 50);
      doc.setFontSize(10);
      const narrativeLines = doc.splitTextToSize(narrative, 170);
      doc.text(narrativeLines, 20, 57);

      let yPos = 57 + (narrativeLines.length * 5) + 10;

      if (topPipes.length > 0) {
        doc.setFontSize(14);
        doc.text(t("trends.topPipes","Top Pipes"), 20, yPos);
        yPos += 7;
        doc.setFontSize(9);
        topPipes.slice(0, 5).forEach(pipe => {
          doc.text(`${pipe.pipe_name}: ${pipe.count} ${t("nav.sessions","sessions")} (${pipe.percentage.toFixed(1)}%)`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      if (topBlends.length > 0 && yPos < 270) {
        doc.setFontSize(14);
        doc.text(t("trends.topBlends","Top Blends"), 20, yPos);
        yPos += 7;
        doc.setFontSize(9);
        topBlends.slice(0, 5).forEach(blend => {
          if (yPos > 270) return;
          doc.text(`${blend.blend_name}: ${blend.count} ${t("nav.sessions","sessions")} (${blend.percentage.toFixed(1)}%)`, 25, yPos);
          yPos += 5;
        });
      }

      doc.save('pipekeeper-trends.pdf');
      toast.success(t("trends.pdfDownloaded","PDF downloaded"));
    } catch (err) {
      console.error('PDF error:', err);
      toast.error(t("trends.failedToGeneratePDF","Failed to generate PDF"));
    }
  };

  if (filteredLogs.length === 0) {
    return (
      <Card className="border-blue-200">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-blue-300" />
          <h3 className="text-xl font-semibold text-[#E0D8C8] mb-2">{t("trends.noSessionsLoggedTitle","No Sessions Logged")}</h3>
          <p className="text-[#E0D8C8]/60 mb-6">
            {t("trends.noSessionsForPeriod","No smoking sessions found for this time period.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setTimeWindow('all')} variant="outline">
              {t("trends.viewAllTime","View All-Time")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Window Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-[#E0D8C8] flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          {t("trends.yourTrends","Your Trends")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIME_WINDOWS).map(([key, { label }]) => (
            <Button
              key={key}
              size="sm"
              variant={timeWindow === key ? 'default' : 'outline'}
              onClick={() => setTimeWindow(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Shareable Summary Card */}
      <Card ref={setShareImageRef} className="border-amber-300/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#E0D8C8] mb-2">
                {TIME_WINDOWS[timeWindow].label}
              </h3>
              <p className="text-[#E0D8C8]/80 leading-relaxed">
                {narrative}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              {t("common.share")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              {t("trends.downloadPDF","Download PDF")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("trends.overview","Overview")}</TabsTrigger>
          <TabsTrigger value="usage">{t("trends.usage","Usage")}</TabsTrigger>
          <TabsTrigger value="taste">{t("trends.taste","Taste")}</TabsTrigger>
          <TabsTrigger value="geometry">{t("trends.geometry","Geometry")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("trends.frequencyPatterns","Frequency & Patterns")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.totalSessions","Total Sessions")}</p>
                  <p className="text-3xl font-bold text-[#E0D8C8]">{frequencyStats.totalSessions}</p>
                  {frequencyStats.trend !== 0 && (
                    <Badge className={`mt-2 ${frequencyStats.trend > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                      {frequencyStats.trend > 0 ? '+' : ''}{frequencyStats.trend.toFixed(1)}% {t("trends.vsPrevPeriod","vs prev period")}
                    </Badge>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.perWeek","Per Week")}</p>
                  <p className="text-3xl font-bold text-[#E0D8C8]">{frequencyStats.sessionsPerWeek.toFixed(1)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.mostCommonDay","Most Common Day")}</p>
                  <p className="text-xl font-semibold text-[#E0D8C8]">{frequencyStats.mostCommonDay}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.mostCommonTime","Most Common Time")}</p>
                  <p className="text-xl font-semibold text-[#E0D8C8]">{frequencyStats.mostCommonTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {discoveries.newThisPeriod.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t("trends.newDiscoveries","New Discoveries")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {discoveries.newThisPeriod.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{item.type}</Badge>
                        <span className="text-[#E0D8C8]">{item.name}</span>
                      </div>
                      <span className="text-sm text-[#E0D8C8]/60">
                        {format(item.date, 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("trends.topPipes","Top Pipes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPipes.map((pipe, idx) => (
                  <div key={pipe.pipe_id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {idx < 3 && <Award className={`w-5 h-5 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : 'text-amber-600'}`} />}
                        <span className="font-medium text-[#E0D8C8]">{pipe.pipe_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#E0D8C8]">{pipe.count}</span>
                        <span className="text-sm text-[#E0D8C8]/60 ml-2">({pipe.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#E0D8C8]/60">
                      <span>{pipe.bowls} {t("units.bowl","bowl")}{pipe.bowls > 1 ? t("units.bowlPlural","s") : ''}</span>
                      <span>{t("trends.lastUsed","Last used")}: {format(parseISO(pipe.lastUsed), 'MMM d')}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full"
                        style={{ width: `${pipe.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("trends.topBlends","Top Blends")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBlends.map((blend, idx) => (
                  <div key={blend.blend_id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {idx < 3 && <Award className={`w-5 h-5 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : 'text-amber-600'}`} />}
                        <span className="font-medium text-[#E0D8C8]">{blend.blend_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#E0D8C8]">{blend.count}</span>
                        <span className="text-sm text-[#E0D8C8]/60 ml-2">({blend.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#E0D8C8]/60">
                      <span>{blend.bowls} {t("units.bowl","bowl")}{blend.bowls > 1 ? t("units.bowlPlural","s") : ''}</span>
                      <span>{t("trends.lastUsed","Last used")}: {format(parseISO(blend.lastUsed), 'MMM d')}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                        style={{ width: `${blend.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Taste Profile Tab */}
        <TabsContent value="taste" className="space-y-4">
          {tasteProfile.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.blendCategories","Blend Categories")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasteProfile.categories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-[#E0D8C8]">{category}</span>
                      <Badge>{count} {t("nav.sessions","sessions")}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tasteProfile.cuts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.cutTypes","Cut Types")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasteProfile.cuts.map(([cut, count]) => (
                    <div key={cut} className="flex items-center justify-between">
                      <span className="text-[#E0D8C8]">{cut}</span>
                      <Badge>{count} {t("nav.sessions","sessions")}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {tasteProfile.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.strengthPreference","Strength Preference")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasteProfile.strengths.map(([strength, count]) => (
                    <div key={strength} className="flex items-center justify-between">
                      <span className="text-[#E0D8C8]">{strength}</span>
                      <Badge>{count} {t("nav.sessions","sessions")}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Geometry Tab */}
        <TabsContent value="geometry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("trends.yourGoToGeometry","Your Go-To Geometry")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-600/30">
                <p className="text-xl font-semibold text-amber-300 text-center">
                  {geometryInsights.goToCombo}
                </p>
              </div>
            </CardContent>
          </Card>

          {geometryInsights.shapes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.topShapes","Top Shapes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {geometryInsights.shapes.map(([shape, count]) => (
                    <div key={shape} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <span className="text-[#E0D8C8]">{shape}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {geometryInsights.bowlStyles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.topBowlStyles","Top Bowl Styles")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {geometryInsights.bowlStyles.map(([style, count]) => (
                    <div key={style} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <span className="text-[#E0D8C8]">{style}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {geometryInsights.bends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("trends.bendDistribution","Bend Distribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {geometryInsights.bends.map(([bend, count]) => (
                    <div key={bend} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <span className="text-[#E0D8C8]">{bend}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}