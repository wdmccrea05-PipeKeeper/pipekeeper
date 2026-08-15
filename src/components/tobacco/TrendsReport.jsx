import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Calendar, Award,
  Download, Share2, Sparkles
} from "lucide-react";
import { format, subDays, startOfYear, subMonths, isWithinInterval, parseISO, differenceInCalendarDays } from "date-fns";
import { getBowlsUsed } from "@/components/utils/schemaCompatibility";
import html2canvas from 'html2canvas';
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

// Labels resolved at render time via t() — see getTimeWindowLabel()
const TIME_WINDOWS = {
  '7d': { labelKey: 'trends.last7Days', days: 7 },
  '30d': { labelKey: 'trends.last30Days', days: 30 },
  '90d': { labelKey: 'trends.last90Days', days: 90 },
  'ytd': { labelKey: 'trends.yearToDate', ytd: true },
  '12m': { labelKey: 'trends.last12Months', months: 12 },
  'all': { labelKey: 'trends.allTime', all: true }
};

export default function TrendsReport({ logs, pipes, blends, user }) {
  const { t } = useTranslation();
  const [timeWindow, setTimeWindow] = useState('30d');

  const getTimeWindowLabel = (key) => {
    const defaults = {
      '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days',
      'ytd': 'Year-to-Date', '12m': 'Last 12 Months', 'all': 'All-Time'
    };
    return t(TIME_WINDOWS[key]?.labelKey, { defaultValue: defaults[key] || key });
  };
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
      pipeUsage[pipeId].bowls += getBowlsUsed(log);
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
      blendUsage[blendId].bowls += getBowlsUsed(log);
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
    const timeOfDay = {
      [t("trends.morning")]: 0,
      [t("trends.afternoon")]: 0,
      [t("trends.evening")]: 0,
      [t("trends.night")]: 0,
    };
    const timeKeys = Object.keys(timeOfDay);
    
    filteredLogs.forEach(log => {
      try {
        const date = parseISO(log.date);
        const day = format(date, 'EEEE');
        dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;

        const hour = date.getHours();
        if (hour >= 5 && hour < 12) timeOfDay[timeKeys[0]]++;
        else if (hour >= 12 && hour < 17) timeOfDay[timeKeys[1]]++;
        else if (hour >= 17 && hour < 21) timeOfDay[timeKeys[2]]++;
        else timeOfDay[timeKeys[3]]++;
      } catch {}
    });

    const mostCommonDay = Object.entries(dayOfWeek)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    const mostCommonTime = Object.entries(timeOfDay)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || t('trends.nA');

    const window = TIME_WINDOWS[timeWindow];
    let daysInPeriod;
    if (window.all) {
      const timestamps = logs.map(l => new Date(l.date).getTime()).filter(t => !isNaN(t));
      daysInPeriod = timestamps.length > 0
        ? Math.max(1, Math.ceil((Date.now() - Math.min(...timestamps)) / (1000 * 60 * 60 * 24)))
        : 1;
    } else if (window.days) {
      daysInPeriod = window.days;
    } else if (window.months) {
      daysInPeriod = window.months * 30;
    } else if (window.ytd) {
      daysInPeriod = differenceInCalendarDays(new Date(), startOfYear(new Date())) + 1;
    } else {
      daysInPeriod = 30;
    }
    
    const sessionsPerWeek = (totalSessions / daysInPeriod) * 7;

    return {
      totalSessions,
      trend,
      sessionsPerWeek,
      mostCommonDay,
      mostCommonTime
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
      .join(' + ') || t('trends.nA');

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

    if (sessions === 0) return t("trends.noSessionsLogged");

    const parts = [];
    const sessionWord = sessions === 1 ? t("trends.session") : t("trends.sessions");
    parts.push(t("trends.youLoggedCount", {count: sessions}) || `You logged ${sessions} sessions`);
    
    if (topPipe) {
      parts.push(t("trends.topPipeName", {name: topPipe.pipe_name}) || `Top pipe: ${topPipe.pipe_name}`);
    }
    
    if (topCategory) {
      parts.push(t("trends.leanedHeavily", {type: topCategory[0]}) || `You leaned heavily toward ${topCategory[0]}`);
    }
    
    if (topShape) {
      parts.push(t("trends.goToShape", {shape: topShape[0]}) || `Your go-to shape was ${topShape[0]}`);
    }

    return parts.join(' ');
  }, [frequencyStats, topPipes, tasteProfile, geometryInsights, t]);

  const handleShare = async () => {
    if (!shareImageRef) return;

    try {
      const canvas = await html2canvas(shareImageRef, {
        backgroundColor: '#0f0b08',
        scale: 2
      });
      
      canvas.toBlob(blob => {
        if (!blob) {
          toast.error(t("trends.failedToGenerateImage"));
          return;
        }

        if (navigator.share && navigator.canShare({ files: [new File([blob], 'trends.png', { type: 'image/png' })] })) {
          navigator.share({
            files: [new File([blob], 'trends.png', { type: 'image/png' })],
            title: t("trends.myPipeKeeperTrends"),
            text: narrative
          }).catch(() => {}); // PK_SAFE_FALLBACK: Web Share API rejection — user cancelled the share sheet; not a data error.
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pipekeeper-trends.png';
          a.click();
          URL.revokeObjectURL(url);
          toast.success(t("trends.imageDownloaded"));
        }
      });
    } catch (err) {
      console.error('Share error:', err);
      toast.error(t("trends.failedToShare"));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text(t("trends.pdfTitle"), 20, 20);
      
      doc.setFontSize(12);
      doc.text(`${t("trends.period")}: ${getTimeWindowLabel(timeWindow)}`, 20, 30);
      doc.text(`${t("reports.generated")}: ${format(new Date(), 'MMM d, yyyy')}`, 20, 37);

      doc.setFontSize(14);
      doc.text(t("trends.summary"), 20, 50);
      doc.setFontSize(10);
      const narrativeLines = doc.splitTextToSize(narrative, 170);
      doc.text(narrativeLines, 20, 57);

      let yPos = 57 + (narrativeLines.length * 5) + 10;

      if (topPipes.length > 0) {
        doc.setFontSize(14);
        doc.text(t("trends.topPipes"), 20, yPos);
        yPos += 7;
        doc.setFontSize(9);
        topPipes.slice(0, 5).forEach(pipe => {
          doc.text(`${pipe.pipe_name}: ${pipe.count} ${t("trends.sessions")} (${pipe.percentage.toFixed(1)}%)`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      if (topBlends.length > 0 && yPos < 270) {
        doc.setFontSize(14);
        doc.text(t("trends.topBlends"), 20, yPos);
        yPos += 7;
        doc.setFontSize(9);
        topBlends.slice(0, 5).forEach(blend => {
          if (yPos > 270) return;
          doc.text(`${blend.blend_name}: ${blend.count} ${t("trends.sessions")} (${blend.percentage.toFixed(1)}%)`, 25, yPos);
          yPos += 5;
        });
      }

      doc.save('pipekeeper-trends.pdf');
      toast.success(t("trends.pdfDownloaded"));
    } catch (err) {
      console.error('PDF error:', err);
      toast.error(t("trends.failedToGeneratePDF"));
    }
  };

  if (filteredLogs.length === 0) {
    return (
      <Card className="border-[#8b6239]/30">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-[#8b6239]/60" />
          <h3 className="text-xl font-semibold text-[#E0D8C8] mb-2">{t("trends.noSessionsLoggedTitle")}</h3>
          <p className="text-[#E0D8C8]/60 mb-6">
            {t("trends.noSessionsForPeriod")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setTimeWindow('all')} variant="outline">
              {t("trends.viewAllTime")}
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
          {t("trends.yourTrends")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(TIME_WINDOWS).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={timeWindow === key ? 'default' : 'outline'}
              onClick={() => setTimeWindow(key)}
            >
              {getTimeWindowLabel(key)}
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
                {getTimeWindowLabel(timeWindow)}
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
              {t("trends.downloadPDF")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#3a2a20]/40 border border-[#8b6239]/25">
          <TabsTrigger value="overview" className="text-[#E0D8C8] data-[state=active]:text-[#F5F1E7] data-[state=active]:bg-[#8b6239]/30">{t("trends.overview")}</TabsTrigger>
          <TabsTrigger value="usage" className="text-[#E0D8C8] data-[state=active]:text-[#F5F1E7] data-[state=active]:bg-[#8b6239]/30">{t("trends.usage")}</TabsTrigger>
          <TabsTrigger value="taste" className="text-[#E0D8C8] data-[state=active]:text-[#F5F1E7] data-[state=active]:bg-[#8b6239]/30">{t("trends.taste")}</TabsTrigger>
          <TabsTrigger value="geometry" className="text-[#E0D8C8] data-[state=active]:text-[#F5F1E7] data-[state=active]:bg-[#8b6239]/30">{t("trends.geometry")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("trends.frequencyPatterns")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.totalSessions")}</p>
                  <p className="text-3xl font-bold text-[#E0D8C8]">{frequencyStats.totalSessions}</p>
                  {frequencyStats.trend !== 0 && (
                    <Badge className={`mt-2 ${frequencyStats.trend > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                      {frequencyStats.trend > 0 ? '+' : ''}{frequencyStats.trend.toFixed(1)}% {t("trends.vsPrevPeriod")}
                    </Badge>
                  )}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.perWeek")}</p>
                  <p className="text-3xl font-bold text-[#E0D8C8]">{frequencyStats.sessionsPerWeek.toFixed(1)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.mostCommonDay")}</p>
                  <p className="text-xl font-semibold text-[#E0D8C8]">{frequencyStats.mostCommonDay ? t(`enum.days.${frequencyStats.mostCommonDay.toLowerCase()}`, frequencyStats.mostCommonDay) : t('trends.nA')}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-[#E0D8C8]/60 mb-1">{t("trends.mostCommonTime")}</p>
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
                  {t("trends.newDiscoveries")}
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
              <CardTitle>{t("trends.topPipes")}</CardTitle>
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
                      <span>{pipe.bowls} {t("units.bowl")}{pipe.bowls > 1 ? t("units.bowlPlural") : ''}</span>
                      <span>{t("trends.lastUsed")}: {format(parseISO(pipe.lastUsed), 'MMM d')}</span>
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
              <CardTitle>{t("trends.topBlends")}</CardTitle>
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
                      <span>{blend.bowls} {t("units.bowl")}{blend.bowls > 1 ? t("units.bowlPlural") : ''}</span>
                      <span>{t("trends.lastUsed")}: {format(parseISO(blend.lastUsed), 'MMM d')}</span>
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
                <CardTitle>{t("trends.blendCategories")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasteProfile.categories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-[#E0D8C8]">{t(`blendTypes.${category}`, category)}</span>
                      <Badge>{count} {t("trends.sessions")}</Badge>
                      </div>
                      ))}
                      </div>
                      </CardContent>
                      </Card>
                      )}

                      {tasteProfile.cuts.length > 0 && (
                      <Card>
                      <CardHeader>
                      <CardTitle>{t("trends.cutTypes")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                      <div className="space-y-3">
                      {tasteProfile.cuts.map(([cut, count]) => (
                      <div key={cut} className="flex items-center justify-between">
                        <span className="text-[#E0D8C8]">{t(`cuts.${cut}`, cut)}</span>
                        <Badge>{count} {t("trends.sessions")}</Badge>
                      </div>
                      ))}
                      </div>
                      </CardContent>
                      </Card>
                      )}

                      {tasteProfile.strengths.length > 0 && (
                      <Card>
                      <CardHeader>
                      <CardTitle>{t("trends.strengthPreference")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                      <div className="space-y-3">
                      {tasteProfile.strengths.map(([strength, count]) => (
                      <div key={strength} className="flex items-center justify-between">
                        <span className="text-[#E0D8C8]">{t(`strengths.${strength}`, strength)}</span>
                        <Badge>{count} {t("trends.sessions")}</Badge>
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
              <CardTitle>{t("trends.yourGoToGeometry")}</CardTitle>
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
                <CardTitle>{t("trends.topShapes")}</CardTitle>
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
                <CardTitle>{t("trends.topBowlStyles")}</CardTitle>
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
                <CardTitle>{t("trends.bendDistribution")}</CardTitle>
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