import sharp from 'sharp';

/**
 * Water Quality Analysis Service
 * Analyzes river water photos for turbidity, color, foam, and algae indicators
 */

// CPCB water quality classification (simplified)
const CPCB_STATIONS = [
    { name: 'Haridwar', lat: 29.9457, lon: 78.1642 },
    { name: 'Kanpur', lat: 26.4475, lon: 80.4456 },
    { name: 'Allahabad', lat: 25.4358, lon: 81.8464 },
    { name: 'Varanasi', lat: 25.3176, lon: 83.0103 },
    { name: 'Patna', lat: 25.5941, lon: 85.1376 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 }
];

// Analyze image for water quality indicators
async function analyzeImage(imageBuffer) {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        
        // Get average color properties
        const { dominantColor, brightness, colorVariance } = await extractColorProperties(imageBuffer);
        
        // Calculate turbidity indicator (higher color variance = higher turbidity)
        const turbidityScore = Math.min(100, (colorVariance / 50) * 100);
        
        // Calculate color indicators
        const waterColorScore = analyzeWaterColor(dominantColor);
        
        // Detect potential foam/algae indicators
        const foamAlgaeScore = detectFoamAlgae(imageBuffer);
        
        return {
            dominantColor,
            brightness,
            colorVariance,
            turbidityScore,
            waterColorScore,
            foamAlgaeScore
        };
    } catch (error) {
        console.error('Image analysis error:', error);
        // Return default values on error
        return {
            dominantColor: { r: 100, g: 150, b: 200 },
            brightness: 128,
            colorVariance: 30,
            turbidityScore: 50,
            waterColorScore: 50,
            foamAlgaeScore: 20
        };
    }
}

// Extract color properties from image
async function extractColorProperties(imageBuffer) {
    try {
        // Resize for faster processing
        const resized = await sharp(imageBuffer)
            .resize(100, 100, { fit: 'inside' })
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data, info } = resized;
        let r = 0, g = 0, b = 0;
        let rSq = 0, gSq = 0, bSq = 0;
        const pixelCount = info.width * info.height;

        for (let i = 0; i < data.length; i += 3) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            rSq += data[i] * data[i];
            gSq += data[i + 1] * data[i + 1];
            bSq += data[i + 2] * data[i + 2];
        }

        const avgR = r / pixelCount;
        const avgG = g / pixelCount;
        const avgB = b / pixelCount;

        // Calculate color variance
        const rVar = Math.sqrt((rSq / pixelCount) - (avgR * avgR));
        const gVar = Math.sqrt((gSq / pixelCount) - (avgG * avgG));
        const bVar = Math.sqrt((bSq / pixelCount) - (avgB * avgB));
        const colorVariance = (rVar + gVar + bVar) / 3;

        // Calculate brightness
        const brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114);

        return {
            dominantColor: { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) },
            brightness: Math.round(brightness),
            colorVariance: Math.round(colorVariance)
        };
    } catch (error) {
        console.error('Color extraction error:', error);
        return {
            dominantColor: { r: 100, g: 150, b: 200 },
            brightness: 128,
            colorVariance: 30
        };
    }
}

// Analyze water color for pollution indicators
function analyzeWaterColor(color) {
    const { r, g, b } = color;
    
    // Calculate color ratios
    const greenRatio = g / (r + g + b + 0.001);
    const brownRatio = (r + b) / (2 * g + 0.001);
    
    // Clean water: blue-green, low brown
    // Polluted water: brown, gray, high turbidity
    
    let score = 100;
    
    // Brown/gray water indicates pollution
    if (brownRatio > 1.2) score -= 30;
    else if (brownRatio > 1.0) score -= 15;
    
    // Very dark water
    const brightness = (r + g + b) / 3;
    if (brightness < 50) score -= 20;
    
    // Unusually green (algae bloom)
    if (greenRatio > 0.4 && brightness > 100) score -= 15;
    
    return Math.max(0, Math.min(100, score));
}

// Detect foam and algae indicators
async function detectFoamAlgae(imageBuffer) {
    try {
        // Simplified detection using brightness variance in different regions
        const { colorVariance } = await extractColorProperties(imageBuffer);
        
        // High variance can indicate foam, debris, or algae patches
        let foamScore = 0;
        
        if (colorVariance > 60) foamScore += 40;
        if (colorVariance > 40) foamScore += 30;
        if (colorVariance > 25) foamScore += 15;
        
        return Math.min(100, foamScore);
    } catch (error) {
        return 20;
    }
}

// Find nearest CPCB station
function findNearestCPCBStation(lat, lon) {
    let nearest = null;
    let minDist = Infinity;

    for (const station of CPCB_STATIONS) {
        const dist = calculateDistance(lat, lon, station.lat, station.lon);
        if (dist < minDist) {
            minDist = dist;
            nearest = station;
        }
    }

    return {
        station: nearest,
        distance: Math.round(minDist)
    };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get simulated CPCB water quality data
function getCPCBData(stationName) {
    // Simulated data based on typical Namami Gange reports
    const stationData = {
        'Haridwar': { do: 8.2, bod: 2.1, coliform: 1200, ph: 7.4 },
        'Kanpur': { do: 6.5, bod: 3.8, coliform: 8500, ph: 7.2 },
        'Allahabad': { do: 7.1, bod: 3.2, coliform: 5200, ph: 7.3 },
        'Varanasi': { do: 6.8, bod: 3.5, coliform: 6800, ph: 7.2 },
        'Patna': { do: 7.4, bod: 2.8, coliform: 4500, ph: 7.4 },
        'Kolkata': { do: 5.8, bod: 4.5, coliform: 12000, ph: 7.1 }
    };

    return stationData[stationName] || { do: 7.0, bod: 3.0, coliform: 5000, ph: 7.3 };
}

// Calculate overall water status
function calculateWaterStatus(imageAnalysis, cpcbData) {
    // Image analysis scores (0-100, higher is better)
    const colorScore = imageAnalysis.waterColorScore;
    const turbidityScore = 100 - imageAnalysis.turbidityScore; // Invert - lower turbidity is better
    const foamAlgaeScore = 100 - imageAnalysis.foamAlgaeScore; // Invert

    // CPCB data scores (based on BIS standards)
    const doScore = Math.min(100, (cpcbData.do / 10) * 100); // DO: higher is better
    const bodScore = Math.min(100, (5 / Math.max(cpcbData.bod, 0.1)) * 100); // BOD: lower is better
    const coliformScore = Math.min(100, (5000 / Math.max(cpcbData.coliform, 100)) * 100); // Lower is better

    // Weighted average
    const imageWeight = 0.5;
    const cpcbWeight = 0.5;

    const imageAvg = (colorScore + turbidityScore + foamAlgaeScore) / 3;
    const cpcbAvg = (doScore + bodScore + coliformScore) / 3;

    const overallScore = (imageAvg * imageWeight) + (cpcbAvg * cpcbWeight);

    // Determine status category
    let status, statusEmoji;
    if (overallScore >= 70) {
        status = 'Good';
        statusEmoji = '🟢';
    } else if (overallScore >= 40) {
        status = 'Average';
        statusEmoji = '🟡';
    } else {
        status = 'Poor';
        statusEmoji = '🔴';
    }

    return {
        status,
        statusEmoji,
        score: Math.round(overallScore),
        breakdown: {
            image: {
                colorScore: Math.round(colorScore),
                turbidityScore: Math.round(turbidityScore),
                foamAlgaeScore: Math.round(foamAlgaeScore),
                average: Math.round(imageAvg)
            },
            cpcb: {
                do: cpcbData.do,
                bod: cpcbData.bod,
                coliform: cpcbData.coliform,
                ph: cpcbData.ph,
                score: Math.round(cpcbAvg)
            }
        }
    };
}

// Main analysis function
export async function analyzeWaterQuality(file, lat, lon, stretchId) {
    try {
        const imageBuffer = file.buffer;
        
        // Analyze image
        const imageAnalysis = await analyzeImage(imageBuffer);
        
        // Get nearest CPCB station
        const nearestStation = findNearestCPCBStation(lat, lon);
        const cpcbData = getCPCBData(nearestStation.station?.name || 'Haridwar');
        
        // Calculate overall status
        const status = calculateWaterStatus(imageAnalysis, cpcbData);

        return {
            success: true,
            location: {
                lat,
                lon,
                stretchId,
                nearestCPCBStation: nearestStation.station?.name || 'Unknown',
                distanceToStation: nearestStation.distance
            },
            waterStatus: status.status,
            statusEmoji: status.statusEmoji,
            waterQualityScore: status.score,
            imageAnalysis: {
                dominantColor: imageAnalysis.dominantColor,
                brightness: imageAnalysis.brightness,
                turbidityIndicator: Math.round(imageAnalysis.turbidityScore),
                foamAlgaeIndicator: Math.round(imageAnalysis.foamAlgaeScore)
            },
            cpcbData: {
                station: nearestStation.station?.name || 'N/A',
                dissolvedOxygen: cpcbData.do,
                biochemicalOxygenDemand: cpcbData.bod,
                totalColiform: cpcbData.coliform,
                ph: cpcbData.ph
            },
            statusDetails: status.breakdown,
            recommendations: getRecommendations(status.status),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Water quality analysis error:', error);
        throw error;
    }
}

// Get recommendations based on water status
function getRecommendations(status) {
    const recommendations = {
        'Good': [
            'Continue monitoring activities',
            'Report any changes in water quality',
            'Support conservation efforts in the area'
        ],
        'Average': [
            'Regular monitoring recommended',
            'Check for upstream pollution sources',
            'Report to local pollution control board if conditions worsen'
        ],
        'Poor': [
            'Urgent attention required',
            'Report to CPCB/SPC immediately',
            'Avoid direct contact with water',
            'Document pollution sources for authorities'
        ]
    };

    return recommendations[status] || [];
}
