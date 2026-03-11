/**
 * Ganga Stretch Service
 * Manages Ganga River segments for biodiversity analysis
 * Based on WII/ZSI reports and Namami Gange monitoring zones
 */

// Ganga River stretches with coordinates and biodiversity info
const GANGA_STRETCHES = [
    {
        id: 'upper',
        name: 'Upper Ganga',
        nameHindi: 'ऊपरी गंगा',
        description: 'From Gaumukh (Glacier source) to Haridwar',
        state: 'Uttarakhand',
        coordinates: {
            start: { lat: 30.9878, lon: 78.4968 },
            end: { lat: 29.9457, lon: 78.1642 }
        },
        length: '~290 km',
        baselineSpecies: 25,
        conservationStatus: 'Relatively Pristine',
        keySpecies: ['Gangetic Dolphin', 'Gharial', 'Golden Mahseer', 'Black Softshell Turtle'],
        activities: ['Pilgrimage', 'Tourism', 'Adventure Sports'],
        pollutionLevel: 'Low'
    },
    {
        id: 'middle-upper',
        name: 'Upper-Middle Ganga',
        nameHindi: 'ऊपरी-मध्य गंगा',
        description: 'From Haridwar to Kanpur',
        state: 'Uttarakhand, Uttar Pradesh',
        coordinates: {
            start: { lat: 29.9457, lon: 78.1642 },
            end: { lat: 26.4475, lon: 80.4456 }
        },
        length: '~420 km',
        baselineSpecies: 28,
        conservationStatus: 'Moderately Stressed',
        keySpecies: ['Gangetic Dolphin', 'Gharial', 'Indian Softshell Turtle', 'Rohu', 'Katla'],
        activities: ['Industrial', 'Agricultural', 'Urban'],
        pollutionLevel: 'Moderate'
    },
    {
        id: 'middle',
        name: 'Middle Ganga',
        nameHindi: 'मध्य गंगा',
        description: 'From Kanpray to Varanasi',
        state: 'Uttar Pradesh',
        coordinates: {
            start: { lat: 26.4475, lon: 80.4456 },
            end: { lat: 25.3176, lon: 83.0103 }
        },
        length: '~320 km',
        baselineSpecies: 30,
        conservationStatus: 'Stressed',
        keySpecies: ['Gangetic Dolphin', 'Gharial', 'Hilsa', 'Indian Marsh Crocodile'],
        activities: ['Industrial', 'Urban', 'Religious Tourism'],
        pollutionLevel: 'High'
    },
    {
        id: 'middle-lower',
        name: 'Lower-Middle Ganga',
        nameHindi: 'निचला-मध्य गंगा',
        description: 'From Varanasi to Patna',
        state: 'Uttar Pradesh, Bihar',
        coordinates: {
            start: { lat: 25.3176, lon: 83.0103 },
            end: { lat: 25.5941, lon: 85.1376 }
        },
        length: '~260 km',
        baselineSpecies: 26,
        conservationStatus: 'Stressed',
        keySpecies: ['Gangetic Dolphin', 'Smooth-coated Otter', 'Indian Softshell Turtle'],
        activities: ['Urban', 'Agricultural', 'Fishing'],
        pollutionLevel: 'High'
    },
    {
        id: 'lower',
        name: 'Lower Ganga',
        nameHindi: 'निचली गंगा',
        description: 'From Patna to Kolkata/Hooghly',
        state: 'Bihar, Jharkhand, West Bengal',
        coordinates: {
            start: { lat: 25.5941, lon: 85.1376 },
            end: { lat: 22.5726, lon: 88.3639 }
        },
        length: '~540 km',
        baselineSpecies: 32,
        conservationStatus: 'Heavily Stressed',
        keySpecies: ['Gangetic Dolphin', 'Hilsa', 'Indian Roofed Turtle', 'Smooth-coated Otter'],
        activities: ['Urban', 'Industrial', 'Fishing', 'Shipping'],
        pollutionLevel: 'Very High'
    },
    {
        id: 'delta',
        name: 'Ganga Delta',
        nameHindi: 'गंगा डेल्टा',
        description: 'Sundarbans delta region',
        state: 'West Bengal, Bangladesh',
        coordinates: {
            start: { lat: 22.5726, lon: 88.3639 },
            end: { lat: 21.5, lon: 89.5 }
        },
        length: '~250 km',
        baselineSpecies: 35,
        conservationStatus: 'Critical',
        keySpecies: ['Gangetic Dolphin', 'Sundarbans Crocodile', 'River Terrapin', 'Hilsa'],
        activities: ['Fishing', 'Shipping', 'Aquaculture'],
        pollutionLevel: 'Critical'
    }
];

// Stretch selection based on coordinates
export function getStretchByCoordinates(lat, lon) {
    // Define rough boundaries for each stretch
    const boundaries = [
        { maxLat: 31, maxLon: 79, id: 'upper' },
        { maxLat: 29.95, maxLon: 81, id: 'middle-upper' },
        { maxLat: 26.5, maxLon: 82, id: 'middle' },
        { maxLat: 25.6, maxLon: 87, id: 'middle-lower' },
        { maxLat: 25.6, maxLon: 90, id: 'lower' },
        { maxLat: 22.5, id: 'delta' }
    ];

    for (const boundary of boundaries) {
        if (lat <= boundary.maxLat && ( !boundary.maxLon || lon <= boundary.maxLon )) {
            return boundary.id;
        }
    }

    // Default to middle stretch if no match
    return 'middle';
}

// Get all stretch info
export function getGangaStretchInfo() {
    return GANGA_STRETCHES.map(stretch => ({
        id: stretch.id,
        name: stretch.name,
        nameHindi: stretch.nameHindi,
        description: stretch.description,
        state: stretch.state,
        length: stretch.length,
        baselineSpecies: stretch.baselineSpecies,
        conservationStatus: stretch.conservationStatus,
        keySpecies: stretch.keySpecies,
        pollutionLevel: stretch.pollutionLevel,
        center: {
            lat: (stretch.coordinates.start.lat + stretch.coordinates.end.lat) / 2,
            lon: (stretch.coordinates.start.lon + stretch.coordinates.end.lon) / 2
        }
    }));
}

// Get specific stretch details
export function getStretchDetails(stretchId) {
    return GANGA_STRETCHES.find(s => s.id === stretchId) || null;
}

// Get GeoJSON for map visualization
export function getStretchGeoJSON(stretchId) {
    const stretch = GANGA_STRETCHES.find(s => s.id === stretchId);
    if (!stretch) return null;

    return {
        type: 'Feature',
        properties: {
            id: stretch.id,
            name: stretch.name,
            state: stretch.state,
            pollutionLevel: stretch.pollutionLevel
        },
        geometry: {
            type: 'LineString',
            coordinates: [
                [stretch.coordinates.start.lon, stretch.coordinates.start.lat],
                [stretch.coordinates.end.lon, stretch.coordinates.end.lat]
            ]
        }
    };
}

// Get all stretches GeoJSON
export function getAllStretchesGeoJSON() {
    return {
        type: 'FeatureCollection',
        features: GANGA_STRETCHES.map(stretch => ({
            type: 'Feature',
            properties: {
                id: stretch.id,
                name: stretch.name,
                nameHindi: stretch.nameHindi,
                state: stretch.state,
                pollutionLevel: stretch.pollutionLevel,
                conservationStatus: stretch.conservationStatus,
                baselineSpecies: stretch.baselineSpecies
            },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [stretch.coordinates.start.lon, stretch.coordinates.start.lat],
                    [stretch.coordinates.end.lon, stretch.coordinates.end.lat]
                ]
            }
        }))
    };
}

// Get color coding for pollution level
export function getPollutionColor(pollutionLevel) {
    const colors = {
        'Low': '#22c55e',      // Green
        'Moderate': '#84cc16', // Light Green
        'High': '#eab308',     // Yellow
        'Very High': '#f97316', // Orange
        'Critical': '#ef4444'  // Red
    };
    return colors[pollutionLevel] || '#6b7280';
}

// Get all pollution levels with colors
export function getPollutionLevels() {
    return [
        { level: 'Low', color: '#22c55e', description: 'Healthy water quality' },
        { level: 'Moderate', color: '#84cc16', description: 'Acceptable with some concerns' },
        { level: 'High', color: '#eab308', description: 'Significant pollution present' },
        { level: 'Very High', color: '#f97316', description: 'Severe pollution concerns' },
        { level: 'Critical', color: '#ef4444', description: 'Urgent attention required' }
    ];
}
