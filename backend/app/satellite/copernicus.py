"""
Copernicus Data Space Ecosystem STAC Client.
Interfaces with https://stac.dataspace.copernicus.eu/v1/ for Sentinel-2 L2A.
"""
import requests
from typing import Dict, Any, List

STAC_ENDPOINT = "https://stac.dataspace.copernicus.eu/v1/search"
COLLECTION_NAME = "sentinel-2-l2a"

def query_copernicus_stac(
    bbox: List[float],
    start_date: str,
    end_date: str,
    max_cloud_cover: float = 20.0,
    force_demo: bool = False
) -> Dict[str, Any]:
    """
    Executes live STAC POST search against Copernicus Data Space Ecosystem.
    """
    if force_demo:
        return _get_demo_scenes(bbox, start_date, end_date, "User explicitly requested Demo Mode.")

    payload = {
        "collections": [COLLECTION_NAME],
        "bbox": bbox,
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "limit": 20
    }

    try:
        resp = requests.post(STAC_ENDPOINT, json=payload, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])

        scenes = []
        for feat in features:
            props = feat.get("properties", {})
            cloud_cover = props.get("eo:cloud_cover", 0.0)
            if cloud_cover > max_cloud_cover:
                continue

            dt = props.get("datetime", "")
            acq_date = dt.split("T")[0] if dt else "Unknown"

            assets = feat.get("assets", {})
            thumb = assets.get("thumbnail", {}).get("href") or assets.get("quicklook", {}).get("href")

            scenes.append({
                "id": feat["id"],
                "datetime": dt,
                "acquisitionDate": acq_date,
                "satellite": "Sentinel-2A" if feat["id"].startswith("S2A") else "Sentinel-2B",
                "collection": COLLECTION_NAME,
                "cloudCover": round(cloud_cover, 1),
                "bbox": feat.get("bbox", bbox),
                "thumbnailUrl": thumb,
                "productUrl": assets.get("Product", {}).get("href", "https://dataspace.copernicus.eu/browser/"),
                "isDemo": False,
                "source": "Copernicus Data Space Ecosystem (Live STAC API)"
            })

        return {
            "mode": "LIVE DATA",
            "isDemo": False,
            "count": len(scenes),
            "scenes": sorted(scenes, key=lambda s: s["cloudCover"]),
            "endpoint": STAC_ENDPOINT
        }
    except Exception as exc:
        return _get_demo_scenes(bbox, start_date, end_date, f"Copernicus STAC API temporary error ({str(exc)})")

def _get_demo_scenes(bbox: List[float], start_date: str, end_date: str, reason: str) -> Dict[str, Any]:
    c_lon = (bbox[0] + bbox[2]) / 2.0
    c_lat = (bbox[1] + bbox[3]) / 2.0
    y1 = start_date[:4] if len(start_date) >= 4 else "2020"
    y2 = end_date[:4] if len(end_date) >= 4 else "2024"

    return {
        "mode": "DEMO DATA",
        "isDemo": True,
        "demoNotice": reason,
        "count": 2,
        "scenes": [
            {
                "id": f"DEMO_S2A_MSIL2A_{y1}0315_T43RGM",
                "datetime": f"{y1}-03-15T05:26:51Z",
                "acquisitionDate": f"{y1}-03-15",
                "satellite": "Sentinel-2A (Demo)",
                "collection": COLLECTION_NAME,
                "cloudCover": 3.1,
                "bbox": [c_lon - 0.2, c_lat - 0.2, c_lon + 0.2, c_lat + 0.2],
                "thumbnailUrl": None,
                "productUrl": "https://dataspace.copernicus.eu/browser/",
                "isDemo": True,
                "source": "Copernicus Data Space Ecosystem (Demo Dataset)"
            },
            {
                "id": f"DEMO_S2B_MSIL2A_{y2}0320_T43RGM",
                "datetime": f"{y2}-03-20T05:26:49Z",
                "acquisitionDate": f"{y2}-03-20",
                "satellite": "Sentinel-2B (Demo)",
                "collection": COLLECTION_NAME,
                "cloudCover": 2.8,
                "bbox": [c_lon - 0.2, c_lat - 0.2, c_lon + 0.2, c_lat + 0.2],
                "thumbnailUrl": None,
                "productUrl": "https://dataspace.copernicus.eu/browser/",
                "isDemo": True,
                "source": "Copernicus Data Space Ecosystem (Demo Dataset)"
            }
        ]
    }
