/**
 * Species Tolerance Service
 * Database of Ganga riparian species with their tolerance to water quality
 * Based on WII/ZSI reports and ecological studies
 */

// Baseline species database for each Ganga stretch
// Tolerance: 'clean' = requires clean water, 'moderate' = tolerates some pollution, 'polluted' = thrives in polluted water
const GANGA_SPECIES_DATABASE = {
    'upper': {
        name: 'Upper Ganga (Gaumukh to Haridwar)',
        baselineSpecies: [
            // Dolphins & Aquatic Mammals
            { name: 'Gangetic Dolphin', scientificName: 'Platanista gangetica', tolerance: 'clean', category: 'mammal', status: 'Endangered' },
            { name: 'Smooth-coated Otter', scientificName: 'Lutrogale perspicillata', tolerance: 'moderate', category: 'mammal', status: 'Vulnerable' },
            
            // Reptiles
            { name: 'Gharial', scientificName: 'Gavialis gangeticus', tolerance: 'clean', category: 'reptile', status: 'Critically Endangered' },
            { name: 'Indian Marsh Crocodile', scientificName: 'Crocodylus palustris', tolerance: 'moderate', category: 'reptile', status: 'Vulnerable' },
            
            // Turtles
            { name: 'Indian Softshell Turtle', scientificName: 'Nilssonia gangetica', tolerance: 'moderate', category: 'turtle', status: 'Vulnerable' },
            { name: 'Black Softshell Turtle', scientificName: 'Nilssonia nigricans', tolerance: 'clean', category: 'turtle', status: 'Critically Endangered' },
            { name: 'Indian Roofed Turtle', scientificName: 'Pangshura tecta', tolerance: 'moderate', category: 'turtle', status: 'Least Concern' },
            
            // Fish
            { name: 'Golden Mahseer', scientificName: 'Tor putitora', tolerance: 'clean', category: 'fish', status: 'Endangered' },
            { name: 'Goonch Catfish', scientificName: 'Bagarius bagarius', tolerance: 'clean', category: 'fish', status: 'Vulnerable' },
            { name: 'Ganga Catfish', scientificName: 'Ompok bimaculatus', tolerance: 'moderate', category: 'fish', status: 'Near Threatened' },
            { name: 'Rohu', scientificName: 'Labeo rohita', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Katla', scientificName: 'Catla catla', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Mrigal', scientificName: 'Cirrhinus mrigala', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            
            // Macroinvertebrates
            { name: 'Mayfly Nymphs', scientificName: 'Ephemeroptera spp.', tolerance: 'clean', category: 'invertebrate', status: 'Indicator' },
            { name: 'Caddisfly Larvae', scientificName: 'Trichoptera spp.', tolerance: 'clean', category: 'invertebrate', status: 'Indicator' },
            { name: 'Stonefly Nymphs', scientificName: 'Plecoptera spp.', tolerance: 'clean', category: 'invertebrate', status: 'Indicator' },
            { name: 'Chironomus Larvae', scientificName: 'Chironomus spp.', tolerance: 'polluted', category: 'invertebrate', status: 'Tolerant' },
            
            // Aquatic Plants
            { name: 'Hydrilla', scientificName: 'Hydrilla verticillata', tolerance: 'moderate', category: 'plant', status: 'Native' },
            { name: 'Vallisneria', scientificName: 'Vallisneria spiralis', tolerance: 'moderate', category: 'plant', status: 'Native' },
            { name: 'Water Hyacinth', scientificName: 'Eichhornia crassipes', tolerance: 'polluted', category: 'plant', status: 'Invasive' },
            { name: 'Oscillatoria', scientificName: 'Oscillatoria spp.', tolerance: 'polluted', category: 'algae', status: 'Pollution Indicator' },
        ]
    },
    'middle': {
        name: 'Middle Ganga (Haridwar to Varanasi)',
        baselineSpecies: [
            // Dolphins & Aquatic Mammals
            { name: 'Gangetic Dolphin', scientificName: 'Platanista gangetica', tolerance: 'clean', category: 'mammal', status: 'Endangered' },
            { name: 'Smooth-coated Otter', scientificName: 'Lutrogale perspicillata', tolerance: 'moderate', category: 'mammal', status: 'Vulnerable' },
            
            // Reptiles
            { name: 'Gharial', scientificName: 'Gavialis gangeticus', tolerance: 'clean', category: 'reptile', status: 'Critically Endangered' },
            { name: 'Indian Marsh Crocodile', scientificName: 'Crocodylus palustris', tolerance: 'moderate', category: 'reptile', status: 'Vulnerable' },
            
            // Turtles
            { name: 'Indian Softshell Turtle', scientificName: 'Nilssonia gangetica', tolerance: 'moderate', category: 'turtle', status: 'Vulnerable' },
            { name: 'Indian Roofed Turtle', scientificName: 'Pangshura tecta', tolerance: 'moderate', category: 'turtle', status: 'Least Concern' },
            { name: 'Brown Roofed Turtle', scientificName: 'Pangshura smithii', tolerance: 'moderate', category: 'turtle', status: 'Least Concern' },
            
            // Fish
            { name: 'Ganga Catfish', scientificName: 'Ompok bimaculatus', tolerance: 'moderate', category: 'fish', status: 'Near Threatened' },
            { name: 'Butter Catfish', scientificName: 'Ompok pabda', tolerance: 'moderate', category: 'fish', status: 'Endangered' },
            { name: 'Rohu', scientificName: 'Labeo rohita', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Katla', scientificName: 'Catla catla', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Mrigal', scientificName: 'Cirrhinus mrigala', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Singhara', scientificName: 'Setipinna phasa', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Pangasius', scientificName: 'Pangasianodon hypophthalmus', tolerance: 'polluted', category: 'fish', status: 'Farmed' },
            
            // Macroinvertebrates
            { name: 'Mayfly Nymphs', scientificName: 'Ephemeroptera spp.', tolerance: 'clean', category: 'invertebrate', status: 'Indicator' },
            { name: 'Dragonfly Larvae', scientificName: 'Odonata spp.', tolerance: 'moderate', category: 'invertebrate', status: 'Indicator' },
            { name: 'Chironomus Larvae', scientificName: 'Chironomus spp.', tolerance: 'polluted', category: 'invertebrate', status: 'Tolerant' },
            { name: 'Tubifex Worms', scientificName: 'Tubifex spp.', tolerance: 'polluted', category: 'invertebrate', status: 'Pollution Indicator' },
            
            // Aquatic Plants
            { name: 'Hydrilla', scientificName: 'Hydrilla verticillata', tolerance: 'moderate', category: 'plant', status: 'Native' },
            { name: 'Ceratophyllum', scientificName: 'Ceratophyllum demersum', tolerance: 'moderate', category: 'plant', status: 'Native' },
            { name: 'Water Hyacinth', scientificName: 'Eichhornia crassipes', tolerance: 'polluted', category: 'plant', status: 'Invasive' },
            { name: 'Salvinia', scientificName: 'Salvinia molesta', tolerance: 'polluted', category: 'plant', status: 'Invasive' },
            { name: 'Oscillatoria', scientificName: 'Oscillatoria spp.', tolerance: 'polluted', category: 'algae', status: 'Pollution Indicator' },
        ]
    },
    'lower': {
        name: 'Lower Ganga (Varanasi to Kolkata/Hooghly)',
        baselineSpecies: [
            // Dolphins & Aquatic Mammals
            { name: 'Gangetic Dolphin', scientificName: 'Platanista gangetica', tolerance: 'clean', category: 'mammal', status: 'Endangered' },
            { name: 'Smooth-coated Otter', scientificName: 'Lutrogale perspicillata', tolerance: 'moderate', category: 'mammal', status: 'Vulnerable' },
            
            // Reptiles
            { name: 'Gharial', scientificName: 'Gavialis gangeticus', tolerance: 'clean', category: 'reptile', status: 'Critically Endangered' },
            { name: 'Indian Marsh Crocodile', scientificName: 'Crocodylus palustris', tolerance: 'moderate', category: 'reptile', status: 'Vulnerable' },
            
            // Turtles
            { name: 'Indian Softshell Turtle', scientificName: 'Nilssonia gangetica', tolerance: 'moderate', category: 'turtle', status: 'Vulnerable' },
            { name: 'Indian Roofed Turtle', scientificName: 'Pangshura tecta', tolerance: 'moderate', category: 'turtle', status: 'Least Concern' },
            { name: 'Watchful Turtle', scientificName: 'Vijayachelys silvatica', tolerance: 'clean', category: 'turtle', status: 'Endangered' },
            
            // Fish
            { name: 'Hilsa', scientificName: 'Tenualosa ilisha', tolerance: 'moderate', category: 'fish', status: 'Near Threatened' },
            { name: 'Ganga Catfish', scientificName: 'Ompok bimaculatus', tolerance: 'moderate', category: 'fish', status: 'Near Threatened' },
            { name: 'Rohu', scientificName: 'Labeo rohita', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Katla', scientificName: 'Catla catla', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Mrigal', scientificName: 'Cirrhinus mrigala', tolerance: 'moderate', category: 'fish', status: 'Least Concern' },
            { name: 'Common Carp', scientificName: 'Cyprinus carpio', tolerance: 'polluted', category: 'fish', status: 'Invasive' },
            
            // Macroinvertebrates
            { name: 'Dragonfly Larvae', scientificName: 'Odonata spp.', tolerance: 'moderate', category: 'invertebrate', status: 'Indicator' },
            { name: 'Damselfly Larvae', scientificName: 'Zygoptera spp.', tolerance: 'moderate', category: 'invertebrate', status: 'Indicator' },
            { name: 'Chironomus Larvae', scientificName: 'Chironomus spp.', tolerance: 'polluted', category: 'invertebrate', status: 'Tolerant' },
            { name: 'Tubifex Worms', scientificName: 'Tubifex spp.', tolerance: 'polluted', category: 'invertebrate', status: 'Pollution Indicator' },
            
            // Aquatic Plants
            { name: 'Hydrilla', scientificName: 'Hydrilla verticillata', tolerance: 'moderate', category: 'plant', status: 'Native' },
            { name: 'Ipomoea', scientificName: 'Ipomoea aquatica', tolerance: 'polluted', category: 'plant', status: 'Native' },
            { name: 'Water Hyacinth', scientificName: 'Eichhornia crassipes', tolerance: 'polluted', category: 'plant', status: 'Invasive' },
            { name: 'Salvinia', scientificName: 'Salvinia molesta', tolerance: 'polluted', category: 'plant', status: 'Invasive' },
            { name: 'Microcystis', scientificName: 'Microcystis spp.', tolerance: 'polluted', category: 'algae', status: 'Toxic Algae' },
        ]
    }
};

// Species richness mapping by water status
const SPECIES_RICHNESS_MAPPING = {
    'Good': {
        percentage: { min: 70, max: 100 },
        description: '70-100% of baseline species likely present',
        ecosystem: 'Healthy ecosystem with full species diversity'
    },
    'Average': {
        percentage: { min: 40, max: 70 },
        description: '40-70% of baseline species likely present',
        ecosystem: 'Stressed ecosystem, some sensitive species missing'
    },
    'Poor': {
        percentage: { min: 10, max: 40 },
        description: '10-40% of baseline species likely present',
        ecosystem: 'Degraded ecosystem, only pollution-tolerant species'
    }
};

// Get baseline species for a stretch
export function getBaselineSpecies(stretchId) {
    const stretch = GANGA_SPECIES_DATABASE[stretchId];
    if (!stretch) {
        // Return upper stretch as default
        return GANGA_SPECIES_DATABASE['upper'].baselineSpecies;
    }
    return stretch.baselineSpecies;
}

// Get species filtered by water status
export function getSpeciesByWaterStatus(stretchId, waterStatus) {
    const baseline = getBaselineSpecies(stretchId);
    
    const likely = [];
    const moderate = [];
    const unlikely = [];

    for (const species of baseline) {
        const shouldInclude = checkSpeciesSuitability(species.tolerance, waterStatus);
        
        if (shouldInclude === 'likely') {
            likely.push(species);
        } else if (shouldInclude === 'moderate') {
            moderate.push(species);
        } else {
            unlikely.push(species);
        }
    }

    const richness = SPECIES_RICHNESS_MAPPING[waterStatus] || SPECIES_RICHNESS_MAPPING['Average'];
    
    return {
        percentage: richness.percentage,
        description: richness.description,
        ecosystem: richness.ecosystem,
        likely: likely,
        moderate: moderate,
        unlikely: unlikely,
        totalLikely: likely.length + moderate.length
    };
}

// Check if species is suitable for water status
function checkSpeciesSuitability(tolerance, waterStatus) {
    if (waterStatus === 'Good') {
        if (tolerance === 'clean') return 'likely';
        if (tolerance === 'moderate') return 'likely';
        return 'moderate';
    } else if (waterStatus === 'Average') {
        if (tolerance === 'clean') return 'moderate';
        if (tolerance === 'moderate') return 'likely';
        return 'likely';
    } else { // Poor
        if (tolerance === 'clean') return 'unlikely';
        if (tolerance === 'moderate') return 'moderate';
        return 'likely';
    }
}

// Get species by category
export function getSpeciesByCategory(stretchId, category) {
    const baseline = getBaselineSpecies(stretchId);
    return baseline.filter(s => s.category === category);
}

// Get all species tolerance profiles
export function getAllToleranceProfiles() {
    const profiles = {};
    
    for (const [stretchId, stretch] of Object.entries(GANGA_SPECIES_DATABASE)) {
        profiles[stretchId] = stretch.baselineSpecies.map(s => ({
            name: s.name,
            scientificName: s.scientificName,
            tolerance: s.tolerance,
            category: s.category,
            status: s.status
        }));
    }
    
    return profiles;
}

// Calculate species diversity index (Simpson's)
export function calculateDiversityIndex(speciesList) {
    if (!speciesList || speciesList.length === 0) return 0;
    
    const total = speciesList.length;
    const categoryCounts = {};
    
    for (const s of speciesList) {
        categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }
    
    // Simpson's Diversity Index
    let sumSquares = 0;
    for (const count of Object.values(categoryCounts)) {
        sumSquares += Math.pow(count / total, 2);
    }
    
    const diversityIndex = 1 - sumSquares;
    return Math.round(diversityIndex * 100) / 100;
}
