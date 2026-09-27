# GeoSemantic: Semantic Retrieval & Multi-Temporal Change Analysis of Satellite Imagery

An end-to-end, scientifically grounded geospatial intelligence platform for Earth Observation. This application bridges natural language semantic understanding with official Earth Observation data catalogs, enabling researchers, urban planners, and environmental analysts to track changes across Earth's surface using Copernicus Sentinel-2 Level-2A imagery.

---

## 🛰️ 1. Project Overview

Earth Observation satellites capture petabytes of multispectral imagery every day, but discovering and analyzing multi-temporal changes typically requires specialized remote-sensing tools (QGIS, ArcGIS, Google Earth Engine). 

**GeoSemantic** provides:
1. **Natural Language Semantic Intent Parsing**: Translates colloquial queries (e.g. *"Show urban expansion near Delhi between 2020 and 2025"*) into structured spatiotemporal parameters.
2. **Official Copernicus Data Space Ecosystem STAC API Integration**: Directly searches the live `sentinel-2-l2a` collection via STAC (`https://stac.dataspace.copernicus.eu/v1/search`) without synthetic or fake results.
3. **Interactive Leaflet Geospatial Map**: View high-resolution true-color basemaps, bounding boxes, satellite observation footprints, and multi-temporal change overlays.
4. **Transparent Spectral Differencing Engine**: Computes normalized difference indices:
   - **NDBI (Normalized Difference Built-up Index)** for urban growth & impervious surfaces
   - **NDVI (Normalized Difference Vegetation Index)** for deforestation & agricultural shifts
   - **NDWI (Normalized Difference Water Index)** for reservoir shrinkage & surface water dynamics
   - **CVA (Euclidean Change Vector Analysis)** for general multi-spectral shifts
5. **Privacy by Design & Indian DPDP Awareness**: Explicit cookie consent management, zero hidden tracking, ephemeral search history, and full data deletion rights.

---

## 🏛️ 2. System Architecture

```text
[ USER QUERY ] 
   "Show urban expansion near Delhi between 2020 and 2025"
         │
         ▼
[ SEMANTIC INTENT PARSER ] (Gemini 3.8 Flash / Geospatial Rule-Based NLP Fallback)
   Location: Delhi | Range: 2020-01-01 to 2025-12-31 | Theme: Urban | Cloud: < 20%
         │
         ▼
[ GEOLOCATION & AOI GENERATION ] (OpenStreetMap Nominatim Geocoder + WGS84 Geodesic BBox)
         │
         ▼
[ COPERNICUS DATA SPACE STAC API ] (sentinel-2-l2a)
   Fetches candidate scenes, cloud cover, acquisition dates, and quicklook assets
         │
         ▼
[ SCENE SELECTION & PREPROCESSING ]
   Spatial overlap verification, CRS alignment, cloud-mask evaluation
         │
         ▼
[ MULTI-TEMPORAL CHANGE DETECTION ENGINE ]
   Δ Index computation (NDBI / NDVI / NDWI) -> Thresholding -> Vectorized GeoJSON
         │
         ▼
[ INTERACTIVE VISUALIZATION & METRICS DASHBOARD ]
   Leaflet Dual-Layer / Swipe Comparison, Km² area calculations, change breakdown
```

---

## ⚙️ 3. Quick Start & Setup

### Environment Variables
Configure `.env` in the root directory (never commit secrets):
```env
# Optional Gemini API Key for advanced natural language query understanding
GEMINI_API_KEY=your_gemini_api_key_here

# Server Port
PORT=3000
NODE_ENV=development
```

### Running the Full-Stack Prototype
```bash
# 1. Install dependencies
npm install

# 2. Run full-stack dev server (starts Express + Vite on port 3000)
npm run dev

# 3. Build for production
npm run build
npm start
```

### Running the Python FastAPI Geospatial Microservice (Alternative)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 4. Data Sources & Attributions

- **Sentinel-2 L2A Imagery & Quicklooks**: [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/) under European Commission Copernicus open access terms.
- **Geocoding & Place Search**: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) under Open Database License (ODbL).
- **Basemap Tiles**: [OpenStreetMap](https://www.openstreetmap.org/) and CartoDB Voyager.

---

## 🛡️ 5. Privacy, Ethics & DPDP Principles

- **Data Minimisation**: No personal identification, phone numbers, or passwords are collected.
- **Transparent Consent**: Interactive cookie management separating essential functionality from optional analytics.
- **Data Deletion**: Complete "Delete Search History" and "Purge Data" controls accessible via the UI.
- **Prototype Legal Disclaimer**: *Privacy controls are designed with Indian data-protection requirements in mind and should be reviewed for legal compliance before production deployment.*
