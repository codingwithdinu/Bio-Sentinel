import express from 'express';
import axios from 'axios';
import fs from 'fs/promises';
import { mosdacService } from '../services/mosdacService.js';
import { gangaBufferService } from '../services/gangaBufferService.js';

const router = express.Router();

// MOSDAC Credentials from environment or defaults
const MOSDAC_USERNAME = process.env.MOSDAC_USERNAME || 'kakafudoariri';
const MOSDAC_PASSWORD = process.env.MOSDAC_PASSWORD || 'BoMb6291@nts';

// NASA FIRMS API (uses DEMO_KEY for free tier)
const NASA_FIRMS_API_KEY = process.env.NASA_FIRMS_API_KEY || 'DEMO_KEY';
const NASA_FIRMS_BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/region';
const ENDANGERED_ENRICHMENT_JSON = new URL('../../data/endangered_species_enrichment.json', import.meta.url);
const ENDANGERED_ENRICHMENT_CSV = new URL('../../data/Species.csv', import.meta.url);
const WIKIPEDIA_SUMMARY_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIPEDIA_SEARCH_URL = 'https://en.wikipedia.org/w/api.php';

let endangeredEnrichmentCache = null;
const endangeredWikiCache = new Map();

const deriveSpeciesCategory = (item = {}) => {
    const cls = String(item.class || item.className || '').trim().toLowerCase();
    const order = String(item.order || '').trim().toLowerCase();
    const family = String(item.family || '').trim().toLowerCase();
    const taxonBlob = `${cls} ${order} ${family}`;

    if (cls === 'mammalia') return 'Mammals';
    if (cls === 'aves') return 'Birds';
    if (cls === 'reptilia') return 'Reptiles';
    if (cls === 'amphibia') return 'Amphibians';
    if (cls === 'actinopterygii' || cls === 'chondrichthyes') return 'Fishes';
    if (cls === 'insecta' || cls === 'arachnida' || cls === 'gastropoda' || cls === 'bivalvia') return 'Invertebrates';

    if (taxonBlob.includes('crocodylia') || taxonBlob.includes('testudines') || taxonBlob.includes('squamata') || taxonBlob.includes('serpentes')) {
        return 'Reptiles';
    }

    if (taxonBlob.includes('anura') || taxonBlob.includes('caudata') || taxonBlob.includes('urodela')) {
        return 'Amphibians';
    }

    return 'Other Animals';
};

const deriveCategoryFromWikiText = (text = '') => {
    const blob = String(text || '').toLowerCase();

    if (blob.includes(' mammal')) return 'Mammals';
    if (blob.includes(' bird')) return 'Birds';
    if (blob.includes(' reptile') || blob.includes(' crocodilian') || blob.includes(' snake') || blob.includes(' lizard')) return 'Reptiles';
    if (blob.includes(' amphibian') || blob.includes(' frog') || blob.includes(' salamander')) return 'Amphibians';
    if (blob.includes(' fish')) return 'Fishes';
    if (blob.includes(' insect') || blob.includes(' arachnid') || blob.includes(' butterfly') || blob.includes(' beetle') || blob.includes(' mollusc')) return 'Invertebrates';

    return 'Other Animals';
};

const deriveIucnFromWikiText = (text = '') => {
    const blob = String(text || '').toLowerCase();

    if (blob.includes('extinct in the wild')) return 'CR';
    if (blob.includes('critically endangered')) return 'CR';
    if (blob.includes(' endangered')) return 'EN';
    if (blob.includes(' vulnerable')) return 'VU';
    if (blob.includes('threatened')) return 'VU';
    if (blob.includes('near threatened')) return 'NT';
    if (blob.includes('least concern')) return 'LC';

    return 'NE';
};

const toWikiTitleCandidate = (value) => {
    return String(value || '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/,\s*\d{3,4}\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const makeWikiTitleCandidates = (scientificName, commonName) => {
    const scientific = toWikiTitleCandidate(scientificName);
    const common = toWikiTitleCandidate(commonName);

    const candidates = [];

    if (scientific) {
        candidates.push(scientific);

        const parts = scientific.split(' ').filter(Boolean);
        if (parts.length >= 2) {
            candidates.push(`${parts[0]} ${parts[1]}`);
        }

        if (parts.length >= 1) {
            candidates.push(parts[0]);
        }
    }

    if (common) {
        candidates.push(common);
    }

    return [...new Set(candidates.map((s) => s.trim()).filter(Boolean))];
};

const fetchWikipediaSummary = async (scientificName, commonName) => {
    const titleCandidates = makeWikiTitleCandidates(scientificName, commonName);
    if (!titleCandidates.length) {
        return null;
    }

    const primaryCacheKey = titleCandidates[0].toLowerCase();
    if (endangeredWikiCache.has(primaryCacheKey)) {
        return endangeredWikiCache.get(primaryCacheKey);
    }

    for (const candidate of titleCandidates) {
        const candidateCacheKey = candidate.toLowerCase();
        if (endangeredWikiCache.has(candidateCacheKey)) {
            const cached = endangeredWikiCache.get(candidateCacheKey);
            endangeredWikiCache.set(primaryCacheKey, cached);
            return cached;
        }

        try {
            const response = await axios.get(`${WIKIPEDIA_SUMMARY_BASE_URL}/${encodeURIComponent(candidate)}`, {
                timeout: 3500,
                headers: {
                    'User-Agent': 'BioSentinel/1.0 (species-wiki-enrichment)'
                }
            });

            const data = response?.data || {};
            const extract = typeof data.extract === 'string' ? data.extract.trim() : '';

            if (!extract) {
                endangeredWikiCache.set(candidateCacheKey, null);
                continue;
            }

            const payload = {
                title: data.title || candidate,
                summary: extract,
                url: data?.content_urls?.desktop?.page || null,
                thumbnail: data?.thumbnail?.source || null
            };

            endangeredWikiCache.set(candidateCacheKey, payload);
            endangeredWikiCache.set(primaryCacheKey, payload);
            return payload;
        } catch {
            endangeredWikiCache.set(candidateCacheKey, null);
        }
    }

    endangeredWikiCache.set(primaryCacheKey, null);
    return null;
};

const fetchWikipediaEndangeredCatalog = async (requestedLimit = 120, allowedStatuses = ['CR', 'EN', 'VU']) => {
    const bounded = Math.min(500, Math.max(20, Number(requestedLimit) || 120));
    const normalizedAllowedStatuses = new Set(
        (Array.isArray(allowedStatuses) ? allowedStatuses : ['CR', 'EN', 'VU'])
            .map((s) => String(s || '').trim().toUpperCase())
            .filter(Boolean)
    );

    const searchQueries = [
        'endangered animals in India',
        'critically endangered animals in India',
        'vulnerable animals in India',
        'endangered mammal India',
        'endangered bird India',
        'endangered reptile India',
        'IUCN endangered species India',
        'threatened species of India',
        'Indian endangered wildlife',
        'critically endangered species India'
    ];

    const offsets = [0, 50];
    const crawlDeadline = Date.now() + 12000;

    const titleSet = new Set();

    for (const query of searchQueries) {
        if (Date.now() > crawlDeadline) break;
        for (const offset of offsets) {
            if (Date.now() > crawlDeadline) break;
            try {
                const response = await axios.get(WIKIPEDIA_SEARCH_URL, {
                    params: {
                        action: 'query',
                        list: 'search',
                        srsearch: query,
                        srlimit: 50,
                        sroffset: offset,
                        format: 'json',
                        origin: '*'
                    },
                    timeout: 2500,
                    headers: {
                        'User-Agent': 'BioSentinel/1.0 (wiki-endangered-catalog)'
                    }
                });

                const searchRows = response?.data?.query?.search || [];
                for (const row of searchRows) {
                    const title = String(row?.title || '').trim();
                    if (!title || title.toLowerCase().includes('list of')) continue;
                    titleSet.add(title);
                    if (titleSet.size >= Math.min(350, bounded * 3)) break;
                }

                if (titleSet.size >= Math.min(350, bounded * 3)) break;
            } catch {
                // Ignore and continue with next offset/query.
            }
        }

        if (titleSet.size >= Math.min(350, bounded * 3)) break;
    }

    const titles = [...titleSet].slice(0, Math.min(160, bounded * 2));
    const summaries = await Promise.all(titles.map((title) => fetchWikipediaSummary(title, title)));

    const records = [];
    for (let i = 0; i < titles.length; i += 1) {
        const title = titles[i];
        const wiki = summaries[i];
        if (!wiki?.summary) continue;

        const text = `${wiki.title || ''} ${wiki.summary || ''}`;
        const iucnStatus = deriveIucnFromWikiText(text);
        const category = deriveCategoryFromWikiText(text);

        if (!normalizedAllowedStatuses.has(iucnStatus)) {
            continue;
        }

        records.push({
            key: `wiki-${encodeURIComponent(title.toLowerCase())}`,
            speciesKey: null,
            scientificName: wiki.title || title,
            commonName: wiki.title || title,
            localName: null,
            hindiName: null,
            category,
            iucnStatus,
            decimalLatitude: null,
            decimalLongitude: null,
            eventDate: null,
            stateProvince: null,
            locality: null,
            country: 'India',
            basisOfRecord: 'WIKIPEDIA',
            recordedBy: 'Wikipedia',
            taxonRank: null,
            className: null,
            order: null,
            phylum: null,
            family: null,
            genus: null,
            media: [],
            imageUrl: wiki.thumbnail || null,
            about: wiki.summary,
            wikiTitle: wiki.title,
            wikiSummary: wiki.summary,
            wikiUrl: wiki.url,
            wikiThumbnail: wiki.thumbnail
        });

        if (records.length >= bounded) break;
    }

    return records;
};

const normalizeSpeciesName = (value) => String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseCsvLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    cells.push(current.trim());
    return cells;
};

const getFirstValue = (row, keys) => {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
};

const addRowToEnrichmentMap = (map, row) => {
    const scientificName = getFirstValue(row, ['scientificName', 'scientific_name', 'Scientific Name', 'species', 'species_name', 'binomial_name']);
    const key = normalizeSpeciesName(scientificName);
    if (!key) return;

    const localName = getFirstValue(row, ['localName', 'local_name', 'common_name', 'commonName', 'Common Name', 'vernacular_name']);
    const hindiName = getFirstValue(row, ['hindiName', 'hindi_name', 'Hindi Name', 'hindi']);

    map.set(key, {
        scientificName,
        localName,
        hindiName,
        imageUrl: getFirstValue(row, ['imageUrl', 'image_url', 'image', 'Image URL', 'photo_url']),
        about: getFirstValue(row, ['about', 'description', 'summary', 'Details', 'habitat'])
    });
};

const loadEnrichmentFromCsv = async () => {
    try {
        const raw = await fs.readFile(ENDANGERED_ENRICHMENT_CSV, 'utf-8');
        const lines = raw.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length < 2) {
            return new Map();
        }

        const headers = parseCsvLine(lines[0]);
        const map = new Map();

        for (let i = 1; i < lines.length; i += 1) {
            const values = parseCsvLine(lines[i]);
            if (!values.length) continue;

            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
            });

            addRowToEnrichmentMap(map, row);
        }

        return map;
    } catch {
        return new Map();
    }
};

const loadEndangeredEnrichment = async () => {
    if (endangeredEnrichmentCache) {
        return endangeredEnrichmentCache;
    }

    try {
        const raw = await fs.readFile(ENDANGERED_ENRICHMENT_JSON, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
            const map = new Map();
            for (const row of parsed) {
                addRowToEnrichmentMap(map, row || {});
            }

            endangeredEnrichmentCache = map;
            return endangeredEnrichmentCache;
        }
    } catch {
        // Try CSV fallback below.
    }

    endangeredEnrichmentCache = await loadEnrichmentFromCsv();
    return endangeredEnrichmentCache;
};

const CITY_COORDINATES = {
    jodhpur: { key: 'jodhpur', name: 'Jodhpur', lat: 26.2389, lon: 73.0243 },
    jaipur: { key: 'jaipur', name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
    udaipur: { key: 'udaipur', name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
    ajmer: { key: 'ajmer', name: 'Ajmer', lat: 26.4499, lon: 74.6399 },
    kota: { key: 'kota', name: 'Kota', lat: 25.2138, lon: 75.8648 },
    bikaner: { key: 'bikaner', name: 'Bikaner', lat: 28.0229, lon: 73.3119 },
    delhi: { key: 'delhi', name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    lucknow: { key: 'lucknow', name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
    kanpur: { key: 'kanpur', name: 'Kanpur', lat: 26.4499, lon: 80.3319 },
    varanasi: { key: 'varanasi', name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
    patna: { key: 'patna', name: 'Patna', lat: 25.5941, lon: 85.1376 },
    kolkata: { key: 'kolkata', name: 'Kolkata', lat: 22.5726, lon: 88.3639 }
};

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
 * GET /satellite/cities
 * Get available city list for biodiversity analysis
 */
router.get('/cities', (req, res) => {
    res.json({
        cities: Object.values(CITY_COORDINATES)
    });
});

/**
 * POST /satellite/species/search-india
 * Search species occurrences across India by species/common/scientific name.
 */
router.post('/species/search-india', async (req, res) => {
    try {
        const { species = '', limit = 180 } = req.body || {};

        const trimmedSpecies = String(species || '').trim();

        if (!trimmedSpecies || trimmedSpecies.length < 2) {
            return res.status(400).json({
                error: 'Species query is required (min 2 characters).'
            });
        }

        const boundedLimit = Math.min(500, Math.max(20, Number(limit) || 180));

        let taxonKey = null;

        const normalizedQuery = trimmedSpecies.toLowerCase();
        const matchesQuery = (item) => {
            const fields = [
                item?.scientificName,
                item?.acceptedScientificName,
                item?.species,
                item?.vernacularName,
                item?.genus,
                item?.family
            ];

            return fields.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
        };

        const resolveTaxonFromSuggest = async () => {
            try {
                const suggestResponse = await axios.get('https://api.gbif.org/v1/species/suggest', {
                    params: {
                        q: trimmedSpecies,
                        limit: 20,
                        datasetKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
                    },
                    timeout: 10000
                });

                const suggestions = Array.isArray(suggestResponse?.data) ? suggestResponse.data : [];
                const preferred = suggestions.find((item) => {
                    const rank = String(item?.rank || '').toUpperCase();
                    const kingdom = String(item?.kingdom || '').toUpperCase();
                    return Number.isFinite(item?.key)
                        && (rank === 'SPECIES' || rank === 'SUBSPECIES')
                        && (kingdom === 'ANIMALIA' || !kingdom)
                        && matchesQuery(item);
                }) || suggestions.find((item) => Number.isFinite(item?.key));

                return Number.isFinite(preferred?.key) ? Number(preferred.key) : null;
            } catch {
                return null;
            }
        };

        try {
            const matchResponse = await axios.get(
                'https://api.gbif.org/v1/species/match',
                {
                    params: { name: trimmedSpecies, verbose: true },
                    timeout: 10000
                }
            );

            if (Number.isFinite(matchResponse?.data?.usageKey)) {
                taxonKey = Number(matchResponse.data.usageKey);
            }
        } catch (matchError) {
            // Fall back to text matching in occurrence search.
        }

        if (!taxonKey) {
            taxonKey = await resolveTaxonFromSuggest();
        }

        const occurrenceParams = {
            country: 'IN',
            hasCoordinate: true,
            hasGeospatialIssue: false,
            occurrenceStatus: 'PRESENT',
            limit: boundedLimit
        };

        if (taxonKey) {
            occurrenceParams.taxonKey = taxonKey;
        } else {
            occurrenceParams.q = trimmedSpecies;
            occurrenceParams.kingdomKey = 1;
        }

        const occurrenceResponse = await axios.get(
            'https://api.gbif.org/v1/occurrence/search',
            {
                params: occurrenceParams,
                timeout: 30000
            }
        );

        let filteredOccurrences = (occurrenceResponse?.data?.results || [])
            .filter((item) => Number.isFinite(item?.decimalLatitude) && Number.isFinite(item?.decimalLongitude));

        if (taxonKey) {
            filteredOccurrences = filteredOccurrences.filter((item) => {
                const keys = [item?.taxonKey, item?.speciesKey, item?.acceptedTaxonKey];
                return keys.some((key) => Number(key) === taxonKey);
            });
        } else {
            filteredOccurrences = filteredOccurrences.filter(matchesQuery);
        }

        const records = filteredOccurrences
            .map((item) => ({
                key: item.key,
                scientificName: item.scientificName || item.species || trimmedSpecies,
                commonName: item.vernacularName || item.species || item.scientificName || trimmedSpecies,
                iucnStatus: item.iucnRedListCategory || 'NE',
                decimalLatitude: item.decimalLatitude,
                decimalLongitude: item.decimalLongitude,
                eventDate: item.eventDate || null,
                stateProvince: item.stateProvince || null,
                country: item.country || 'India',
                media: item.media || []
            }));

        const totalMatches = Number(occurrenceResponse?.data?.count) || filteredOccurrences.length;

        const uniqueSpecies = new Set(
            records
                .map((item) => item.scientificName)
                .filter((name) => typeof name === 'string' && name.trim())
        ).size;

        const threatenedCount = records.filter((item) => {
            const status = String(item.iucnStatus || '').toUpperCase();
            return status.includes('CR') || status.includes('EN') || status.includes('VU');
        }).length;

        res.json({
            success: true,
            query: trimmedSpecies,
            source: 'GBIF India',
            generatedAt: new Date().toISOString(),
            summary: {
                totalOccurrences: totalMatches,
                displayedOccurrences: records.length,
                uniqueSpecies,
                threatenedCount
            },
            records
        });
    } catch (error) {
        console.error('India species search error:', error);
        res.status(500).json({ error: 'Failed to search species in India' });
    }
});

/**
 * GET /satellite/species/endangered
 * Fetch endangered/threatened species records across India.
 */
router.get('/species/endangered', async (req, res) => {
    try {
        const enrichmentMap = await loadEndangeredEnrichment();
        const includeWiki = String(req.query.includeWiki ?? 'true').toLowerCase() !== 'false';
        const includeWikiCatalog = String(req.query.includeWikiCatalog ?? 'true').toLowerCase() !== 'false';
        const statuses = String(req.query.statuses || 'CR,EN,VU')
            .split(',')
            .map((s) => String(s || '').trim().toUpperCase())
            .filter(Boolean);

        const boundedLimit = Math.min(300, Math.max(30, Number(req.query.limit) || 180));
        const boundedWikiLimit = Math.min(250, Math.max(0, Number(req.query.wikiLimit) || boundedLimit));
        const perStatusLimit = Math.max(20, Math.ceil(boundedLimit / Math.max(1, statuses.length)));

        const requests = statuses.map((status) => axios.get('https://api.gbif.org/v1/occurrence/search', {
            params: {
                country: 'IN',
                hasCoordinate: true,
                hasGeospatialIssue: false,
                occurrenceStatus: 'PRESENT',
                iucnRedListCategory: status,
                kingdomKey: 1,
                limit: perStatusLimit
            },
            timeout: 30000
        }));

        const responses = await Promise.all(requests);

        const flattened = responses.flatMap((response) => response?.data?.results || []);
        const dedupMap = new Map();

        for (const item of flattened) {
            if (!Number.isFinite(item?.decimalLatitude) || !Number.isFinite(item?.decimalLongitude)) {
                continue;
            }

            const dedupKey = item.speciesKey || item.acceptedTaxonKey || item.taxonKey || item.key;
            if (!dedupKey) continue;

            if (!dedupMap.has(dedupKey)) {
                const scientificName = item.scientificName || item.species || 'Unknown species';
                const enrichment = enrichmentMap.get(normalizeSpeciesName(scientificName)) || null;

                dedupMap.set(dedupKey, {
                    key: item.key,
                    speciesKey: item.speciesKey || item.acceptedTaxonKey || item.taxonKey || null,
                    scientificName,
                    commonName: enrichment?.localName || enrichment?.hindiName || item.vernacularName || item.species || item.scientificName || 'Unknown common name',
                    localName: enrichment?.localName || item.vernacularName || null,
                    hindiName: enrichment?.hindiName || null,
                    category: deriveSpeciesCategory(item),
                    iucnStatus: item.iucnRedListCategory || 'NE',
                    decimalLatitude: item.decimalLatitude,
                    decimalLongitude: item.decimalLongitude,
                    eventDate: item.eventDate || null,
                    stateProvince: item.stateProvince || null,
                    locality: item.locality || null,
                    country: item.country || 'India',
                    basisOfRecord: item.basisOfRecord || null,
                    recordedBy: item.recordedBy || null,
                    taxonRank: item.taxonRank || null,
                    className: item.class || null,
                    order: item.order || null,
                    phylum: item.phylum || null,
                    family: item.family || null,
                    genus: item.genus || null,
                    media: item.media || [],
                    imageUrl: enrichment?.imageUrl || null,
                    about: enrichment?.about || null
                });
            }
        }

        const records = [...dedupMap.values()]
            .sort((a, b) => {
                const rank = { CR: 0, EN: 1, VU: 2, NT: 3, LC: 4, DD: 5, NE: 6 };
                return (rank[a.iucnStatus] ?? 10) - (rank[b.iucnStatus] ?? 10);
            })
            .slice(0, boundedLimit);

        const recordsWithWiki = [...records];

        if (includeWiki && recordsWithWiki.length > 0 && boundedWikiLimit > 0) {
            const wikiTargets = recordsWithWiki.slice(0, boundedWikiLimit);
            const wikiPayloads = await Promise.all(
                wikiTargets.map((item) => fetchWikipediaSummary(item.scientificName, item.commonName))
            );

            for (let i = 0; i < wikiTargets.length; i += 1) {
                const wiki = wikiPayloads[i];
                if (!wiki) continue;

                recordsWithWiki[i] = {
                    ...recordsWithWiki[i],
                    about: recordsWithWiki[i].about || wiki.summary,
                    wikiTitle: wiki.title,
                    wikiSummary: wiki.summary,
                    wikiUrl: wiki.url,
                    wikiThumbnail: wiki.thumbnail
                };
            }
        }

        if (includeWikiCatalog && recordsWithWiki.length < boundedLimit) {
            const needed = Math.max(0, boundedLimit - recordsWithWiki.length);
            if (needed > 0) {
                const wikiCatalog = await fetchWikipediaEndangeredCatalog(needed * 5, statuses);
                const seen = new Set(
                    recordsWithWiki.map((item) => normalizeSpeciesName(item.scientificName))
                );

                for (const wikiItem of wikiCatalog) {
                    const key = normalizeSpeciesName(wikiItem.scientificName);
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    recordsWithWiki.push(wikiItem);
                    if (recordsWithWiki.length >= boundedLimit) break;
                }
            }
        }

        const summaryByStatus = recordsWithWiki.reduce((acc, item) => {
            const status = String(item.iucnStatus || 'NE').toUpperCase();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const summaryByCategory = recordsWithWiki.reduce((acc, item) => {
            const category = String(item.category || 'Other Animals');
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const wikiEnrichedCount = recordsWithWiki.filter((item) => Boolean(item.wikiSummary)).length;
        const wikiOnlyCount = recordsWithWiki.filter((item) => String(item.basisOfRecord || '').toUpperCase() === 'WIKIPEDIA').length;

        res.json({
            success: true,
            source: 'GBIF India',
            generatedAt: new Date().toISOString(),
            query: {
                statuses,
                limit: boundedLimit
            },
            summary: {
                total: recordsWithWiki.length,
                byStatus: summaryByStatus,
                byCategory: summaryByCategory,
                wikiEnriched: wikiEnrichedCount,
                wikiOnly: wikiOnlyCount
            },
            records: recordsWithWiki
        });
    } catch (error) {
        console.error('Endangered species fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch endangered species records' });
    }
});

/**
 * POST /satellite/city/species
 * Analyze species for any configured city
 */
router.post('/city/species', async (req, res) => {
    try {
        const {
            city = 'jodhpur',
            radius = 25,
            majorSpeciesOnly = false,
            lat,
            lon,
            cityName
        } = req.body || {};

        const parsedLat = Number(lat);
        const parsedLon = Number(lon);

        let selectedCity = null;

        if (Number.isFinite(parsedLat) && Number.isFinite(parsedLon)) {
            selectedCity = {
                key: 'custom',
                name: cityName || 'Custom City',
                lat: parsedLat,
                lon: parsedLon
            };
        } else {
            const cityKey = String(city).toLowerCase();
            selectedCity = CITY_COORDINATES[cityKey];

            if (!selectedCity) {
                try {
                    const geocodeQuery = encodeURIComponent(`${city}, India`);
                    const geocodeResponse = await axios.get(
                        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${geocodeQuery}`,
                        {
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'BioSentinel/1.0 (city-geocoder)'
                            }
                        }
                    );

                    const geocodeResult = geocodeResponse?.data?.[0];

                    if (!geocodeResult) {
                        return res.status(400).json({
                            error: 'City not found',
                            availableCities: Object.keys(CITY_COORDINATES)
                        });
                    }

                    selectedCity = {
                        key: 'custom',
                        name: cityName || city,
                        lat: Number(geocodeResult.lat),
                        lon: Number(geocodeResult.lon)
                    };
                } catch (geocodeError) {
                    return res.status(400).json({
                        error: 'Unable to resolve city location',
                        availableCities: Object.keys(CITY_COORDINATES)
                    });
                }
            }
        }

        const result = await gangaBufferService.analyzeLocationZone(
            selectedCity.lat,
            selectedCity.lon,
            parseInt(radius),
            majorSpeciesOnly,
            `${selectedCity.name} Ecological Zone`,
            { allowMock: false }
        );

        res.json(result);
    } catch (error) {
        console.error('City species analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze city species' });
    }
});

/**
 * POST /satellite/jodhpur/species
 * Analyze species near Jodhpur and return local names + risk breakdown
 */
router.post('/jodhpur/species', async (req, res) => {
    try {
        const { radius = 25, majorSpeciesOnly = false } = req.body || {};

        const selectedCity = CITY_COORDINATES.jodhpur;

        const result = await gangaBufferService.analyzeLocationZone(
            selectedCity.lat,
            selectedCity.lon,
            parseInt(radius),
            majorSpeciesOnly,
            `${selectedCity.name} Ecological Zone`,
            { allowMock: false }
        );

        res.json(result);
    } catch (error) {
        console.error('Jodhpur species analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze Jodhpur species' });
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
