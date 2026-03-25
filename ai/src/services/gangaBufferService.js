import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { getLocalSpeciesName } from "./speciesNameService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GangaBufferService {
    constructor() {
        this.gangaRiver = null;
        this.buffers = {};
        this.localNameCache = new Map();
        this.hindiNameMap = new Map([
            ["platanista gangetica", "गंगा डॉल्फिन"],
            ["gavialis gangeticus", "घड़ियाल"],
            ["bos gaurus", "भारतीय बाइसन (गौर)"],
            ["macaca mulatta", "रिसस बंदर"],
            ["elephas maximus", "एशियाई हाथी"],
            ["panthera tigris", "बाघ"],
            ["python molurus", "अजगर"],
            ["crocodylus palustris", "मगरमच्छ"],
            ["varanus bengalensis", "गोह"],
            ["felis catus", "बिल्ली"],
            ["sus scrofa", "जंगली सूअर"],
            ["ficus benghalensis", "बरगद"],
            ["elanus caeruleus", "सफेद चील"],
            ["corvus splendens", "कौआ"],
            ["passer domesticus", "गौरैया"],
            ["columba livia", "कबूतर"],
            ["canis lupus familiaris", "कुत्ता"]
        ]);
        this.loadGangaGeometry();
    }

    isLikelyScientificName(value) {
        if (!value || typeof value !== "string") return false;

        const trimmed = value.trim();
        return /^[A-Z][a-z-]+\s[a-z-]+/.test(trimmed);
    }

    normalizeScientificName(value) {
        if (!value || typeof value !== "string") return value;

        const tokens = value.trim().split(/\s+/);
        if (tokens.length < 2) return value.trim();

        const genus = tokens[0];
        const species = tokens[1].toLowerCase();
        return `${genus} ${species}`;
    }

    isHindiText(value) {
        if (!value || typeof value !== "string") return false;
        return /[\u0900-\u097F]/.test(value);
    }

    resolveHindiName(item, resolvedLocalName) {
        const normalizedScientific = String(this.normalizeScientificName(item?.scientificName || "") || "")
            .trim()
            .toLowerCase();

        if (normalizedScientific && this.hindiNameMap.has(normalizedScientific)) {
            return this.hindiNameMap.get(normalizedScientific);
        }

        const candidateLocal = resolvedLocalName || item?.localName;
        if (this.isHindiText(candidateLocal)) {
            return candidateLocal;
        }

        return null;
    }

    loadGangaGeometry() {
        try {
            const gangaPath = path.join(__dirname, "../../data/ganga_river.geojson");
            const gangaData = JSON.parse(fs.readFileSync(gangaPath, "utf8"));
            this.gangaRiver = gangaData.features[0];
            console.log("Ganga River geometry loaded successfully");
        } catch (error) {
            console.error("Error loading Ganga geometry:", error);
            this.createFallbackGangaGeometry();
        }
    }

    createFallbackGangaGeometry() {
        const gangaCoordinates = [
            [78.4968, 30.9878],
            [79.5, 30.2],
            [80.5, 29.6],
            [81.5, 28.8],
            [82.5, 28.0],
            [83.0, 25.4],
            [84.0, 25.6],
            [85.1, 25.6],
            [86.5, 25.3],
            [87.9, 24.8],
            [88.35, 22.57],
            [88.06, 21.63]
        ];

        this.gangaRiver = {
            type: "Feature",
            properties: { name: "Ganga River (Fallback)" },
            geometry: {
                type: "LineString",
                coordinates: gangaCoordinates
            }
        };
    }

    createBuffer(radiusKm) {
        if (this.buffers[radiusKm]) return this.buffers[radiusKm];

        try {
            const line = turf.lineString(this.gangaRiver.geometry.coordinates);
            const buffered = turf.buffer(line, radiusKm, { units: "kilometers" });
            this.buffers[radiusKm] = buffered;
            return buffered;
        } catch (error) {
            console.error("Buffer error:", error);
            return null;
        }
    }

    createCircularBuffer(lat, lon, radiusKm) {
        try {
            const center = turf.point([lon, lat]);
            return turf.buffer(center, radiusKm, { units: "kilometers" });
        } catch (error) {
            console.error("Circular buffer error:", error);
            return null;
        }
    }

    async fetchGBIFSpecies(bufferPolygon, limit = 1000, options = {}) {
        const { allowMock = true } = options;

        try {
            const bbox = turf.bbox(bufferPolygon);
            const [minLon, minLat, maxLon, maxLat] = bbox;

            const response = await axios.get(
                "https://api.gbif.org/v1/occurrence/search",
                {
                    params: {
                        decimalLatitude: `${minLat},${maxLat}`,
                        decimalLongitude: `${minLon},${maxLon}`,
                        hasCoordinate: true,
                        hasGeospatialIssue: false,
                        occurrenceStatus: "PRESENT",
                        limit
                    }
                }
            );

            if (!response.data?.results) {
                return allowMock ? this.getMockSpeciesData(bufferPolygon) : [];
            }

            const species = response.data.results
                .filter((r) => r?.scientificName && Number.isFinite(r?.decimalLatitude) && Number.isFinite(r?.decimalLongitude))
                .map((r) => ({
                    scientificName: r.scientificName,
                    commonName: r.vernacularName || r.scientificName,
                    localName: r.vernacularName || null,
                    decimalLatitude: r.decimalLatitude,
                    decimalLongitude: r.decimalLongitude,
                    iucnStatus: r.iucnRedListCategory || "UNKNOWN",
                    individualCount: r.individualCount || 1
                }));

            const filtered = this.filterSpeciesInBuffer(species, bufferPolygon);

            if (!filtered.length) {
                return allowMock ? this.enrichWithLocalNames(this.filterSpeciesInBuffer(this.getMockSpeciesData(bufferPolygon), bufferPolygon)) : [];
            }

            return this.enrichWithLocalNames(filtered);

        } catch (err) {
            console.log("GBIF API failed → using mock data");
            if (!allowMock) {
                return [];
            }

            const mock = this.getMockSpeciesData(bufferPolygon);
            const filtered = this.filterSpeciesInBuffer(mock, bufferPolygon);
            return this.enrichWithLocalNames(filtered);
        }
    }

    getRiskPriority(status) {
        const s = (status || "").toUpperCase();
        if (s.includes("CR")) return 4;
        if (s.includes("EN")) return 3;
        if (s.includes("VU")) return 2;
        if (s.includes("NT") || s.includes("LC")) return 1;
        return 0;
    }

    aggregateSpeciesRecords(records) {
        if (!Array.isArray(records) || records.length === 0) {
            return [];
        }

        const grouped = new Map();

        for (const item of records) {
            const scientificName = this.normalizeScientificName(item.scientificName || "");
            if (!scientificName) continue;

            const existing = grouped.get(scientificName);
            const currentPriority = this.getRiskPriority(item.iucnStatus);

            if (!existing) {
                grouped.set(scientificName, {
                    ...item,
                    scientificName,
                    occurrenceCount: 1,
                    individualCount: Number(item.individualCount) || 1
                });
                continue;
            }

            const existingPriority = this.getRiskPriority(existing.iucnStatus);

            existing.occurrenceCount += 1;
            existing.individualCount += Number(item.individualCount) || 1;

            if (currentPriority > existingPriority) {
                existing.iucnStatus = item.iucnStatus;
            }

            if ((!existing.commonName || this.isLikelyScientificName(existing.commonName)) && item.commonName) {
                existing.commonName = item.commonName;
            }

            if ((!existing.localName || this.isLikelyScientificName(existing.localName)) && item.localName) {
                existing.localName = item.localName;
            }
        }

        return [...grouped.values()].sort((a, b) => {
            const riskDiff = this.getRiskPriority(b.iucnStatus) - this.getRiskPriority(a.iucnStatus);
            if (riskDiff !== 0) return riskDiff;
            return (b.occurrenceCount || 0) - (a.occurrenceCount || 0);
        });
    }

    async enrichWithLocalNames(species) {
        if (!Array.isArray(species) || species.length === 0) {
            return [];
        }

        const namesNeedingLocal = species
            .filter((item) => {
                const currentLocal = item?.localName || "";
                if (!currentLocal) return true;
                return this.isLikelyScientificName(currentLocal);
            })
            .map((item) => item?.scientificName)
            .filter((name) => typeof name === "string" && name.trim());

        const uniqueScientificNames = [...new Set(
            namesNeedingLocal
        )];

        // Limit resolution calls to avoid expensive bursts when GBIF returns large sets.
        const maxResolves = 12;
        const namesToResolve = uniqueScientificNames
            .filter((name) => !this.localNameCache.has(name))
            .slice(0, maxResolves);

        for (const name of namesToResolve) {
            const normalizedName = this.normalizeScientificName(name);
            try {
                const localName = await getLocalSpeciesName(normalizedName);
                this.localNameCache.set(name, localName || normalizedName || name);
            } catch (error) {
                this.localNameCache.set(name, name);
            }
        }

        return species.map((item) => {
            const scientificName = item.scientificName;
            const resolved = this.localNameCache.get(scientificName);
            const localName = resolved || item.localName || item.commonName || scientificName;
            const hindiName = this.resolveHindiName(item, localName);

            return {
                ...item,
                commonName: item.commonName || scientificName,
                localName,
                hindiName
            };
        });
    }

    getMockSpeciesData(bufferPolygon) {
        // Mock endangered species commonly found in Ganga basin
        // Coordinates adjusted to be within Ganga River corridor
        const mockSpecies = [
            {
                scientificName: 'Platanista gangetica',
                commonName: 'Gangetic River Dolphin',
                decimalLatitude: 25.4350,
                decimalLongitude: 81.8460,
                iucnStatus: 'ENDANGERED',
                individualCount: 1,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Gavialis gangeticus',
                commonName: 'Gharial',
                decimalLatitude: 26.9500,
                decimalLongitude: 78.1700,
                iucnStatus: 'CRITICALLY_ENDANGERED',
                individualCount: 2,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Bos gaurus',
                commonName: 'Gaur',
                decimalLatitude: 25.6120,
                decimalLongitude: 85.1230,
                iucnStatus: 'VULNERABLE',
                individualCount: 5,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Macaca mulatta',
                commonName: 'Rhesus Macaque',
                decimalLatitude: 27.1750,
                decimalLongitude: 78.0100,
                iucnStatus: 'LEAST_CONCERN',
                individualCount: 10,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Elephas maximus',
                commonName: 'Asian Elephant',
                decimalLatitude: 26.1200,
                decimalLongitude: 84.3600,
                iucnStatus: 'ENDANGERED',
                individualCount: 3,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Panthera tigris',
                commonName: 'Bengal Tiger',
                decimalLatitude: 25.8900,
                decimalLongitude: 82.4500,
                iucnStatus: 'ENDANGERED',
                individualCount: 1,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Python molurus',
                commonName: 'Indian Python',
                decimalLatitude: 26.4500,
                decimalLongitude: 80.3200,
                iucnStatus: 'VULNERABLE',
                individualCount: 1,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Hylobates hoolock',
                commonName: 'Hoolock Gibbon',
                decimalLatitude: 25.7800,
                decimalLongitude: 83.1200,
                iucnStatus: 'VULNERABLE',
                individualCount: 8,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Crocodylus palustris',
                commonName: 'Mugger Crocodile',
                decimalLatitude: 26.2300,
                decimalLongitude: 78.7800,
                iucnStatus: 'VULNERABLE',
                individualCount: 2,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Nelsonia griseus',
                commonName: 'Gangetic Turtle',
                decimalLatitude: 25.3400,
                decimalLongitude: 82.8900,
                iucnStatus: 'CRITICALLY_ENDANGERED',
                individualCount: 3,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Sundaicola gangeticus',
                commonName: 'Gangetic Softshell Turtle',
                decimalLatitude: 24.8900,
                decimalLongitude: 86.1200,
                iucnStatus: 'CRITICALLY_ENDANGERED',
                individualCount: 2,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Aonyx cinereus',
                commonName: 'Asian Small-clawed Otter',
                decimalLatitude: 25.1500,
                decimalLongitude: 84.5600,
                iucnStatus: 'VULNERABLE',
                individualCount: 4,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Varanus bengalensis',
                commonName: 'Bengal Monitor',
                decimalLatitude: 26.5600,
                decimalLongitude: 79.8900,
                iucnStatus: 'LEAST_CONCERN',
                individualCount: 6,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Haliastur indus',
                commonName: 'Brahminy Kite',
                decimalLatitude: 25.9200,
                decimalLongitude: 81.2300,
                iucnStatus: 'LEAST_CONCERN',
                individualCount: 12,
                basisOfRecord: 'HUMAN_OBSERVATION'
            },
            {
                scientificName: 'Sarus crane',
                commonName: 'Sarus Crane',
                decimalLatitude: 27.3400,
                decimalLongitude: 77.5600,
                iucnStatus: 'VULNERABLE',
                individualCount: 3,
                basisOfRecord: 'HUMAN_OBSERVATION'
            }
        ];

        const randomSpecies = [];
        const riskTypes = ["LEAST_CONCERN","VULNERABLE","ENDANGERED","CRITICALLY_ENDANGERED"];

        const bbox = turf.bbox(bufferPolygon);

        for (let i = 0; i < 30; i++) {

            const randomPoint = turf.randomPoint(1, { bbox });
            const coords = randomPoint.features[0].geometry.coordinates;

            randomSpecies.push({
                scientificName: `Species ${i}`,
                commonName: `Common ${i}`,
                decimalLatitude: coords[1],
                decimalLongitude: coords[0],
                iucnStatus: riskTypes[i % 4],
                individualCount: Math.floor(Math.random() * 5) + 1
            });
        }

        return [...mockSpecies, ...randomSpecies];
    }

    classifyRisk(status) {
        const s = status?.toUpperCase();

        switch (s) {
            case "CR":
            case "CRITICALLY_ENDANGERED":
                return "RED";

            case "EN":
            case "ENDANGERED":
                return "BLUE";

            case "VU":
            case "VULNERABLE":
                return "YELLOW";

            default:
                return "GREEN";
        }
    }

    filterSpeciesInBuffer(species, bufferPolygon) {

        return species.filter((s) => {

            if (!s.decimalLatitude || !s.decimalLongitude) return false;

            const point = turf.point([
                s.decimalLongitude,
                s.decimalLatitude
            ]);

            return turf.booleanPointInPolygon(point, bufferPolygon);

        });
    }

    convertToGeoJSON(species) {

        const features = species.map((s) => {

            const risk = this.classifyRisk(s.iucnStatus);

            return {
                type: "Feature",
                properties: {
                    scientificName: s.scientificName,
                    commonName: s.commonName,
                    localName: s.localName || s.commonName || s.scientificName,
                    hindiName: s.hindiName || null,
                    riskLevel: risk,
                    individualCount: s.individualCount
                },
                geometry: {
                    type: "Point",
                    coordinates: [
                        s.decimalLongitude,
                        s.decimalLatitude
                    ]
                }
            };
        });

        return {
            type: "FeatureCollection",
            features
        };
    }

    applyMajorSpeciesFilter(species, majorSpeciesOnly = false) {
        if (!majorSpeciesOnly) {
            return species;
        }

        return [...species]
            .sort((left, right) => (right.individualCount || 0) - (left.individualCount || 0))
            .slice(0, 40);
    }

    buildRiskStats(species) {
        const riskStats = {
            total: species.length,
            red: 0,
            blue: 0,
            yellow: 0,
            green: 0
        };

        species.forEach((s) => {
            const r = this.classifyRisk(s.iucnStatus);
            riskStats[r.toLowerCase()]++;
        });

        return riskStats;
    }

    async buildAnalysisFromBuffer(buffer, radiusKm, options = {}) {
        const {
            majorSpeciesOnly = false,
            regionName = "Ganga River Corridor",
            center = null,
            allowMock = true
        } = options;

        const rawSpecies = await this.fetchGBIFSpecies(buffer, 1000, { allowMock });
        const uniqueSpecies = this.aggregateSpeciesRecords(rawSpecies);
        const species = this.applyMajorSpeciesFilter(uniqueSpecies, majorSpeciesOnly);
        const geojson = this.convertToGeoJSON(species);
        const riskStats = this.buildRiskStats(species);

        return {
            success: true,
            dataSource: allowMock ? "gbif-or-mock" : "gbif-only",
            region: {
                name: regionName,
                lat: center?.lat ?? null,
                lon: center?.lon ?? null
            },
            buffer: {
                radiusKm,
                areaKm2: turf.area(buffer) / 1_000_000,
                geojson: buffer
            },
            species: {
                total: riskStats.total,
                observations: rawSpecies.length,
                breakdown: riskStats,
                data: species
            },
            geojson,
            timestamp: new Date().toISOString()
        };
    }

    async analyzeBufferZone(radiusKm = 5, majorSpeciesOnly = false, options = {}) {

        try {

            const buffer = this.createBuffer(radiusKm);

            if (!buffer) throw new Error("Buffer creation failed");

            return await this.buildAnalysisFromBuffer(buffer, radiusKm, {
                majorSpeciesOnly,
                regionName: "Ganga River Corridor",
                allowMock: options.allowMock ?? true
            });

        } catch (error) {

            console.error("Buffer analysis error:", error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeLocationZone(lat, lon, radiusKm = 25, majorSpeciesOnly = false, regionName = "Custom Zone", options = {}) {
        try {
            const buffer = this.createCircularBuffer(lat, lon, radiusKm);

            if (!buffer) {
                throw new Error("Location buffer creation failed");
            }

            return await this.buildAnalysisFromBuffer(buffer, radiusKm, {
                majorSpeciesOnly,
                regionName,
                center: {
                    lat,
                    lon
                },
                allowMock: options.allowMock ?? false
            });
        } catch (error) {
            console.error("Location analysis error:", error);

            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const gangaBufferService = new GangaBufferService();
export { GangaBufferService };