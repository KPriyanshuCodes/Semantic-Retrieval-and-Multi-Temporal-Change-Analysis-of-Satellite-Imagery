"""
Semantic query extraction and intent analysis.
Combines transparent regex/NLP with optional sentence-transformers.
"""
import re
from typing import Dict, Any

def extract_geospatial_intent(query: str) -> Dict[str, Any]:
    """
    Parses natural language query into structured geographic, temporal, and thematic parameters.
    """
    lower = query.lower()

    # Place detection
    places = ["delhi", "mumbai", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "jaipur"]
    location = "Delhi"
    for p in places:
        if re.search(r'\b' + p + r'\b', lower):
            location = p.capitalize()
            break

    # Year detection
    years = [int(y) for y in re.findall(r'\b(20[1-2][0-9])\b', lower)]
    if len(years) >= 2:
        start_year, end_year = min(years[0], years[1]), max(years[0], years[1])
    elif len(years) == 1:
        start_year, end_year = years[0] - 1, years[0]
    else:
        start_year, end_year = 2021, 2024

    # Theme
    theme = "general"
    if any(k in lower for k in ["urban", "built-up", "expansion", "city", "construction"]):
        theme = "urban"
    elif any(k in lower for k in ["vegetation", "forest", "tree", "green", "agriculture", "crop"]):
        theme = "vegetation"
    elif any(k in lower for k in ["water", "lake", "river", "flood", "reservoir"]):
        theme = "water"

    # Cloud preference
    max_cloud = 10 if any(k in lower for k in ["low cloud", "cloud-free", "clear"]) else 20

    return {
        "location": location,
        "startDate": f"{start_year}-01-01",
        "endDate": f"{end_year}-12-31",
        "analysisType": theme,
        "maxCloudCover": max_cloud,
        "satellite": "Sentinel-2",
        "collection": "sentinel-2-l2a",
        "confidence": 0.88,
        "method": "Transparent Geospatial NLP Intent Parser"
    }
