import axios from 'axios';

// GBIF API configuration
const GBIF_BASE_URL = 'https://api.gbif.org/v1/occurrence/search';
const ML_API_URL = process.env.ML_API_URL;

// Endangered species list (from Python version)
const ENDANGERED_SPECIES = new Set([
    "Panthera tigris",  // Tiger
    "Panthera leo",     // Lion
    "Panthera onca",    // Jaguar
    "Snow Leopard",      // Uncia uncia
    "Elephas maximus",   // Asian Elephant
    "Rhinoceros unicornis",  // Indian Rhino
    "Gorilla beringei",  // Mountain Gorilla
    "Pongo abelii",      // Sumatran Orangutan
    "Ailuropoda melanoleuca",  // Giant Panda
    "Vultur gryphus",    // Andean Condor
    "Aquila chrysaetos", // Golden Eagle
    "Crocodylus niloticus",  // Nile Crocodile
    "Python reticulatus", // Reticulated Python
    "Macaca fascicularis",  // Crab-eating Macaque
]);

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
        return 4; // Default fallback
    }
};

/**
 * Calculate human proximity heuristic
 */
export const calculateHumanProximity = (lat, lon) => {
    // Simplified heuristic - in production use settlement databases
    return 0.7;
};

/**
 * Check if species is endangered
 */
export const isEndangered = (species) => {
    return ENDANGERED_SPECIES.has(species);
};

/**
 * GBIF Risk Scoring Algorithm (same as Python version)
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
        reasons.push(`Major surge in sightings (${trendRatio.toFixed(1)}x average)`);
    } else if (trendRatio >= 2.0) {
        score += 1.2;
        reasons.push(`Unusual increase in sightings (${trendRatio.toFixed(1)}x average)`);
    } else if (trendRatio < 0.5) {
        score += 1.0;
        reasons.push(`Decline in sightings (${trendRatio.toFixed(1)}x average)`);
    }
    
    // Human proximity
    if (humanProximity >= 0.7) {
        score += 0.8;
        reasons.push("Near human-populated areas");
    } else if (humanProximity >= 0.4) {
        score += 0.4;
        reasons.push("Moderate proximity to settlements");
    }
    
    // Determine risk level
    let level = 'Positive';
    if (score >= 3.0) level = 'Critical';
    else if (score >= 2.0) level = 'High';
    else if (score >= 1.0) level = 'At Risk';
    
    return {
        riskScore: Math.round(score * 100) / 100,
        riskLevel: level,
        reason: reasons,
        trendRatio: Math.round(trendRatio * 100) / 100,
        observations: recentCount
    };
};

/**
 * Full GBIF classification (async)
 */
export const gbifClassify = async (species, lat, lon, radius = 25) => {
    if (ML_API_URL) {
        try {
            const baseUrl = ML_API_URL.replace(/\/+$/, '');
            const response = await axios.post(
                `${baseUrl}/gbif/classify`,
                { species, lat, lon, radius }
            );
            return response.data;
        } catch (error) {
            console.error('ML API Error:', error.message);
        }
    }

    // Fetch recent and historical data
    const [recentRecords, historicalAvg] = await Promise.all([
        fetchGBIFOccurrences(species, lat, lon, radius),
        getHistoricalAverage(species, lat, lon, radius)
    ]);
    
    const recentCount = recentRecords.length;
    const endangered = isEndangered(species);
    const humanProximity = calculateHumanProximity(lat, lon);
    
    return calculateGBIFRiskScore(recentCount, historicalAvg, endangered, humanProximity);
};

/**
 * Generate GBIF-based alerts
 */
export const generateGBIFAlerts = async (species, lat, lon) => {
    const riskData = await gbifClassify(species, lat, lon);
    const reasons = riskData.reason || riskData.reasons || [];
    
    if (riskData.riskScore >= 1.0) {
        return [{
            type: 'Species Activity',
            level: riskData.riskLevel,
            icon: 'eco',
            title: `${species} Activity Alert`,
            description: reasons.join('. '),
            time: 'Just now',
            location: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
            confidence: `${Math.min(riskData.riskScore * 30, 99)}%`,
            source: 'GBIF ML Analysis',
            observations: riskData.observations,
            trendRatio: riskData.trendRatio
        }];
    }
    
    return [];
};

export default {
    fetchGBIFOccurrences,
    getHistoricalAverage,
    isEndangered,
    calculateHumanProximity,
    calculateGBIFRiskScore,
    gbifClassify,
    generateGBIFAlerts
};
