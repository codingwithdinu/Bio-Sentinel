# BioSentinel - Hugging Face Spaces Deployment

This folder contains the FastAPI application and Dockerfile for deploying BioSentinel to Hugging Face Spaces.

## Files

- `app.py` - FastAPI application with image analysis endpoint
- `requirements.txt` - Python dependencies
- `Dockerfile` - Docker configuration for Hugging Face Spaces

## Setup & Deployment

### 1. Install Hugging Face CLI
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
```

### 2. Login to Hugging Face
```bash
hf login
# When prompted for password, use your access token from https://huggingface.co/settings/tokens
```

### 3. Create and Configure Space

Go to https://huggingface.co/new-space and create a new Space:
- **Owner**: Your username
- **Space name**: kara
- **SDK**: Docker
- **Hardware**: Choose appropriate hardware

### 4. Clone and Deploy

```bash
# Clone the empty space repository
git clone https://huggingface.co/spaces/<your-username>/kara
cd kara

# Copy the files from bio-sentinal folder
cp -r ../bio-sentinal/* .

# Or manually copy these files:
# - app.py
# - requirements.txt
# - Dockerfile

# Commit and push
git add .
git commit -m "Add BioSentinel FastAPI application"
git push
```

## Local Testing

```bash
# Build and run locally
docker build -t biosentinel .
docker run -p 7860:7860 biosentinel

# Test the endpoint
curl http://localhost:7860/api/health
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/classify/image/analyze` - Image analysis (upload file as `file` parameter)
