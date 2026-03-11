/**
 * Ganga Stretch Service
 * Improved stretch detection using geographic bounding boxes
 */

const GANGA_STRETCHES = [
    {
        id: "upper",
        name: "Upper Ganga",
        nameHindi: "ऊपरी गंगा",
        description: "From Gaumukh to Haridwar",
        state: "Uttarakhand",

        bounds: {
            minLat: 29.8,
            maxLat: 31,
            minLon: 78,
            maxLon: 79
        },

        coordinates: {
            start: { lat: 30.9878, lon: 78.4968 },
            end: { lat: 29.9457, lon: 78.1642 }
        },

        length: "~290 km",
        baselineSpecies: 25,
        conservationStatus: "Relatively Pristine",
        keySpecies: ["Gangetic Dolphin", "Gharial", "Golden Mahseer"],
        pollutionLevel: "Low"
    },

    {
        id: "middle-upper",
        name: "Upper-Middle Ganga",
        nameHindi: "ऊपरी-मध्य गंगा",
        description: "From Haridwar to Kanpur",
        state: "Uttarakhand, Uttar Pradesh",

        bounds: {
            minLat: 26.4,
            maxLat: 29.8,
            minLon: 78,
            maxLon: 81
        },

        coordinates: {
            start: { lat: 29.9457, lon: 78.1642 },
            end: { lat: 26.4475, lon: 80.4456 }
        },

        length: "~420 km",
        baselineSpecies: 28,
        conservationStatus: "Moderately Stressed",
        keySpecies: ["Gangetic Dolphin", "Indian Softshell Turtle"],
        pollutionLevel: "Moderate"
    },

    {
        id: "middle",
        name: "Middle Ganga",
        nameHindi: "मध्य गंगा",
        description: "From Kanpur to Varanasi",
        state: "Uttar Pradesh",

        bounds: {
            minLat: 25.2,
            maxLat: 26.5,
            minLon: 80,
            maxLon: 83.2
        },

        coordinates: {
            start: { lat: 26.4475, lon: 80.4456 },
            end: { lat: 25.3176, lon: 83.0103 }
        },

        length: "~320 km",
        baselineSpecies: 30,
        conservationStatus: "Stressed",
        keySpecies: ["Gangetic Dolphin", "Hilsa"],
        pollutionLevel: "High"
    },

    {
        id: "middle-lower",
        name: "Lower-Middle Ganga",
        nameHindi: "निचला-मध्य गंगा",
        description: "From Varanasi to Patna",
        state: "Uttar Pradesh, Bihar",

        bounds: {
            minLat: 25,
            maxLat: 25.6,
            minLon: 83,
            maxLon: 85.5
        },

        coordinates: {
            start: { lat: 25.3176, lon: 83.0103 },
            end: { lat: 25.5941, lon: 85.1376 }
        },

        length: "~260 km",
        baselineSpecies: 26,
        conservationStatus: "Stressed",
        keySpecies: ["Gangetic Dolphin", "Smooth-coated Otter"],
        pollutionLevel: "High"
    },

    {
        id: "lower",
        name: "Lower Ganga",
        nameHindi: "निचली गंगा",
        description: "From Patna to Kolkata",
        state: "Bihar, Jharkhand, West Bengal",

        bounds: {
            minLat: 22.8,
            maxLat: 25,
            minLon: 85,
            maxLon: 88.5
        },

        coordinates: {
            start: { lat: 25.5941, lon: 85.1376 },
            end: { lat: 22.5726, lon: 88.3639 }
        },

        length: "~540 km",
        baselineSpecies: 32,
        conservationStatus: "Heavily Stressed",
        keySpecies: ["Gangetic Dolphin", "Hilsa"],
        pollutionLevel: "Very High"
    },

    {
        id: "delta",
        name: "Ganga Delta",
        nameHindi: "गंगा डेल्टा",
        description: "Sundarbans region",
        state: "West Bengal, Bangladesh",

        bounds: {
            minLat: 21,
            maxLat: 22.8,
            minLon: 88,
            maxLon: 90
        },

        coordinates: {
            start: { lat: 22.5726, lon: 88.3639 },
            end: { lat: 21.5, lon: 89.5 }
        },

        length: "~250 km",
        baselineSpecies: 35,
        conservationStatus: "Critical",
        keySpecies: ["Gangetic Dolphin", "River Terrapin"],
        pollutionLevel: "Critical"
    }

];

export function getStretchByCoordinates(lat, lon) {

    for (const stretch of GANGA_STRETCHES) {

        const b = stretch.bounds;

        if (
            lat >= b.minLat &&
            lat <= b.maxLat &&
            lon >= b.minLon &&
            lon <= b.maxLon
        ) {
            return stretch.id;
        }

    }

    return "middle";
}

export function getStretchDetails(id) {
    return GANGA_STRETCHES.find(s => s.id === id) || null;
}

export function getGangaStretchInfo() {

    return GANGA_STRETCHES.map(s => ({

        id: s.id,
        name: s.name,
        state: s.state,
        baselineSpecies: s.baselineSpecies,
        pollutionLevel: s.pollutionLevel,

        center: {
            lat: (s.coordinates.start.lat + s.coordinates.end.lat) / 2,
            lon: (s.coordinates.start.lon + s.coordinates.end.lon) / 2
        }

    }));

}

export function getStretchGeoJSON(id) {

    const s = getStretchDetails(id);

    if (!s) return null;

    return {
        type: "Feature",
        properties: {
            name: s.name,
            pollution: s.pollutionLevel
        },
        geometry: {
            type: "LineString",
            coordinates: [
                [s.coordinates.start.lon, s.coordinates.start.lat],
                [s.coordinates.end.lon, s.coordinates.end.lat]
            ]
        }
    };

}

export function getAllStretchesGeoJSON() {

    return {
        type: "FeatureCollection",
        features: GANGA_STRETCHES.map(s => ({

            type: "Feature",
            properties: {
                name: s.name,
                pollution: s.pollutionLevel,
                baselineSpecies: s.baselineSpecies
            },

            geometry: {
                type: "LineString",
                coordinates: [
                    [s.coordinates.start.lon, s.coordinates.start.lat],
                    [s.coordinates.end.lon, s.coordinates.end.lat]
                ]

            }

        }))

    };

}

export function getPollutionColor(level) {

    const colors = {
        Low: "#22c55e",
        Moderate: "#84cc16",
        High: "#eab308",
        "Very High": "#f97316",
        Critical: "#ef4444"
    };

    return colors[level] || "#6b7280";

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
