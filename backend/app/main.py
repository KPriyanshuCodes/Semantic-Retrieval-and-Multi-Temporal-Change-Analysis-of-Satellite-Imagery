"""
GeoSemantic - FastAPI Geospatial & Semantic Retrieval Service
Production-ready backend for Sentinel-2 multi-temporal change analysis.
"""
from fastapi import FastAPI, HTTPException, Query, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import datetime
import os
import math

app = FastAPI(
    title="GeoSemantic Satellite Analysis API",
    description="Semantic Retrieval and Multi-Temporal Change Detection for Sentinel-2 Satellite Imagery",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class SearchQuery(BaseModel):
    query: str = Field(..., example="Show urban expansion near Delhi between 2020 and 2025")

class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

class SatelliteSearchRequest(BaseModel):
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    start_date: str = Field(..., example="2020-01-01")
    end_date: str = Field(..., example="2025-12-31")
    max_cloud_cover: float = Field(20.0, ge=0, le=100)
    collection: str = Field("sentinel-2-l2a", description="Copernicus Data Space collection")
    force_demo: bool = False

class SceneMetadata(BaseModel):
    id: str
    datetime: str
    acquisitionDate: str
    satellite: str
    collection: str
    cloudCover: float
    bbox: List[float]
    thumbnailUrl: Optional[str] = None
    productUrl: Optional[str] = None
    isDemo: bool = False
    source: str = "Copernicus Data Space Ecosystem"

class AnalysisRequest(BaseModel):
    before_scene: SceneMetadata
    after_scene: SceneMetadata
    analysis_type: str = Field("urban", description="urban | vegetation | water | general")
    aoi: Optional[List[float]] = None
    threshold: float = 0.15

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GeoSemantic FastAPI Geospatial Engine",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "stac_endpoint": "https://stac.dataspace.copernicus.eu/v1/",
        "collection": "sentinel-2-l2a",
        "ai_engine": "Sentence-Transformers / Hybrid NLP",
        "geospatial_stack": ["GDAL", "Rasterio", "GeoPandas", "Shapely"]
    }

@app.post("/api/search")
def parse_semantic_query(payload: SearchQuery):
    """
    Hybrid semantic retrieval: parses user query into structured geospatial criteria.
    Uses sentence-transformers / LLM semantic extraction.
    """
    from .ai.semantic_search import extract_geospatial_intent
    return extract_geospatial_intent(payload.query)

@app.post("/api/satellite/search")
def search_satellite_scenes(req: SatelliteSearchRequest):
    """
    Retrieves real Sentinel-2 L2A scenes from the official Copernicus STAC API.
    """
    from .satellite.copernicus import query_copernicus_stac
    return query_copernicus_stac(
        bbox=req.bbox,
        start_date=req.start_date,
        end_date=req.end_date,
        max_cloud_cover=req.max_cloud_cover,
        force_demo=req.force_demo
    )

@app.post("/api/analysis")
def run_change_analysis(req: AnalysisRequest):
    """
    Executes multi-temporal change detection (NDVI, NDBI, NDWI, CVA).
    Calculates affected area (km²), change percentage, and confidence metrics.
    """
    from .geospatial.processing import execute_change_detection
    return execute_change_detection(
        before_scene=req.before_scene.dict(),
        after_scene=req.after_scene.dict(),
        analysis_type=req.analysis_type,
        aoi=req.aoi,
        threshold=req.threshold
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
