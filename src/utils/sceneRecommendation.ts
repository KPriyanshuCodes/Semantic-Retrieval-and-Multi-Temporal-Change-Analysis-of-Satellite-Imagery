import { SatelliteScene } from '../types/index';

export interface RecommendationReason {
  headline: string;
  proximityExplanation: string;
  cloudExplanation: string;
  sensorConsistency: string;
  badgeText: string;
}

export interface RecommendationResult {
  status: 'valid' | 'missing_before' | 'missing_after' | 'insufficient_imagery' | 'no_scenes';
  errorMessage?: string;
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  beforeReason?: RecommendationReason;
  afterReason?: RecommendationReason;
  recommendedSensor?: 'Sentinel-2' | 'Landsat';
  requestedStart: string;
  requestedEnd: string;
  actualBeforeDate?: string;
  actualAfterDate?: string;
}

export interface SelectionValidation {
  valid: boolean;
  chronologyError?: string;
  aoiWarning?: string;
  sensorWarning?: string;
  qualityWarning?: string;
}

/**
 * Format date string into standard ISO 8601 format: YYYY-MM-DD
 * Examples:
 * 10 Jan 2020 -> 2020-01-10
 * 25 Jun 2022 -> 2022-06-25
 * 18 Sep 2026 -> 2026-09-18
 */
export function formatIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();

  // If already starts with YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // If 4-digit year like "2020"
  if (/^\d{4}$/.test(clean)) {
    return `${clean}-01-01`;
  }

  // Parse arbitrary date string (e.g. "10 Jan 2020", "25 Jun 2022", "18 Sep 2026")
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return clean.slice(0, 10);
}

// Consistently format all human-facing dates to ISO 8601 YYYY-MM-DD
export const formatReadableDate = formatIsoDate;

/**
 * Check if two bounding boxes intersect
 */
export function checkBboxIntersection(
  boxA?: [number, number, number, number] | null,
  boxB?: [number, number, number, number] | null
): boolean {
  if (!boxA || !boxB || boxA.length !== 4 || boxB.length !== 4) return true;
  const [minX1, minY1, maxX1, maxY1] = boxA;
  const [minX2, minY2, maxX2, maxY2] = boxB;
  return !(minX1 > maxX2 || maxX1 < minX2 || minY1 > maxY2 || maxY1 < minY2);
}

/**
 * Compute the intersection area ratio of a scene bbox over the target AOI bbox
 */
export function computeOverlapRatio(
  sceneBbox?: [number, number, number, number] | null,
  aoiBbox?: [number, number, number, number] | null
): number {
  if (!sceneBbox || !aoiBbox || sceneBbox.length !== 4 || aoiBbox.length !== 4) return 1.0;
  const minX = Math.max(sceneBbox[0], aoiBbox[0]);
  const minY = Math.max(sceneBbox[1], aoiBbox[1]);
  const maxX = Math.min(sceneBbox[2], aoiBbox[2]);
  const maxY = Math.min(sceneBbox[3], aoiBbox[3]);

  if (maxX <= minX || maxY <= minY) return 0;
  const intersectArea = (maxX - minX) * (maxY - minY);
  const aoiArea = (aoiBbox[2] - aoiBbox[0]) * (aoiBbox[3] - aoiBbox[1]);
  if (aoiArea <= 0) return 1.0;
  return Math.min(1.0, intersectArea / aoiArea);
}

/**
 * Helper to determine sensor family name
 */
export function getSensorFamily(scene: SatelliteScene): 'Sentinel-2' | 'Landsat' {
  const sat = (scene.satellite || '').toLowerCase();
  const col = (scene.collection || '').toLowerCase();
  if (col.includes('landsat') || sat.includes('landsat')) {
    return 'Landsat';
  }
  return 'Sentinel-2';
}

/**
 * Score a scene as a candidate BEFORE image.
 * Prefers the scene closest to requested START date.
 * Cloud cover serves as a discriminator for observations near that boundary,
 * but NEVER chooses a scene years away over a valid scene near the start date.
 */
function scoreBeforeCandidate(
  scene: SatelliteScene,
  reqStartMs: number,
  reqEndMs: number,
  aoiBbox?: [number, number, number, number]
): { score: number; daysFromStart: number } {
  const sceneMs = new Date(scene.acquisitionDate || scene.datetime).getTime();
  const daysFromStart = Math.abs((sceneMs - reqStartMs) / 86400000);

  // If scene is completely outside the requested analysis period, penalize heavily
  const isWithinPeriod = sceneMs >= reqStartMs - 86400000 * 30 && sceneMs <= reqEndMs;
  const periodPenalty = isWithinPeriod ? 0 : 5000;

  // Overlap penalty
  const overlap = aoiBbox ? computeOverlapRatio(scene.bbox, aoiBbox) : 1.0;
  const overlapPenalty = overlap >= 0.2 ? 0 : 2000 * (1 - overlap);

  // Proximity penalty: 15 points per 30 days away from start date
  const proximityPenalty = (daysFromStart / 30) * 15;

  // Cloud cover penalty: 1.2 points per 1% cloud
  const cloudPenalty = Math.max(0, scene.cloudCover) * 1.2;

  const score = 10000 - periodPenalty - overlapPenalty - proximityPenalty - cloudPenalty;
  return { score, daysFromStart };
}

/**
 * Score a scene as a candidate AFTER image.
 * Must be strictly chronologically AFTER the chosen Before image.
 * Prefers the scene closest to requested END date.
 */
function scoreAfterCandidate(
  scene: SatelliteScene,
  reqStartMs: number,
  reqEndMs: number,
  beforeSceneMs: number,
  aoiBbox?: [number, number, number, number]
): { score: number; daysFromEnd: number } {
  const sceneMs = new Date(scene.acquisitionDate || scene.datetime).getTime();

  // Strict chronological rule: After date MUST be > Before date
  if (sceneMs <= beforeSceneMs) {
    return { score: -999999, daysFromEnd: 99999 };
  }

  const daysFromEnd = Math.abs((reqEndMs - sceneMs) / 86400000);

  // Within period check
  const isWithinPeriod = sceneMs >= reqStartMs && sceneMs <= reqEndMs + 86400000 * 30;
  const periodPenalty = isWithinPeriod ? 0 : 5000;

  // Overlap penalty
  const overlap = aoiBbox ? computeOverlapRatio(scene.bbox, aoiBbox) : 1.0;
  const overlapPenalty = overlap >= 0.2 ? 0 : 2000 * (1 - overlap);

  // Proximity penalty: 15 points per 30 days away from end date
  const proximityPenalty = (daysFromEnd / 30) * 15;

  // Cloud cover penalty: 1.2 points per 1% cloud
  const cloudPenalty = Math.max(0, scene.cloudCover) * 1.2;

  const score = 10000 - periodPenalty - overlapPenalty - proximityPenalty - cloudPenalty;
  return { score, daysFromEnd };
}

/**
 * Find the optimal Before/After pair for a specific sensor family
 */
function recommendPairForSensor(
  candidateScenes: SatelliteScene[],
  sensorFamily: 'Sentinel-2' | 'Landsat',
  reqStartMs: number,
  reqEndMs: number,
  reqStartDateStr: string,
  reqEndDateStr: string,
  aoiBbox?: [number, number, number, number]
): {
  beforeScene: SatelliteScene | null;
  afterScene: SatelliteScene | null;
  beforeReason?: RecommendationReason;
  afterReason?: RecommendationReason;
  totalScore: number;
} {
  const scenes = candidateScenes.filter(
    (s) => getSensorFamily(s) === sensorFamily && s.cloudCover <= 60
  );

  if (scenes.length < 2) {
    return { beforeScene: null, afterScene: null, totalScore: -1 };
  }

  // Find candidate Before scenes: score all scenes
  let bestBefore: SatelliteScene | null = null;
  let bestBeforeScore = -Infinity;
  let bestDaysFromStart = 0;

  for (const scene of scenes) {
    const { score, daysFromStart } = scoreBeforeCandidate(scene, reqStartMs, reqEndMs, aoiBbox);
    if (score > bestBeforeScore) {
      bestBeforeScore = score;
      bestBefore = scene;
      bestDaysFromStart = daysFromStart;
    }
  }

  if (!bestBefore) {
    return { beforeScene: null, afterScene: null, totalScore: -1 };
  }

  const beforeMs = new Date(bestBefore.acquisitionDate || bestBefore.datetime).getTime();

  // Find candidate After scenes that are strictly chronologically after the Before scene
  let bestAfter: SatelliteScene | null = null;
  let bestAfterScore = -Infinity;
  let bestDaysFromEnd = 0;

  for (const scene of scenes) {
    if (scene.id === bestBefore.id) continue;
    const { score, daysFromEnd } = scoreAfterCandidate(
      scene,
      reqStartMs,
      reqEndMs,
      beforeMs,
      aoiBbox
    );
    if (score > bestAfterScore) {
      bestAfterScore = score;
      bestAfter = scene;
      bestDaysFromEnd = daysFromEnd;
    }
  }

  if (!bestAfter || bestAfterScore <= -99999) {
    return { beforeScene: bestBefore, afterScene: null, totalScore: -1 };
  }

  const beforeDateFormatted = formatReadableDate(bestBefore.acquisitionDate);
  const afterDateFormatted = formatReadableDate(bestAfter.acquisitionDate);

  const beforeReason: RecommendationReason = {
    headline: 'RECOMMENDED BEFORE',
    proximityExplanation: '',
    cloudExplanation: `Cloud cover: ${bestBefore.cloudCover}%`,
    sensorConsistency: `${sensorFamily} (matching sensor pair for direct pixel-to-pixel comparison)`,
    badgeText: 'Optimal Baseline',
  };

  const afterReason: RecommendationReason = {
    headline: 'RECOMMENDED AFTER',
    proximityExplanation: '',
    cloudExplanation: `Cloud cover: ${bestAfter.cloudCover}%`,
    sensorConsistency: `${sensorFamily} (chronologically after Before image from ${beforeDateFormatted})`,
    badgeText: 'Optimal Comparison',
  };

  return {
    beforeScene: bestBefore,
    afterScene: bestAfter,
    beforeReason,
    afterReason,
    totalScore: bestBeforeScore + bestAfterScore,
  };
}

/**
 * Primary Chronological and Data-Quality-Based Recommendation Engine
 */
export function recommendSatellitePair(
  allScenes: SatelliteScene[],
  requestedStartDate: string,
  requestedEndDate: string,
  aoiBbox?: [number, number, number, number]
): RecommendationResult {
  const reqStart = requestedStartDate || '2020-01-01';
  const reqEnd = requestedEndDate || '2026-12-31';

  let reqStartMs = new Date(reqStart).getTime();
  let reqEndMs = new Date(reqEnd).getTime();

  // Guard against reversed input dates
  if (reqStartMs > reqEndMs) {
    const tmp = reqStartMs;
    reqStartMs = reqEndMs;
    reqEndMs = tmp;
  }

  if (!allScenes || allScenes.length === 0) {
    return {
      status: 'no_scenes',
      errorMessage: 'No satellite imagery available for the selected area and date criteria.',
      beforeScene: null,
      afterScene: null,
      requestedStart: reqStart,
      requestedEnd: reqEnd,
    };
  }

  if (allScenes.length === 1) {
    return {
      status: 'insufficient_imagery',
      errorMessage:
        'Only one usable satellite image was found for the requested period. At least two chronological observations are required to perform change analysis.',
      beforeScene: allScenes[0],
      afterScene: null,
      requestedStart: reqStart,
      requestedEnd: reqEnd,
    };
  }

  // 1. Evaluate Sentinel-2 pair
  const s2Pair = recommendPairForSensor(
    allScenes,
    'Sentinel-2',
    reqStartMs,
    reqEndMs,
    reqStart,
    reqEnd,
    aoiBbox
  );

  // 2. Evaluate Landsat pair
  const landsatPair = recommendPairForSensor(
    allScenes,
    'Landsat',
    reqStartMs,
    reqEndMs,
    reqStart,
    reqEnd,
    aoiBbox
  );

  // Decision Logic:
  // Preference 1: Sentinel-2 has 10m spatial resolution vs Landsat 30m.
  // If Sentinel-2 has a complete valid pair, prefer Sentinel-2.
  if (s2Pair.beforeScene && s2Pair.afterScene) {
    return {
      status: 'valid',
      beforeScene: s2Pair.beforeScene,
      afterScene: s2Pair.afterScene,
      beforeReason: s2Pair.beforeReason,
      afterReason: s2Pair.afterReason,
      recommendedSensor: 'Sentinel-2',
      requestedStart: reqStart,
      requestedEnd: reqEnd,
      actualBeforeDate: s2Pair.beforeScene.acquisitionDate,
      actualAfterDate: s2Pair.afterScene.acquisitionDate,
    };
  }

  // Preference 2: If Sentinel-2 has insufficient imagery but Landsat has a valid pair,
  // recommend Landsat (Rule E)
  if (landsatPair.beforeScene && landsatPair.afterScene) {
    return {
      status: 'valid',
      beforeScene: landsatPair.beforeScene,
      afterScene: landsatPair.afterScene,
      beforeReason: landsatPair.beforeReason,
      afterReason: landsatPair.afterReason,
      recommendedSensor: 'Landsat',
      requestedStart: reqStart,
      requestedEnd: reqEnd,
      actualBeforeDate: landsatPair.beforeScene.acquisitionDate,
      actualAfterDate: landsatPair.afterScene.acquisitionDate,
    };
  }

  // Preference 3: Missing Before or After across both sensors
  // Check if ANY scene can serve as Before near requested start
  const allUsable = allScenes.filter((s) => s.cloudCover <= 65);
  if (allUsable.length === 0) {
    return {
      status: 'no_scenes',
      errorMessage: 'No cloud-free or low-cloud satellite imagery found within the requested period.',
      beforeScene: null,
      afterScene: null,
      requestedStart: reqStart,
      requestedEnd: reqEnd,
    };
  }

  // Sort chronologically ascending
  const sortedAsc = [...allUsable].sort((a, b) =>
    (a.acquisitionDate || a.datetime).localeCompare(b.acquisitionDate || b.datetime)
  );

  const earliest = sortedAsc[0];
  const earliestMs = new Date(earliest.acquisitionDate || earliest.datetime).getTime();
  const latest = sortedAsc[sortedAsc.length - 1];
  const latestMs = new Date(latest.acquisitionDate || latest.datetime).getTime();

  // If earliest scene is already near the end of the period, no suitable Before image exists
  if (earliestMs > reqEndMs - 86400000 * 90) {
    return {
      status: 'missing_before',
      errorMessage: 'No suitable Before image was found for the requested period.',
      beforeScene: null,
      afterScene: latest,
      requestedStart: reqStart,
      requestedEnd: reqEnd,
    };
  }

  // If latest scene is already near the start of the period, no suitable After image exists
  if (latestMs < reqStartMs + 86400000 * 90) {
    return {
      status: 'missing_after',
      errorMessage: 'No suitable After image was found for the requested period.',
      beforeScene: earliest,
      afterScene: null,
      requestedStart: reqStart,
      requestedEnd: reqEnd,
    };
  }

  // Fallback: If only 1 image exists
  return {
    status: 'insufficient_imagery',
    errorMessage: 'No suitable Before and After image pair could be validated for this time span.',
    beforeScene: earliest,
    afterScene: null,
    requestedStart: reqStart,
    requestedEnd: reqEnd,
  };
}

/**
 * Validate a user's manual selection of Before and After images
 */
export function validatePairSelection(
  before: SatelliteScene | null,
  after: SatelliteScene | null,
  targetAoi?: [number, number, number, number]
): SelectionValidation {
  if (!before && !after) {
    return { valid: false };
  }

  if (!before) {
    return {
      valid: false,
      chronologyError: 'Please select a Before image for change analysis.',
    };
  }

  if (!after) {
    return {
      valid: false,
      chronologyError: 'Please select an After image for change analysis.',
    };
  }

  if (before.id === after.id) {
    return {
      valid: false,
      chronologyError: 'Before image and After image cannot be the exact same scene. Please select two distinct observation dates.',
    };
  }

  const beforeDate = new Date(before.acquisitionDate || before.datetime).getTime();
  const afterDate = new Date(after.acquisitionDate || after.datetime).getTime();

  if (beforeDate >= afterDate) {
    return {
      valid: false,
      chronologyError: `Invalid chronology: Before image date (${formatReadableDate(
        before.acquisitionDate
      )}) must be earlier than After image date (${formatReadableDate(after.acquisitionDate)}).`,
    };
  }

  let aoiWarning: string | undefined;
  if (!checkBboxIntersection(before.bbox, after.bbox)) {
    aoiWarning =
      'Selected Before and After scenes do not intersect the same geographic bounding box. Change metrics may be unreliable.';
  } else if (targetAoi) {
    const bOverlap = computeOverlapRatio(before.bbox, targetAoi);
    const aOverlap = computeOverlapRatio(after.bbox, targetAoi);
    if (bOverlap < 0.1 || aOverlap < 0.1) {
      aoiWarning =
        'One or both selected scenes have minimal overlap with the requested area of interest (AOI).';
    }
  }

  let sensorWarning: string | undefined;
  const isBeforeS2 = getSensorFamily(before) === 'Sentinel-2';
  const isAfterS2 = getSensorFamily(after) === 'Sentinel-2';
  if (isBeforeS2 !== isAfterS2) {
    sensorWarning =
      'Comparing different satellite sensors (Sentinel-2 10m vs Landsat 30m). Sensor harmonization and resolution re-gridding will be applied.';
  }

  let qualityWarning: string | undefined;
  if (before.cloudCover > 25 || after.cloudCover > 25) {
    qualityWarning = `High cloud coverage detected (Before: ${before.cloudCover}%, After: ${after.cloudCover}%). Cloud masks may obscure surface change.`;
  }

  return {
    valid: true,
    aoiWarning,
    sensorWarning,
    qualityWarning,
  };
}
