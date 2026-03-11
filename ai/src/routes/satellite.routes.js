import express from 'express';
import axios from 'axios';
import { mosdacService } from '../services/mosdacService.js';
import { gangaBufferService } from '../services/gangaBufferService.js';

const router = express.Router();

// MOSDAC Credentials from environment or defaults
const MOSDAC_USERNAME = process.env.MOSDAC_USERNAME || 'kakafudoariri';
const MOSDAC_PASSWORD = process.env.MOSDAC_PASSWORD || 'BoMb6291@nts';

// NASA FIRMS API (uses DEMO_KEY for free tier)
const NASA_FIRMS_API_KEY = process.env.NASA_FIRMS_API_KEY || 'DEMO_KEY';
const NASA_FIRMS_BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/region';

// Helper: Calculate risk from fire data
const calculateFireRisk = (fireData) => {
    if (!fireData || !fireData.hotspots) {
        return { hotspotCount: 0, riskLevel: 'Low' };
    }
    
    const hotspotCount = fireData.hotspots.length;
    let riskLevel = 'Low';
    
    if (hotspotCount > 20) {
        riskLevel = 'Critical';
    } else if (hotspotCount > 10) {
        riskLevel = 'High';
    } else if (hotspotCount > 5) {
        riskLevel = 'At Risk';
    } else if (hotspotCount > 0) {
        riskLevel = 'Low';
    }
    
    return { hotspotCount, riskLevel };
};

// Fetch fire data from NASA FIRMS for AOI
const fetchFireData = async (aoi) => {
    try {
        // Use bounding box for AOI query
        const response = await axios.get(
            `${NASA_FIRMS_BASE_URL}/world/VIIRS/1/1?day=nrt&geotiff=false`,
            {
                params: {
                    key: NASA_FIRMS_API_KEY
                }
            }
        );
        
        // Filter hotspots within AOI
        const hotspots = (response.data.hotspots || []).filter(hotspot => {
            return (
                hotspot.latitude >= aoi.minLat &&
                hotspot.latitude <= aoi.maxLat &&
                hotspot.longitude >= aoi.minLon &&
                hotspot.longitude <= aoi.maxLon
            );
        });
        
        return { hotspots };
    } catch (error) {
        console.error('NASA FIRMS Error:', error.message);
        // Return mock data for demo when API fails
        return {
            hotspots: [
                { latitude: (aoi.minLat + aoi.maxLat) / 2, longitude: (aoi.minLon + aoi.maxLon) / 2, brightness: 320 }
            ]
        };
    }
};

// Generate NDVI data (simulated for demo - real implementation needs Sentinel Hub API)
const generateNDVIData = (aoi) => {
    // In production, integrate with Sentinel Hub or Google Earth Engine
    // For demo, generate realistic NDVI value
    const ndvi = 0.3 + Math.random() * 0.5; // 0.3 to 0.8 range
    
    let status = 'Healthy';
    if (ndvi < 0.3) status = 'Stressed';
    else if (ndvi < 0.5) status = 'Moderate';
    else status = 'Healthy';
    
    return { ndvi, status };
};

// Generate land cover data (simulated)
const generateLandCoverData = (aoi) => {
    // In production, use ESA WorldCover API
    // For demo, return typical land cover type
    return {
        type: 'Forest/Non-Forest',
        forestPercentage: 35,
        dominantClass: 'Evergreen Broadleaf Forest'
    };
};

/**
 * POST /satellite/fetch
 * Fetch satellite data for a given AOI and layers
 */
router.post('/fetch', async (req, res) => {
    try {
        const { aoi, layers } = req.body;
        
        if (!aoi || !layers || layers.length === 0) {
            return res.status(400).json({ 
                error: 'Missing required fields: aoi, layers' 
            });
        }
        
        const result = {};
        let totalRiskScore = 0;
        let riskFactors = [];
        
        // Fetch fire data
        if (layers.includes('fire')) {
            const fireData = await fetchFireData(aoi);
            const fireRisk = calculateFireRisk(fireData);
            result.fire = {
                hotspotCount: fireRisk.hotspotCount,
                riskLevel: fireRisk.riskLevel,
                lastUpdate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6h ago
            };
            
            if (fireRisk.hotspotCount > 10) {
                totalRiskScore += 2;
                riskFactors.push('High fire activity');
            } else if (fireRisk.hotspotCount > 5) {
                totalRiskScore += 1;
                riskFactors.push('Moderate fire activity');
            }
        }
        
        // Fetch vegetation data
        if (layers.includes('vegetation')) {
            const ndviData = generateNDVIData(aoi);
            result.vegetation = {
                ndvi: ndviData.ndvi,
                status: ndviData.status,
                lastUpdate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
            };
            
            if (ndviData.ndvi < 0.3) {
                totalRiskScore += 1.5;
                riskFactors.push('Vegetation stress detected');
            }
        }
        
        // Fetch land cover data
        if (layers.includes('landcover')) {
            result.landcover = generateLandCoverData(aoi);
        }
        
        // Calculate combined risk level
        let riskLevel = 'Positive';
        if (totalRiskScore >= 3) riskLevel = 'Critical';
        else if (totalRiskScore >= 2) riskLevel = 'High';
        else if (totalRiskScore >= 1) riskLevel = 'At Risk';
        
        result.riskScore = totalRiskScore;
        result.riskLevel = riskLevel;
        result.riskFactors = riskFactors;
        result.aoi = aoi;
        result.timestamp = new Date().toISOString();
        
        res.json(result);
    } catch (error) {
        console.error('Satellite fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch satellite data' });
    }
});

/**
 * GET /satellite/layers
 * Get available satellite layers
 */
router.get('/layers', (req, res) => {
    res.json({
        layers: [
            {
                id: 'fire',
                name: 'Active Fire',
                source: 'NASA FIRMS',
                updateFrequency: '6 hours',
                description: 'Near-real-time fire detection from VIIRS satellite'
            },
            {
                id: 'vegetation',
                name: 'Vegetation Index (NDVI)',
                source: 'Sentinel-2',
                updateFrequency: '5-10 days',
                description: 'Normalized Difference Vegetation Index'
            },
            {
                id: 'landcover',
                name: 'Land Cover',
                source: 'ESA WorldCover',
                updateFrequency: 'Annual',
                description: 'Global land cover classification'
            },
            {
                id: 'mosdac',
                name: 'Ocean Color & Chlorophyll',
                source: 'MOSDAC EOS-06',
                updateFrequency: 'Daily',
                description: 'Satellite-derived ocean color and chlorophyll-a concentration from MOSDAC'
            }
        ]
    });
});

/**
 * POST /satellite/analyze/mosdac
 * Analyze satellite data from MOSDAC (Indian Ocean/Coastal)
 */
router.post('/analyze/mosdac', async (req, res) => {
    try {
        const { lat, lon, radius = 25 } = req.body;
        
        if (!lat || !lon) {
            return res.status(400).json({ 
                error: 'Missing required fields: lat, lon' 
            });
        }
        
        // Optional: Login to MOSDAC (if API requires authentication)
        // await mosdacService.login(MOSDAC_USERNAME, MOSDAC_PASSWORD);
        
        // Analyze location using MOSDAC data
        const result = await mosdacService.analyzeLocation(lat, lon, radius);
        
        res.json(result);
    } catch (error) {
        console.error('MOSDAC analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze MOSDAC data' });
    }
});

/**
 * GET /satellite/mosdac/chlorophyll
 * Get chlorophyll-a data from MOSDAC
 */
router.get('/mosdac/chlorophyll', async (req, res) => {
    try {
        const { lat, lon, radius = 25 } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ 
                error: 'Missing required query params: lat, lon' 
            });
        }
        
        const data = await mosdacService.getChlorophyllData(
            parseFloat(lat), 
            parseFloat(lon), 
            parseInt(radius)
        );
        
        res.json(data);
    } catch (error) {
        console.error('MOSDAC chlorophyll error:', error);
        res.status(500).json({ error: 'Failed to fetch chlorophyll data' });
    }
});

/**
 * GET /satellite/mosdac/ocean
 * Get ocean color data from MOSDAC
 */
router.get('/mosdac/ocean', async (req, res) => {
    try {
        const { lat, lon, radius = 25 } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ 
                error: 'Missing required query params: lat, lon' 
            });
        }
        
        const data = await mosdacService.getOceanColorData(
            parseFloat(lat), 
            parseFloat(lon), 
            parseInt(radius)
        );
        
        res.json(data);
    } catch (error) {
        console.error('MOSDAC ocean color error:', error);
        res.status(500).json({ error: 'Failed to fetch ocean color data' });
    }
});

// ===========================================
// GANGA BUFFER ZONE ANALYSIS ROUTES
// ===========================================

/**
 * GET /satellite/ganga/buffer
 * Get Ganga River buffer geometry (for visualization)
 */
router.get('/ganga/buffer', async (req, res) => {
    try {
        const { radius = 25 } = req.query;
        
        const buffer = gangaBufferService.createBuffer(parseInt(radius));
        
        if (buffer) {
            res.json({
                success: true,
                buffer: buffer,
                radiusKm: parseInt(radius)
            });
        } else {
            res.status(500).json({ error: 'Failed to create buffer' });
        }
    } catch (error) {
        console.error('Ganga buffer error:', error);
        res.status(500).json({ error: 'Failed to get Ganga buffer' });
    }
});

/**
 * POST /satellite/ganga/analyze
 * Analyze biodiversity within Ganga buffer zone
 */
router.post('/ganga/analyze', async (req, res) => {
    try {
        const { radius = 25, majorSpeciesOnly = false } = req.body;
        
        const result = await gangaBufferService.analyzeBufferZone(
            parseInt(radius),
            majorSpeciesOnly
        );
        
        res.json(result);
    } catch (error) {
        console.error('Ganga analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze Ganga buffer zone' });
    }
});

/**
 * GET /satellite/ganga/layers
 * Get available buffer zone layers
 */
router.get('/ganga/layers', (req, res) => {
    res.json({
        layers: [
            {
                id: 'ganga_buffer',
                name: 'Ganga Buffer Zone',
                source: 'ISRO/Natural Earth',
                description: 'Ecological buffer zone along Ganga River',
                radii: [5, 10, 25, 50],
                defaultRadius: 25
            },
            {
                id: 'biodiversity',
                name: 'Biodiversity Points',
                source: 'GBIF',
                description: 'Species occurrences within buffer zone',
                riskLevels: [
                    { level: 'RED', label: 'Critically Endangered', color: '#ef4444' },
                    { level: 'BLUE', label: 'Endangered', color: '#3b82f6' },
                    { level: 'YELLOW', label: 'Vulnerable', color: '#eab308' },
                    { level: 'GREEN', label: 'Least Concern', color: '#22c55e' }
                ]
            }
        ]
    });
});

/**
 * GET /satellite/mosdac/ganga
 * Get MOSDAC satellite data for Ganga River basin
 * Used by Alerts page
 */
router.get('/mosdac/ganga', async (req, res) => {
    try {
        // Ganga River basin coordinates (avg lat/lon)
        const gangaLat = 25.435;
        const gangaLon = 81.846;
        const radius = 50;
        
        const [chlorophyll, sst, oceanColor] = await Promise.all([
            mosdacService.getChlorophyllData(gangaLat, gangaLon, radius),
            mosdacService.getSSTData(gangaLat, gangaLon, radius),
            mosdacService.getOceanColorData(gangaLat, gangaLon, radius)
        ]);
        
        // Calculate overall risk
        let overallRisk = 'Stable';
        const riskScores = {
            'Critical': 4,
            'Endangered': 3,
            'Vulnerable': 2,
            'High': 2,
            'Stable': 0,
            'Normal': 0
        };
        
        const totalScore = (riskScores[chlorophyll.riskLevel] || 0) + 
                          (riskScores[sst.riskLevel] || 0);
        
        if (totalScore >= 4) overallRisk = 'Critical';
        else if (totalScore >= 2) overallRisk = 'Vulnerable';
        else overallRisk = 'Positive';
        
        res.json({
            chlorophyll,
            sst,
            oceanColor,
            overallRisk,
            location: {
                lat: gangaLat,
                lon: gangaLon,
                name: 'Ganga River Basin'
            },
            satellite: 'EOS-06',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('MOSDAC Ganga error:', error);
        // Return mock data on error
        res.json({
            chlorophyll: { value: 3.2, unit: 'mg/m³', riskLevel: 'Vulnerable', source: 'MOSDAC EOS-06 (Mock)' },
            sst: { value: 28.5, unit: '°C', riskLevel: 'Normal', source: 'MOSDAC EOS-04 (Mock)' },
            oceanColor: { chlor_a: 3.2, Kd_490: 0.08, CDOM: 0.012 },
            overallRisk: 'Vulnerable',
            location: { lat: 25.435, lon: 81.846, name: 'Ganga River Basin' },
            satellite: 'EOS-06',
            isMock: true,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
