/**
 * src/lib/cigars/humidorEnvironment.js
 *
 * Humidity and temperature documentation for humidors.
 *
 * The tolerance band is always the collector's own: explicit min/max fields win,
 * then a band around their target, then a neutral default. Nothing here tells a
 * collector to do anything — it only reports whether a reading sits inside the
 * band they chose.
 *
 * Pure functions only — no SDK access, no writes.
 */

export const DEFAULT_THRESHOLDS = Object.freeze({
  min_humidity_rh: 62,
  max_humidity_rh: 72,
  min_temp_f: 65,
  max_temp_f: 75,
});

export const READING_STATUS = Object.freeze({
  OK: 'ok',
  LOW: 'low',
  HIGH: 'high',
  MIXED: 'mixed',
  UNKNOWN: 'unknown',
});

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** The collector's tolerance band for one humidor. */
export function resolveThresholds(humidor = {}) {
  const targetRh = num(humidor?.target_humidity_rh);
  const targetTemp = num(humidor?.target_temp_f);
  return {
    min_humidity_rh:
      num(humidor?.min_humidity_rh) ?? (targetRh !== null ? round(targetRh - 5) : DEFAULT_THRESHOLDS.min_humidity_rh),
    max_humidity_rh:
      num(humidor?.max_humidity_rh) ?? (targetRh !== null ? round(targetRh + 5) : DEFAULT_THRESHOLDS.max_humidity_rh),
    min_temp_f:
      num(humidor?.min_temp_f) ?? (targetTemp !== null ? round(targetTemp - 3) : DEFAULT_THRESHOLDS.min_temp_f),
    max_temp_f:
      num(humidor?.max_temp_f) ?? (targetTemp !== null ? round(targetTemp + 3) : DEFAULT_THRESHOLDS.max_temp_f),
    target_humidity_rh: targetRh,
    target_temp_f: targetTemp,
    source: {
      humidity: num(humidor?.min_humidity_rh) !== null || num(humidor?.max_humidity_rh) !== null
        ? 'explicit'
        : targetRh !== null ? 'target_band' : 'default',
      temperature: num(humidor?.min_temp_f) !== null || num(humidor?.max_temp_f) !== null
        ? 'explicit'
        : targetTemp !== null ? 'target_band' : 'default',
    },
  };
}

function bandStatus(value, min, max) {
  if (value === null) return READING_STATUS.UNKNOWN;
  if (value < min) return READING_STATUS.LOW;
  if (value > max) return READING_STATUS.HIGH;
  return READING_STATUS.OK;
}

/** Where one reading sits relative to the collector's band. */
export function evaluateReading(reading = {}, humidor = {}) {
  const thresholds = resolveThresholds(humidor);
  const humidity = num(reading?.humidity_rh);
  const temperature = num(reading?.temperature_f);
  const humidityStatus = bandStatus(humidity, thresholds.min_humidity_rh, thresholds.max_humidity_rh);
  const temperatureStatus = bandStatus(temperature, thresholds.min_temp_f, thresholds.max_temp_f);

  const flags = [humidityStatus, temperatureStatus].filter((s) => s === READING_STATUS.LOW || s === READING_STATUS.HIGH);
  let status = READING_STATUS.OK;
  if (!flags.length && humidityStatus === READING_STATUS.UNKNOWN && temperatureStatus === READING_STATUS.UNKNOWN) {
    status = READING_STATUS.UNKNOWN;
  } else if (flags.length > 1) {
    status = READING_STATUS.MIXED;
  } else if (flags.length === 1) {
    status = flags[0];
  }

  const outOfRange = [];
  if (humidityStatus === READING_STATUS.LOW) outOfRange.push('humidity_low');
  if (humidityStatus === READING_STATUS.HIGH) outOfRange.push('humidity_high');
  if (temperatureStatus === READING_STATUS.LOW) outOfRange.push('temperature_low');
  if (temperatureStatus === READING_STATUS.HIGH) outOfRange.push('temperature_high');

  return { thresholds, humidity, temperature, humidityStatus, temperatureStatus, status, outOfRange };
}

/** Oldest first, ready for a chart. */
export function buildEnvironmentSeries(readings = [], humidor = {}) {
  const list = Array.isArray(readings) ? readings.filter(Boolean) : [];
  return [...list]
    .sort((a, b) => toTime(a?.recorded_at) - toTime(b?.recorded_at))
    .map((reading) => {
      const evaluated = evaluateReading(reading, humidor);
      return {
        id: reading?.id || null,
        recordedAt: reading?.recorded_at || null,
        timestamp: toTime(reading?.recorded_at),
        humidity_rh: evaluated.humidity,
        temperature_f: evaluated.temperature,
        status: evaluated.status,
        outOfRange: evaluated.outOfRange,
      };
    });
}

function trendOf(values) {
  const clean = values.filter((v) => v !== null);
  if (clean.length < 3) return 'unknown';
  const first = clean[0];
  const last = clean[clean.length - 1];
  const delta = last - first;
  if (Math.abs(delta) < 1) return 'stable';
  return delta > 0 ? 'rising' : 'falling';
}

/** Documented environmental summary for one humidor. */
export function summarizeEnvironment(readings = [], humidor = {}) {
  const series = buildEnvironmentSeries(readings, humidor);
  const thresholds = resolveThresholds(humidor);
  const humidityValues = series.map((p) => p.humidity_rh).filter((v) => v !== null);
  const temperatureValues = series.map((p) => p.temperature_f).filter((v) => v !== null);
  const latest = series.length ? series[series.length - 1] : null;
  const outOfRangeCount = series.filter(
    (p) => p.status === READING_STATUS.LOW || p.status === READING_STATUS.HIGH || p.status === READING_STATUS.MIXED
  ).length;

  return {
    readingCount: series.length,
    thresholds,
    latest,
    status: latest ? latest.status : READING_STATUS.UNKNOWN,
    outOfRangeCount,
    humidity: {
      average: humidityValues.length ? round(humidityValues.reduce((s, v) => s + v, 0) / humidityValues.length) : null,
      min: humidityValues.length ? round(Math.min(...humidityValues)) : null,
      max: humidityValues.length ? round(Math.max(...humidityValues)) : null,
      trend: trendOf(humidityValues),
    },
    temperature: {
      average: temperatureValues.length ? round(temperatureValues.reduce((s, v) => s + v, 0) / temperatureValues.length) : null,
      min: temperatureValues.length ? round(Math.min(...temperatureValues)) : null,
      max: temperatureValues.length ? round(Math.max(...temperatureValues)) : null,
      trend: trendOf(temperatureValues),
    },
    series,
  };
}

export function environmentStatusLabel(status) {
  switch (status) {
    case READING_STATUS.OK:
      return 'Inside your band';
    case READING_STATUS.LOW:
      return 'Below your band';
    case READING_STATUS.HIGH:
      return 'Above your band';
    case READING_STATUS.MIXED:
      return 'Humidity and temperature both outside your band';
    default:
      return 'No readings recorded';
  }
}

/**
 * Humidors whose latest reading sits outside the collector's own band.
 *
 * @param {object[]} humidors
 * @param {Record<string, object[]>} readingsByHumidor
 */
export function buildEnvironmentAlerts(humidors = [], readingsByHumidor = {}) {
  return (Array.isArray(humidors) ? humidors : [])
    .map((humidor) => {
      const readings = readingsByHumidor?.[humidor?.id] || [];
      const summary = summarizeEnvironment(readings, humidor);
      if (!summary.readingCount) return null;
      if (summary.status === READING_STATUS.OK) return null;
      return {
        humidorId: humidor.id,
        name: humidor.name || 'Humidor',
        status: summary.status,
        label: environmentStatusLabel(summary.status),
        readingCount: summary.readingCount,
        outOfRangeCount: summary.outOfRangeCount,
        latest: summary.latest,
        thresholds: summary.thresholds,
      };
    })
    .filter(Boolean);
}