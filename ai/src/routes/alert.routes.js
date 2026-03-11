import express from 'express';
import alertService from '../services/alertService.js';
import gbifService from '../../gbif_alert_service.js';

const router = express.Router();

// GBIF Classification Endpoint (matches Python API)
router.post('/gbif/classify', async (req, res) => {
    try {
        const { species, lat, lon, radius } = req.body;
        
        if (!species || !lat || !lon) {
            return res.status(400).json({ 
                error: 'Missing required fields: species, lat, lon' 
            });
        }
        
        const result = await gbifService.gbifClassify(species, lat, lon, radius || 25);
        
        res.json(result);
    } catch (error) {
        console.error('GBIF classification error:', error);
        res.status(500).json({ error: 'Classification failed' });
    }
});

// GBIF Species Search
router.get('/gbif/search', async (req, res) => {
    try {
        const { q, limit } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Missing query parameter: q' });
        }
        
        const response = await fetch(
            `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(q)}&limit=${limit || 10}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('GBIF search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get all alerts (from file storage)
router.get('/', async (req, res) => {
    try {
        const dbAlerts = await alertService.fetchAlertsFromDatabase();
        
        if (dbAlerts && dbAlerts.length > 0) {
            // Format alerts for frontend
            const alerts = dbAlerts.map(doc => ({
                id: doc.id,
                type: doc.type || 'INFO',
                level: doc.level || 'MODERATE',
                category: doc.category || 'General',
                title: doc.title,
                description: doc.description,
                timestamp: doc.createdAt || new Date().toISOString(),
                location: doc.location,
                lat: doc.lat,
                lon: doc.lon,
                confidence: doc.confidence || 85,
                source: doc.source || 'User Report',
                urgency: doc.urgency || 'MODERATE',
                affectedSpecies: doc.affectedSpecies || [],
                actions: doc.actions || [],
                reportedBy: doc.reportedBy || 'Anonymous'
            }));
            return res.json(alerts);
        }
        
        // Return initial mock alerts if no database alerts
        const mockAlerts = alertService.generateInitialAlerts();
        res.json(mockAlerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        // Fall back to initial mock data
        res.json(alertService.generateInitialAlerts());
    }
});

// Get danger zones
router.get('/danger-zones', async (req, res) => {
    try {
        const dangerZones = alertService.getDangerZones();
        res.json(dangerZones);
    } catch (error) {
        console.error('Error fetching danger zones:', error);
        res.json(alertService.getDangerZones());
    }
});

// Get satellite/MOSDAC data
router.get('/mosdac', async (req, res) => {
    try {
        const mosdacData = alertService.getMosdacData();
        res.json(mosdacData);
    } catch (error) {
        console.error('Error fetching MOSDAC data:', error);
        res.json(alertService.getMosdacData());
    }
});

// Process new alerts (fetch from NASA FIRMS)
router.post('/process', async (req, res) => {
    try {
        const result = await alertService.processAlerts();
        res.json({
            success: true,
            riskAnalysis: result
        });
    } catch (error) {
        console.error('Error processing alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new alert from user report
router.post('/', async (req, res) => {
    try {
        const alertData = req.body;
        
        // Create the alert object
        const newAlert = {
            type: alertData.type || 'USER_REPORT',
            level: mapSeverityToLevel(alertData.severity),
            category: alertData.category || 'General',
            title: alertData.title,
            description: alertData.description,
            location: alertData.location,
            lat: alertData.lat || 0,
            lon: alertData.lon || 0,
            confidence: 95,
            source: 'User Report',
            urgency: alertData.severity === 'critical' ? 'IMMEDIATE' : 
                    alertData.severity === 'high' ? 'HIGH' : 
                    alertData.severity === 'moderate' ? 'MODERATE' : 'LOW',
            affectedSpecies: alertData.affectedSpecies || [],
            actions: generateActions(alertData.category, alertData.severity),
            reportedBy: alertData.reportedBy || 'Anonymous'
        };
        
        // Save to database/file
        const saved = await alertService.saveAlertToDatabase(newAlert);
        
        if (saved) {
            // Broadcast to all connected clients via Socket.io
            const io = req.app.locals.io;
            if (io) {
                io.to('alerts-room').emit('new-alert', saved);
                console.log('Broadcasted new alert to all clients:', saved.id);
            }
            
            res.json({
                success: true,
                alert: saved,
                message: 'Alert created and broadcasted to all users'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to save alert'
            });
        }
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get risk analysis
router.get('/risk-analysis', async (req, res) => {
    try {
        const fireData = await alertService.fetchFireData('africa', 1);
        const analysis = alertService.calculateRiskLevel(fireData, null, null);
        res.json(analysis);
    } catch (error) {
        console.error('Error calculating risk analysis:', error);
        res.json({
            level: 'Low',
            color: '#22ff88',
            riskScore: 0,
            factors: []
        });
    }
});

// Helper function to map severity to level
function mapSeverityToLevel(severity) {
    const mapping = {
        'critical': 'CRITICAL',
        'high': 'HIGH',
        'moderate': 'MODERATE',
        'low': 'LOW'
    };
    return mapping[severity?.toLowerCase()] || 'MODERATE';
}

// Helper function to generate recommended actions
function generateActions(category, severity) {
    const baseActions = {
        'Pollution Event': ['Notify pollution control board', 'Deploy cleanup team', 'Alert downstream communities'],
        'Species Sighting': ['Document sighting', 'Update population estimates', 'Monitor movement patterns'],
        'Illegal Activity': ['Alert forest officials', 'Document evidence', 'Coordinate with authorities'],
        'Disease': ['Sample collection', 'Notify veterinary team', 'Quarantine area'],
        'Infrastructure': ['Log maintenance request', 'Alert maintenance team', 'Secure area'],
        'General': ['Document observation', 'Update records', 'Monitor for changes']
    };
    
    const actions = baseActions[category] || baseActions['General'];
    
    if (severity === 'critical' || severity === 'high') {
        return ['URGENT: ' + actions[0], ...actions.slice(1)];
    }
    
    return actions;
}

export default router;
