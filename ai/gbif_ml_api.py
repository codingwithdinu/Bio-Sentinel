from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
import requests
import json
from datetime import datetime, timedelta
import base64
import io
from PIL import Image
import torch
import numpy as np
from transformers import AutoProcessor, AutoModelForImageClassification

app = FastAPI(
    title="BioSentinel AI API",
    description="""
BioSentinel AI API for biodiversity monitoring and image analysis.

## Features:
- **GBIF Classification**: Classify species observations with risk assessment
- **Satellite Analysis**: Analyze satellite data for fire and vegetation
- **AI Image Detection**: Detect AI-generated images and analyze pixel quality

## Models Used:
- GBIF API for species occurrence data
- Hugging Face model: Ateeqq/ai-vs-human-image-detector
    """,
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# Initialize image classifier (lazy loading)
classifier = None

def get_classifier():
    global classifier
    if classifier is None:
        try:
            from transformers import AutoProcessor, AutoModelForImageClassification
            processor = AutoProcessor.from_pretrained("Ateeqq/ai-vs-human-image-detector")
            model = AutoModelForImageClassification.from_pretrained("Ateeqq/ai-vs-human-image-detector")
            classifier = {"processor": processor, "model": model}
            print("[OK] Image classifier loaded successfully")
        except Exception as e:
            print(f"[ERROR] Failed to load image classifier: {e}")
    return classifier

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endangered species list (expandable)
ENDANGERED_SPECIES = {
    "Panthera tigris",  # Tiger
    "Panthera leo",     # Lion
    "Panthera onca",    # Jaguar
    "Snow Leopard",      # Uncia uncia
    "Elephas maximus",   # Asian Elephant
    "Rhinoceros unicornis",  # Indian Rhino
    "Gorilla beringei",  # Mountain Gorilla
    "Pongo abelii",      # Sumatran Orangutan
    "Ailuropoda melanoleuca",  # Giant Panda
    "Vultur gryphus",    # Andean Condor
    "Aquila chrysaetos", # Golden Eagle
    "Crocodylus niloticus",  # Nile Crocodile
    "Python reticulatus", # Reticulated Python
    "Macaca fascicularis",  # Crab-eating Macaque
}

class GBIFInput(BaseModel):
    species: str
    lat: float
    lon: float
    radius: int = 25
    limit: int = 300

class GBIFOutput(BaseModel):
    riskScore: float
    riskLevel: str
    reason: List[str]
    observations: int
    trendRatio: float
    isEndangered: bool
    humanProximity: float

def fetch_gbif_occurrences(species: str, lat: float, lon: float, radius: int, limit: int):
    """Fetch occurrence data from GBIF API"""
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "scientificName": species,
        "decimalLatitude": lat,
        "decimalLongitude": lon,
        "radius": radius,
        "limit": limit
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()["results"]
    except requests.exceptions.RequestException as e:
        print(f"GBIF API Error: {e}")
        return []

def get_historical_average(species: str, lat: float, lon: float, radius: int):
    """Get historical average from older data (90+ days ago)"""
    url = "https://api.gbif.org/v1/occurrence/search"
    to_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    
    params = {
        "scientificName": species,
        "decimalLatitude": lat,
        "decimalLongitude": lon,
        "radius": radius,
        "limit": 100,
        "toDate": to_date
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return len(response.json()["results"])
    except:
        return 4  # Default fallback

def calculate_human_proximity(lat: float, lon: float) -> float:
    """
    Simple heuristic for human proximity
    In production, this would use settlement data
    Returns value 0-1 (1 = very close to human areas)
    """
    # This is a simplified heuristic
    # In production, integrate with settlement databases
    return 0.7  # Placeholder - adjust based on location

def gbif_risk_score(recent_count: int, historical_avg: int, is_endangered: bool, human_proximity: float) -> dict:
    """Calculate risk score based on GBIF features"""
    score = 0.0
    reasons = []
    
    # Calculate trend ratio
    trend_ratio = recent_count / max(historical_avg, 1)
    
    # Endangered species check
    if is_endangered:
        score += 1.5
        reasons.append("Endangered species detected")
    
    # Trend analysis
    if trend_ratio >= 3.0:
        score += 1.5
        reasons.append(f"Major surge in sightings ({trend_ratio:.1f}x average)")
    elif trend_ratio >= 2.0:
        score += 1.2
        reasons.append(f"Unusual increase in sightings ({trend_ratio:.1f}x average)")
    elif trend_ratio < 0.5:
        score += 1.0
        reasons.append(f"Decline in sightings ({trend_ratio:.1f}x average)")
    
    # Human proximity
    if human_proximity >= 0.7:
        score += 0.8
        reasons.append("Near human-populated areas")
    elif human_proximity >= 0.4:
        score += 0.4
        reasons.append("Moderate proximity to settlements")
    
    # Determine risk level
    if score >= 3.0:
        level = "Critical"
    elif score >= 2.0:
        level = "High"
    elif score >= 1.0:
        level = "At Risk"
    else:
        level = "Positive"
    
    return {
        "score": round(score, 2),
        "level": level,
        "reasons": reasons,
        "trend_ratio": round(trend_ratio, 2)
    }

@app.post("/gbif/classify", response_model=GBIFOutput)
def classify_observation(data: GBIFInput):
    """Classify observation risk using GBIF data"""
    
    # Fetch recent occurrences
    recent_records = fetch_gbif_occurrences(
        data.species, data.lat, data.lon, data.radius, data.limit
    )
    recent_count = len(recent_records)
    
    # Get historical average
    historical_avg = get_historical_average(
        data.species, data.lat, data.lon, data.radius
    )
    
    # Check if endangered
    is_endangered = data.species in ENDANGERED_SPECIES
    
    # Calculate human proximity (simplified)
    human_proximity = calculate_human_proximity(data.lat, data.lon)
    
    # Calculate risk
    risk_result = gbif_risk_score(
        recent_count, historical_avg, is_endangered, human_proximity
    )
    
    return GBIFOutput(
        riskScore=risk_result["score"],
        riskLevel=risk_result["level"],
        reason=risk_result["reasons"],
        observations=recent_count,
        trendRatio=risk_result["trend_ratio"],
        isEndangered=is_endangered,
        humanProximity=human_proximity
    )

@app.get("/gbif/search")
def search_species(q: str, limit: int = 10):
    """Search GBIF species database"""
    url = "https://api.gbif.org/v1/species/match"
    params = {"name": q, "limit": limit}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except:
        return {"error": "Search failed"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "GBIF ML API"}

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with BioSentinel branding"""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="BioSentinel AI API - Swagger UI"
    )

@app.get("/api", include_in_schema=False)
def api_root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

# Satellite Analysis Models
class SatelliteInput(BaseModel):
    aoi: dict  # {minLat, maxLat, minLon, maxLon}
    layers: List[str]  # ["fire", "vegetation"]

class SatelliteOutput(BaseModel):
    fireHotspots: Optional[int] = None
    vegetationIndex: Optional[float] = None
    riskLevel: str
    lastUpdate: str

# Simulated satellite data based on AOI
def get_satellite_data(aoi: dict, layers: List[str]) -> dict:
    """Get simulated satellite data for the AOI"""
    import random
    
    result = {}
    
    # Simulate fire hotspots (NASA FIRMS data simulation)
    if "fire" in layers:
        # Higher latitude regions have more fire activity
        lat_range = aoi["maxLat"] - aoi["minLat"]
        fire_probability = (lat_range / 50) * 0.3  # Normalized
        fire_count = int(random.normalvariate(fire_probability * 100, 30))
        result["fireHotspots"] = max(0, fire_count)
    
    # Simulate vegetation index (NDVI)
    if "vegetation" in layers:
        # Tropical regions have higher NDVI
        avg_lat = (aoi["minLat"] + aoi["maxLat"]) / 2
        is_tropical = abs(avg_lat) < 23.5
        base_ndvi = 0.7 if is_tropical else 0.4
        ndvi = round(random.uniform(base_ndvi - 0.2, base_ndvi + 0.2), 2)
        result["vegetationIndex"] = max(0, min(1, ndvi))
    
    # Calculate risk level based on fire and vegetation
    risk_score = 0
    if result.get("fireHotspots", 0) > 50:
        risk_score += 2
    elif result.get("fireHotspots", 0) > 20:
        risk_score += 1
    
    vegetation = result.get("vegetationIndex", 0.5)
    if vegetation < 0.3:
        risk_score += 1.5
    elif vegetation < 0.4:
        risk_score += 1
    
    # Determine risk level
    if risk_score >= 3:
        risk_level = "Critical"
    elif risk_score >= 2:
        risk_level = "High"
    elif risk_score >= 1:
        risk_level = "At Risk"
    else:
        risk_level = "Positive"
    
    result["riskLevel"] = risk_level
    result["lastUpdate"] = datetime.now().isoformat()
    
    return result

@app.post("/satellite/analyze", response_model=SatelliteOutput)
def analyze_satellite(data: SatelliteInput):
    """Analyze satellite data for the given AOI"""
    satellite_data = get_satellite_data(data.aoi, data.layers)
    
    return SatelliteOutput(
        fireHotspots=satellite_data.get("fireHotspots"),
        vegetationIndex=satellite_data.get("vegetationIndex"),
        riskLevel=satellite_data["riskLevel"],
        lastUpdate=satellite_data["lastUpdate"]
    )

@app.get("/")
def root():
    return {
        "message": "BioSentinel GBIF ML API",
        "endpoints": {
            "POST /gbif/classify": "Classify observation risk",
            "GET /gbif/search": "Search GBIF species",
            "GET /health": "Health check",
            "POST /classify/image": "Classify image as AI-generated or Human"
        }
    }

@app.post("/classify/image")
async def classify_image(file: UploadFile = File(...)):
    """
    Classify an image as AI-generated or Human using Hugging Face model
    Model: Ateeqq/ai-vs-human-image-detector
    """
    try:
        # Load classifier if not already loaded
        clf = get_classifier()
        if clf is None:
            return {"error": "Image classifier not available. Please install dependencies."}
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Process image and get predictions
        inputs = clf["processor"](images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = clf["model"](**inputs)
            logits = outputs.logits
            predicted_class_idx = logits.argmax(-1).item()
            probabilities = torch.softmax(logits, dim=1)[0]
        
        # Get class labels (AI or Human)
        labels = clf["model"].config.id2label
        predictions = []
        for idx in range(len(probabilities)):
            predictions.append({
                "label": labels[idx],
                "confidence": float(probabilities[idx])
            })
        
        # Sort by confidence
        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        
        # Determine result
        top_prediction = predictions[0]
        label_lower = top_prediction["label"].lower()
        is_ai = "ai" in label_lower or "artificial" in label_lower
        
        return {
            "filename": file.filename,
            "predictions": predictions,
            "result": "AI-Generated" if is_ai else "Human-Created",
            "confidence": top_prediction["confidence"],
            "is_ai_generated": is_ai
        }
    except Exception as e:
        print(f"Image classification error: {e}")
        return {"error": str(e)}

@app.post("/classify/image/url")
async def classify_image_url(url: str):
    """
    Classify an image from URL as AI-generated or Human using Hugging Face model
    """
    try:
        # Load classifier if not already loaded
        clf = get_classifier()
        if clf is None:
            return {"error": "Image classifier not available. Please install dependencies."}
        
        # Download and process image
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Process image and get predictions
        inputs = clf["processor"](images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = clf["model"](**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)[0]
        
        # Get class labels
        labels = clf["model"].config.id2label
        predictions = []
        for idx in range(len(probabilities)):
            predictions.append({
                "label": labels[idx],
                "confidence": float(probabilities[idx])
            })
        
        # Sort by confidence
        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        
        # Determine result
        top_prediction = predictions[0]
        is_ai = "ai" in top_prediction["label"].lower() or "artificial" in top_prediction["label"].lower()
        
        return {
            "url": url,
            "predictions": predictions,
            "result": "AI-Generated" if is_ai else "Human-Created",
            "confidence": top_prediction["confidence"]
        }
    except Exception as e:
        print(f"Image classification error: {e}")
        return {"error": str(e)}

@app.post("/classify/image/analyze")
async def analyze_image_full(file: UploadFile = File(...)):
    """
    Full image analysis: AI detection + Pixel quality analysis
    Returns whether image is AI-generated and pixel quality assessment
    """
    try:
        # Load classifier if not already loaded
        clf = get_classifier()
        if clf is None:
            return {"error": "Image classifier not available. Please install dependencies."}
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 1. AI Detection
        inputs = clf["processor"](images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = clf["model"](**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)[0]
        
        labels = clf["model"].config.id2label
        predictions = []
        for idx in range(len(probabilities)):
            predictions.append({
                "label": labels[idx],
                "confidence": float(probabilities[idx])
            })
        
        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        
        top_prediction = predictions[0]
        label_lower = top_prediction["label"].lower()
        is_ai = "ai" in label_lower or "artificial" in label_lower
        ai_confidence = top_prediction["confidence"]
        
        # 2. Pixel Analysis for camera image quality
        img_array = np.array(image)
        height, width = img_array.shape[:2]
        
        # Calculate basic statistics
        gray = np.mean(img_array, axis=2)
        
        # Standard deviation of pixel values (natural images have variation)
        pixel_std = np.std(gray)
        
        # Calculate edge density (natural images have organic edges)
        edges = np.abs(np.gradient(gray.astype(float)))
        edge_density = np.sum(edges > 50) / (height * width)
        
        # Check for perfect uniformity
        unique_colors = len(np.unique(gray.reshape(-1)))
        color_ratio = unique_colors / (height * width)
        
        # Pixel quality score (0-1, higher = more likely natural camera photo)
        pixel_quality_score = min(1.0, (pixel_std / 50) * 0.5 + edge_density * 2 + color_ratio * 0.3)
        
        # Determine if pixel quality is suspicious
        is_suspicious_pixel = pixel_quality_score > 0.95
        
        # Overall assessment
        is_suspicious = is_ai or is_suspicious_pixel
        
        return {
            "filename": file.filename,
            "ai_detection": {
                "result": "AI-Generated" if is_ai else "Human-Created",
                "confidence": ai_confidence,
                "is_suspicious": is_ai
            },
            "pixel_analysis": {
                "pixel_quality_score": round(float(pixel_quality_score), 4),
                "is_suspicious": is_suspicious_pixel,
                "pixel_std": round(float(pixel_std), 2),
                "edge_density": round(float(edge_density), 4),
                "unique_colors": unique_colors
            },
            "overall_assessment": {
                "is_accepted": not is_suspicious,
                "reason": "Image rejected: AI-generated content detected" if (is_ai and ai_confidence > 0.7) else 
                         "Image rejected: Suspicious pixel patterns detected" if is_suspicious_pixel else
                         "Image accepted: Appears to be a natural photo"
            }
        }
    except Exception as e:
        print(f"Full image analysis error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except:
            pass
    
    uvicorn.run(app, host="0.0.0.0", port=port)
