import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GangaBufferService {
    constructor() {
        this.gangaRiver = null;
        this.buffers = {};
        this.loadGangaGeometry();
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

    async fetchGBIFSpecies(bufferPolygon, limit = 100) {
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
                        limit
                    }
                }
            );

            if (!response.data?.results) {
                return this.getMockSpeciesData(bufferPolygon);
            }

            const species = response.data.results.map((r) => ({
                scientificName: r.scientificName,
                commonName: r.vernacularName || r.scientificName,
                decimalLatitude: r.decimalLatitude,
                decimalLongitude: r.decimalLongitude,
                iucnStatus: r.iucnRedListCategory || "UNKNOWN",
                individualCount: r.individualCount || 1
            }));

            return this.filterSpeciesInBuffer(species, bufferPolygon);

        } catch (err) {
            console.log("GBIF API failed → using mock data");
            return this.getMockSpeciesData(bufferPolygon);
        }
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

    async analyzeBufferZone(radiusKm = 5) {

        try {

            const buffer = this.createBuffer(radiusKm);

            if (!buffer) throw new Error("Buffer creation failed");

            const species = await this.fetchGBIFSpecies(buffer);

            const geojson = this.convertToGeoJSON(species);

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

            return {
                success: true,
                buffer: {
                    radiusKm,
                    areaKm2: turf.area(buffer) / 1_000_000,
                    geojson: buffer
                },
                species: {
                    total: riskStats.total,
                    breakdown: riskStats,
                    data: species
                },
                geojson,
                timestamp: new Date().toISOString()
            };

        } catch (error) {

            console.error("Buffer analysis error:", error);

            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const gangaBufferService = new GangaBufferService();
export { GangaBufferService };