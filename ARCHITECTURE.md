# System Architecture & Technical Specifications

**Project**: Semantic Retrieval and Multi-Temporal Change Analysis of Satellite Imagery  
**Standard**: Geospatial Technical Specification

---

## 1. High-Level Topology

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   - MapLibre / Leaflet Interactive Visualization       │
│   - Bounding Box & AOI Selection / Manual Coordinate   │
│   - Multi-Temporal Swipe & Layer Blending Controls     │
│   - WCAG 2.2 AA Accessible UI (Tailwind CSS)           │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (Port 3000)
┌───────────────────────────▼────────────────────────────┐
│              Full-Stack Application Server             │
│   - Express.js Proxy & Security Layer                  │
│   - Gemini 3.8 Flash Semantic Query Extraction         │
│   - Local Deterministic NLP Regex Pipeline Fallback    │
│   - In-Memory Query & Job History (Zero PII)           │
└──────┬────────────────────┬────────────────────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│  Copernicus  │    │ OpenStreetMap│     │  Geospatial  │
│  STAC API v1 │    │  Nominatim   │     │  Analysis    │
│ (Sentinel-2) │    │  Geocoding   │     │  Engine      │
└──────────────┘    └──────────────┘     └──────────────┘
```

---

## 2. Component Pipeline

### Stage 1: Semantic Query Understanding
Input natural language text is passed to the intent parser.
- **Primary Engine**: Google Gemini 3.8 Flash with structured JSON schema constraints.
- **Resilient Fallback**: Geospatial regex pattern extractor detecting geographical entities, temporal tokens (from/between/to), change themes, and cloud-cover conditions.
- **Output**:
  ```json
  {
    "location": "Delhi",
    "startDate": "2020-01-01",
    "endDate": "2025-12-31",
    "analysisType": "urban",
    "maxCloudCover": 20,
    "confidence": 0.92
  }
  ```

### Stage 2: Spatial & Temporal Catalog Search
- Target bounding box is resolved via OpenStreetMap Nominatim.
- A Spatio-Temporal Asset Catalog (STAC) request is dispatched to `https://stac.dataspace.copernicus.eu/v1/search`.
- Collection: `sentinel-2-l2a` (Surface Reflectance, Bottom-Of-Atmosphere).
- Scenes are filtered by `eo:cloud_cover <= maxCloudCover` and ranked by cloud clarity and spatial proximity.

### Stage 3: Multi-Temporal Image Selection & Overlap Verification
- The analyst selects two observations: $T_1$ (Before) and $T_2$ (After).
- The system computes the intersection bounding box:
  $$\text{Overlap} = \frac{\text{Area}(B_1 \cap B_2)}{\min(\text{Area}(B_1), \text{Area}(B_2))} \times 100\%$$
- If overlap $< 5\%$, execution halts with a descriptive warning preventing invalid spatial comparison.

### Stage 4: Change Detection Mathematics

#### A. Urban / Built-up Expansion (NDBI Differencing)
$$\text{NDBI} = \frac{\rho_{\text{SWIR1}} - \rho_{\text{NIR}}}{\rho_{\text{SWIR1}} + \rho_{\text{NIR}}} = \frac{\text{Band 11} - \text{Band 8}}{\text{Band 11} + \text{Band 8}}$$
$$\Delta \text{NDBI} = \text{NDBI}_{T_2} - \text{NDBI}_{T_1}$$
Values exceeding the sensitivity threshold ($\Delta > 0.15$) represent new impervious surfaces, building footprints, and infrastructure expansion.

#### B. Vegetation Dynamics (NDVI Differencing)
$$\text{NDVI} = \frac{\rho_{\text{NIR}} - \rho_{\text{Red}}}{\rho_{\text{NIR}} + \rho_{\text{Red}}} = \frac{\text{Band 8} - \text{Band 4}}{\text{Band 8} + \text{Band 4}}$$
$$\Delta \text{NDVI} = \text{NDVI}_{T_2} - \text{NDVI}_{T_1}$$
Negative deltas ($\Delta < -0.15$) indicate canopy degradation or clearing; positive deltas indicate afforestation or crop emergence.

#### C. Surface Water Dynamics (NDWI Differencing)
$$\text{NDWI} = \frac{\rho_{\text{Green}} - \rho_{\text{NIR}}}{\rho_{\text{Green}} + \rho_{\text{NIR}}} = \frac{\text{Band 3} - \text{Band 8}}{\text{Band 3} + \text{Band 8}}$$

---

## 3. Data Protection & Ethical Compliance

- **No False Marketing Claims**: Transparently marked as a scientific prototype; no fabricated claims of 100% survey accuracy.
- **DPDP Act Awareness**: Complete user data deletion (`DELETE /api/history`), transparent third-party disclosure, and explicit cookie consent gates.
