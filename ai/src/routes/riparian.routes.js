import express from 'express';
import multer from 'multer';
import { analyzeWaterQuality } from '../services/waterQualityService.js';
import { getSpeciesByWaterStatus, getBaselineSpecies } from '../services/speciesToleranceService.js';
import { getGangaStretchInfo } from '../services/gangaStretchService.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * POST /water-status/analyze
 * Analyze water quality from uploaded photo
 */
router.post('/water-status/analyze', upload.single('image'), async (req, res) => {
    try {
        const { lat, lon, stretchId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Location (lat, lon) is required' });
        }

        const result = await analyzeWaterQuality(file, parseFloat(lat), parseFloat(lon), stretchId);

        res.json(result);
    } catch (error) {
        console.error('Water status analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze water quality' });
    }
});

/**
 * POST /species/estimate
 * Estimate species richness based on water status
 */
router.post('/species/estimate', async (req, res) => {
    try {
        const { waterStatus, stretchId } = req.body;

        if (!waterStatus || !stretchId) {
            return res.status(400).json({ error: 'Missing required fields: waterStatus, stretchId' });
        }

        const baseline = getBaselineSpecies(stretchId);
        const speciesRichness = getSpeciesByWaterStatus(stretchId, waterStatus);

        res.json({
            stretchId,
            waterStatus,
            baseline: {
                totalSpecies: baseline.length,
                species: baseline
            },
            estimatedRichness: speciesRichness
        });
    } catch (error) {
        console.error('Species estimation error:', error);
        res.status(500).json({ error: 'Failed to estimate species' });
    }
});

/**
 * GET /ganga/stretches
 * Get all Ganga river stretches with their info
 */
router.get('/ganga/stretches', async (req, res) => {
    try {
        const stretches = getGangaStretchInfo();

        res.json({
            stretches: stretches,
            count: stretches.length
        });
    } catch (error) {
        console.error('Ganga stretches error:', error);
        res.status(500).json({ error: 'Failed to get Ganga stretches' });
    }
});

/**
 * GET /ganga/stretch/:id
 * Get specific stretch info
 */
router.get('/ganga/stretch/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stretches = getGangaStretchInfo();
        const stretch = stretches.find(s => s.id === id);

        if (!stretch) {
            return res.status(404).json({ error: 'Stretch not found' });
        }

        res.json(stretch);
    } catch (error) {
        console.error('Ganga stretch error:', error);
        res.status(500).json({ error: 'Failed to get stretch info' });
    }
});

/**
 * POST /ganga/full-analysis
 * Complete analysis: water status + species estimate
 */
router.post('/ganga/full-analysis', upload.single('image'), async (req, res) => {
    try {
        const { lat, lon, stretchId } = req.body;
        const file = req.file;

        if (!lat || !lon || !stretchId) {
            return res.status(400).json({ error: 'Missing required fields: lat, lon, stretchId' });
        }

        // Step 1: Analyze water quality
        const waterResult = await analyzeWaterQuality(file, parseFloat(lat), parseFloat(lon), stretchId);

        // Step 2: Get species estimate based on water status
        const baseline = getBaselineSpecies(stretchId);
        const speciesData = getSpeciesByWaterStatus(stretchId, waterResult.waterStatus);

        // Step 3: Get stretch info
        const stretches = getGangaStretchInfo();
        const stretchInfo = stretches.find(s => s.id === stretchId);

        res.json({
            location: {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                stretch: stretchInfo?.name || stretchId
            },
            waterAnalysis: waterResult,
            speciesAnalysis: {
                waterStatus: waterResult.waterStatus,
                baselineSpecies: baseline.length,
                estimatedRichness: speciesData.percentage,
                likelySpecies: speciesData.likely,
                unlikelySpecies: speciesData.unlikely
            },
            mapInfo: stretchInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Full analysis error:', error);
        res.status(500).json({ error: 'Failed to complete analysis' });
    }
});

export default router;
