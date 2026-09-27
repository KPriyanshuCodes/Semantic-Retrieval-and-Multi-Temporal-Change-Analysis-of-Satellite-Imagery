"""
PostgreSQL & PostGIS Database Schema (SQLAlchemy ORM).
Designed with Data Minimisation and Indian DPDP awareness:
No unnecessary personal data; geometry stored in WGS84 (SRID 4326).
"""
from datetime import datetime
from typing import Optional

# Reference SQLAlchemy schema for deployment with PostgreSQL + PostGIS:
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geometry

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    query_text = Column(String(500), nullable=False)
    parsed_parameters = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SatelliteScene(Base):
    __tablename__ = "satellite_scenes"
    id = Column(String(120), primary_key=True) # S2 scene ID
    satellite = Column(String(50), default="Sentinel-2")
    collection = Column(String(50), default="sentinel-2-l2a")
    acquisition_date = Column(DateTime, nullable=False, index=True)
    cloud_cover = Column(Float, nullable=False)
    footprint = Column(Geometry(geometry_type='POLYGON', srid=4326))
    metadata_json = Column(JSON, nullable=True)

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id = Column(String(64), primary_key=True)
    analysis_type = Column(String(50), nullable=False) # urban, vegetation, water, general
    before_scene_id = Column(String(120), ForeignKey("satellite_scenes.id"))
    after_scene_id = Column(String(120), ForeignKey("satellite_scenes.id"))
    aoi_geometry = Column(Geometry(geometry_type='POLYGON', srid=4326))
    total_area_km2 = Column(Float, nullable=False)
    changed_area_km2 = Column(Float, nullable=False)
    change_percentage = Column(Float, nullable=False)
    status = Column(String(30), default="completed") # pending, processing, completed, failed
    method = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConsentRecord(Base):
    __tablename__ = "consent_records"
    id = Column(Integer, primary_key=True, index=True)
    consent_version = Column(String(20), default="1.0")
    timestamp = Column(DateTime, default=datetime.utcnow)
    necessary_accepted = Column(Boolean, default=True)
    analytics_accepted = Column(Boolean, default=False)
    marketing_accepted = Column(Boolean, default=False)
"""
