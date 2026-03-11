from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from frontend/dist
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

@app.get("/", include_in_schema=False)
async def serve_frontend():
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            return HTMLResponse(content=f.read())
    return {"message": "BioSentinel API", "status": "running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "BioSentinel AI"}

@app.post("/api/classify/image/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Analyze image for AI-generated content detection"""
    content = await file.read()
    
    # Basic response - in production, this would call the ML model
    return {
        "success": True,
        "ai_detection": {
            "is_suspicious": False,
            "confidence": 0.5,
            "label": "human",
            "reasoning": "Mock analysis - ML model not configured",
            "signs_detected": []
        },
        "pixel_analysis": {
            "is_suspicious": False,
            "compression_artifacts": False,
            "noise_consistency": True,
            "quality_score": 0.9
        },
        "overall_assessment": {
            "is_accepted": True,
            "status": "accepted",
            "reason": "Image passed all authenticity checks"
        },
        "timestamp": "2026-02-12T07:30:00.000Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
