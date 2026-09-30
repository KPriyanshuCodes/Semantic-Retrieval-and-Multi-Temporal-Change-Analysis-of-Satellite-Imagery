export type AnalysisType = 'urban' | 'vegetation' | 'water' | 'general';

export interface SemanticParsedQuery {
  location: string;
  startDate: string;
  endDate: string;
  analysisType: AnalysisType;
  maxCloudCover: number;
  satellite: string;
  collection: string;
  confidence: number;
  needsClarification?: boolean;
  clarificationPrompt?: string;
  method?: string;
}

export interface GeocodeCandidate {
  place: string;
  displayName: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
  type?: string;
  importance?: number;
  state?: string;
}

export interface GeocodeResult {
  found: boolean;
  place: string;
  displayName: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  attribution?: string;
  candidates?: GeocodeCandidate[];
  error?: string;
  needsDisambiguation?: boolean;
}

export interface SatelliteScene {
  id: string;
  datetime: string;
  acquisitionDate: string;
  satellite: string;
  collection: string;
  cloudCover: number;
  bbox: [number, number, number, number];
  thumbnailUrl: string | null;
  rawThumbnailHref?: string | null;
  productUrl?: string;
  isDemo: boolean;
  source: string;
  relevanceScore: number;
}

export interface ChangeMetricBreakdown {
  totalAreaKm2: number;
  changedAreaKm2: number;
  changePercentage: number;
  increasedAreaKm2: number;
  decreasedAreaKm2: number;
  stableAreaKm2: number;
  overlapPercentage: number;
  confidenceScore: number;
  method: string;
  indexUsed: string;
  dataSource: string;
  isDemo: boolean;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  locationName: string;
  analysisType: AnalysisType;
  beforeScene: {
    id: string;
    date: string;
    cloudCover: number;
    satellite: string;
    collection?: string;
    source?: string;
    bbox?: [number, number, number, number];
    thumbnailUrl?: string;
    productUrl?: string;
  };
  afterScene: {
    id: string;
    date: string;
    cloudCover: number;
    satellite: string;
    collection?: string;
    source?: string;
    bbox?: [number, number, number, number];
    thumbnailUrl?: string;
    productUrl?: string;
  };
  aoi: [number, number, number, number];
  metrics: ChangeMetricBreakdown;
  changeFeaturesGeoJson: any;
  summary: string;
}

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}
