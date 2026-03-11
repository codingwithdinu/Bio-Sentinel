import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GBIF API configuration
const GBIF_BASE_URL = 'https://api.gbif.org/v1/occurrence/search';

// Endangered species list
const ENDANGERED_SPECIES = new Set([
    "Panthera tigris", "Panthera leo", "Panthera onca", "Snow Leopard",
    "Elephas maximus", "Rhinoceros unicornis", "Gorilla beringei",
    "Pongo abelii", "Ailuropoda melanoleuca", "Vultur gryphus",
    "Aquila chrysaetos", "Crocodylus niloticus", "Python reticulatus"
]);

// File-based storage for alerts
const ALERTS_FILE = path.join(__dirname, '../../data/alerts.json');

// Ensure data directory exists
const dataDir = path.dirname(ALERTS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize alerts file if it doesn't exist
if (!fs.existsSync(ALERTS_FILE)) {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify([]));
}

/**
 * Generate initial alerts for the Ganga River system
 */
export const generateInitialAlerts = () => {
    return [
        {
            id: 'alert-001',
            type: 'DANGER',
            category: 'Pollution Event',
            level: 'CRITICAL',
            title: 'Industrial Discharge Detected',
            description: 'High levels of industrial pollutants detected in the river segment near Kanpur. Immediate action required.',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            location: 'Ganga River, Kanpur',
            lat: 26.4499,
            lon: 80.3319,
            confidence: 95,
            source: 'MOSDAC EOS-06 Satellite',
            urgency: 'IMMEDIATE',
            affectedSpecies: ['Gangetic Dolphin', 'Freshwater Turtles', 'Riverine Fish'],
            actions: ['Notify pollution control board', 'Deploy cleanup team', 'Alert downstream communities']
        },
        {
            id: 'alert-002',
            type: 'WARNING',
            category: 'Species Distress',
            level: 'HIGH',
            title: 'Gangetic Dolphin Distress Signal',
            description: 'Acoustic monitoring detected distress calls from dolphin pods in the Patna region.',
            timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
            location: 'Ganga River, Patna',
            lat: 25.5941,
            lon: 85.1376,
            confidence: 88,
            source: 'Acoustic Monitoring Network',
            urgency: 'HIGH',
            affectedSpecies: ['Gangetic River Dolphin (Platanista gangetica)'],
            actions: ['Deploy rescue team', 'Water quality check', 'Veterinarian on standby']
        },
        {
            id: 'alert-003',
            type: 'INFO',
            category: 'Population Change',
            level: 'MODERATE',
            title: 'Tiger Sighting Increase',
            description: 'Unusual increase in tiger sightings near the river corridor. Population may be expanding.',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
            location: 'Corbett to Pilibhit Corridor',
            lat: 29.1000,
            lon: 79.0500,
            confidence: 85,
            source: 'Camera Trap Network - GBIF Verified',
            urgency: 'LOW',
            affectedSpecies: ['Bengal Tiger'],
            actions: ['Update population estimates', 'Monitor movement patterns']
        },
        {
            id: 'alert-004',
            type: 'POSITIVE',
            category: 'Conservation Success',
            level: 'POSITIVE',
            title: 'Gharial Population Recovery',
            description: 'Significant increase in Gharial nesting sites detected along the Chambal tributary.',
            timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
            location: 'Chambal River, Morena',
            lat: 26.8400,
            lon: 77.8000,
            confidence: 92,
            source: 'Wildlife Survey Team',
            urgency: 'LOW',
            affectedSpecies: ['Gharial (Gavialis gangeticus)'],
            actions: ['Continue monitoring', 'Document nesting sites']
        },
        {
            id: 'alert-005',
            type: 'WARNING',
            category: 'Water Quality',
            level: 'WARNING',
            title: 'Elevated Chlorophyll Levels',
            description: 'Satellite data shows elevated chlorophyll-a concentrations indicating potential algal bloom.',
            timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
            location: 'Ganga River, Allahabad',
            lat: 25.4350,
            lon: 81.8460,
            confidence: 78,
            source: 'MOSDAC Ocean Color Sensor',
            urgency: 'MODERATE',
            affectedSpecies: ['Aquatic Plants', 'Fish', 'Dolphins'],
            actions: ['Water sampling', 'DO level monitoring', 'Public advisory']
        },
        {
            id: 'alert-006',
            type: 'DANGER',
            category: 'Flood Warning',
            level: 'HIGH',
            title: 'Monsoon Flood Risk',
            description: 'Met department warns of heavy rainfall upstream. Flood risk for riverine communities.',
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            location: 'Upper Ganga Basin',
            lat: 30.5000,
            lon: 78.5000,
            confidence: 90,
            source: 'Indian Meteorological Department',
            urgency: 'HIGH',
            affectedSpecies: ['All Riverine Species', 'Migratory Birds'],
            actions: ['Flood alert to communities', 'Wildlife relocation preparation']
        }
    ];
};

/**
 * Get danger zones for the Ganga River
 */
export const getDangerZones = () => {
    return [
        {
            id: 'zone-001',
            name: 'Kanpur Industrial Zone',
            lat: 26.4499,
            lon: 80.3319,
            riskLevel: 'CRITICAL',
            type: 'Industrial Pollution',
            description: 'High concentration of tanneries and chemical industries',
            activeAlerts: 3
        },
        {
            id: 'zone-002',
            name: 'Allahabad Confluence',
            lat: 25.4350,
            lon: 81.8460,
            riskLevel: 'MODERATE',
            type: 'Religious Activity Impact',
            description: 'High Pilgrim activity during festivals',
            activeAlerts: 1
        },
        {
            id: 'zone-003',
            name: 'Patna Urban Section',
            lat: 25.5941,
            lon: 85.1376,
            riskLevel: 'HIGH',
            type: 'Urban Runoff',
            description: 'Sewage and urban runoff contamination',
            activeAlerts: 2
        }
    ];
};

/**
 * Get MOSDAC satellite data
 */
export const getMosdacData = () => {
    return {
        chlorophyll: { value: 5.2, riskLevel: 'WARNING' },
        sst: { value: 29.8, riskLevel: 'MODERATE' },
        turbidity: { value: 45, riskLevel: 'HIGH' },
        dissolvedOxygen: { value: 6.2, riskLevel: 'MODERATE' },
        overallRisk: 'MODERATE'
    };
};

/**
 * Fetch occurrences from GBIF
 */
export const fetchGBIFOccurrences = async (species, lat, lon, radius = 25, limit = 300) => {
    try {
        const params = {
            scientificName: species,
            decimalLatitude: lat,
            decimalLongitude: lon,
            radius: radius,
            limit: limit
        };
        
        const response = await axios.get(GBIF_BASE_URL, { params, timeout: 30000 });
        return response.data.results || [];
    } catch (error) {
        console.error('GBIF API Error:', error.message);
        return [];
    }
};

/**
 * Get historical average (older data)
 */
export const getHistoricalAverage = async (species, lat, lon, radius = 25) => {
    try {
        const toDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const params = {
            scientificName: species,
            decimalLatitude: lat,
            decimalLongitude: lon,
            radius: radius,
            limit: 100,
            toDate: toDate
        };
        
        const response = await axios.get(GBIF_BASE_URL, { params, timeout: 30000 });
        return response.data.results?.length || 4;
    } catch (error) {
        return 4;
    }
};

/**
 * Check if species is endangered
 */
export const isEndangered = (species) => {
    return ENDANGERED_SPECIES.has(species);
};

/**
 * Calculate human proximity heuristic
 */
export const calculateHumanProximity = (lat, lon) => {
    return 0.7; // Simplified - in production use settlement databases
};

/**
 * GBIF-based Risk Scoring Algorithm
 */
export const calculateGBIFRiskScore = (recentCount, historicalAvg, endangered, humanProximity) => {
    let score = 0;
    const reasons = [];
    const trendRatio = recentCount / Math.max(historicalAvg, 1);
    
    // Endangered check
    if (endangered) {
        score += 1.5;
        reasons.push("Endangered species detected");
    }
    
    // Trend analysis
    if (trendRatio >= 3.0) {
        score += 1.5;
        reasons.push(`Major surge (${trendRatio.toFixed(1)}x average)`);
    } else if (trendRatio >= 2.0) {
        score += 1.2;
        reasons.push(`Unusual increase (${trendRatio.toFixed(1)}x average)`);
    } else if (trendRatio < 0.5) {
        score += 1.0;
        reasons.push(`Decline in sightings (${trendRatio.toFixed(1)}x average)`);
    }
    
    // Human proximity
    if (humanProximity >= 0.7) {
        score += 0.8;
        reasons.push("Near human areas");
    } else if (humanProximity >= 0.4) {
        score += 0.4;
        reasons.push("Moderate proximity");
    }
    
    // Determine risk level
    let level = 'Positive';
    if (score >= 3.0) level = 'Critical';
    else if (score >= 2.0) level = 'High';
    else if (score >= 1.0) level = 'At Risk';
    
    return {
        score: Math.round(score * 100) / 100,
        level,
        reasons,
        trendRatio: Math.round(trendRatio * 100) / 100,
        observations: recentCount
    };
};

/**
 * Full GBIF classification
 */
export const gbifClassify = async (species, lat, lon, radius = 25) => {
    const [recentRecords, historicalAvg] = await Promise.all([
        fetchGBIFOccurrences(species, lat, lon, radius),
        getHistoricalAverage(species, lat, lon, radius)
    ]);
    
    const recentCount = recentRecords.length;
    const endangered = isEndangered(species);
    const humanProximity = calculateHumanProximity(lat, lon);
    
    return calculateGBIFRiskScore(recentCount, historicalAvg, endangered, humanProximity);
};

// Save alert to file-based storage
export const saveAlertToDatabase = async (alertData) => {
    try {
        const alerts = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
        const newAlert = {
            ...alertData,
            id: alertData.id || `alert-${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        alerts.unshift(newAlert);
        fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
        return newAlert;
    } catch (error) {
        console.error('Error saving alert:', error.message);
        return null;
    }
};

// Fetch alerts from file-based storage
export const fetchAlertsFromDatabase = async () => {
    try {
        const alerts = JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
        return alerts;
    } catch (error) {
        console.error('Error fetching alerts:', error.message);
        return [];
    }
};

// Process and generate GBIF alerts
export const processGBIFAlerts = async (species, lat, lon) => {
    const riskData = await gbifClassify(species, lat, lon);
    
    if (riskData.score >= 1.0) {
        const alert = {
            type: 'Species Activity',
            level: riskData.level,
            icon: 'eco',
            title: `${species} Activity Alert`,
            description: riskData.reasons.join('. '),
            time: 'Just now',
            location: `${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E`,
            confidence: `${Math.min(riskData.score * 30, 99)}%`,
            source: 'GBIF ML Analysis',
            observations: riskData.observations,
            trendRatio: riskData.trendRatio
        };
        
        await saveAlertToDatabase(alert);
    }
    
    return riskData;
};

export default {
    generateInitialAlerts,
    getDangerZones,
    getMosdacData,
    fetchGBIFOccurrences,
    getHistoricalAverage,
    isEndangered,
    calculateHumanProximity,
    calculateGBIFRiskScore,
    gbifClassify,
    saveAlertToDatabase,
    fetchAlertsFromDatabase,
    processGBIFAlerts
};
