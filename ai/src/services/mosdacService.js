import axios from 'axios';
import FormData from 'form-data';

const MOSDAC_BASE_URL = 'https://www.mosdac.gov.in';
const MOSDAC_DATA_URL = 'https://www.mosdac.gov.in/livebackend/dataResource';

class MosdacService {
    constructor() {
        this.session = axios.create({
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        this.isLoggedIn = false;
    }

    async login(username, password) {
        try {
            // MOSDAC login page and form
            const loginUrl = `${MOSDAC_BASE_URL}/loginCheck`;
            
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);
            
            const response = await this.session.post(loginUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Referer': MOSDAC_BASE_URL
                }
            });

            // Check if login was successful
            // MOSDAC typically sets session cookies on successful login
            this.isLoggedIn = response.status === 200;
            
            return this.isLoggedIn;
        } catch (error) {
            console.error('MOSDAC login error:', error.message);
            return false;
        }
    }

    async getChlorophyllData(lat, lon, radius = 25) {
        try {
            // MOSDAC EOS-04/CES data products
            // chlorophyll-a from OLCI/SLSTR sensors
            
            const resourceUrl = `${MOSDAC_DATA_URL}/getChlorophyll`;
            
            const params = {
                lat: lat,
                lon: lon,
                radius: radius,
                product: 'chlor_a',
                satellite: 'EOS-06'
            };

            const response = await this.session.get(resourceUrl, { params });
            
            if (response.data) {
                return this.processChlorophyllData(response.data);
            }
            
            // If no data from API, return mock for demo
            return this.getMockChlorophyllData(lat, lon);
            
        } catch (error) {
            console.error('MOSDAC chlorophyll data error:', error.message);
            return this.getMockChlorophyllData(lat, lon);
        }
    }

    async getSSTData(lat, lon, radius = 25) {
        try {
            // Sea Surface Temperature from MOSDAC
            const resourceUrl = `${MOSDAC_DATA_URL}/getSST`;
            
            const params = {
                lat: lat,
                lon: lon,
                radius: radius,
                satellite: 'EOS-04'
            };

            const response = await this.session.get(resourceUrl, { params });
            
            if (response.data) {
                return this.processSSTData(response.data);
            }
            
            return this.getMockSSTData(lat, lon);
            
        } catch (error) {
            console.error('MOSDAC SST data error:', error.message);
            return this.getMockSSTData(lat, lon);
        }
    }

    async getOceanColorData(lat, lon, radius = 25) {
        try {
            // Ocean color data from MOSDAC
            const resourceUrl = `${MOSDAC_DATA_URL}/getOceanColor`;
            
            const params = {
                lat: lat,
                lon: lon,
                radius: radius,
                variables: ['chlor_a', 'Kd_490', 'CDOM']
            };

            const response = await this.session.get(resourceUrl, { params });
            
            if (response.data) {
                return this.processOceanColorData(response.data);
            }
            
            return this.getMockOceanColorData(lat, lon);
            
        } catch (error) {
            console.error('MOSDAC ocean color data error:', error.message);
            return this.getMockOceanColorData(lat, lon);
        }
    }

    processChlorophyllData(data) {
        // Process MOSDAC NetCDF data response
        const chlor_a = data.chlor_a || data.chlorophyll || 0.5;
        
        return {
            value: parseFloat(chlor_a),
            unit: 'mg/m³',
            riskLevel: this.calculateChlorophyllRisk(chlor_a),
            source: 'MOSDAC EOS-06'
        };
    }

    processSSTData(data) {
        const sst = data.sst || data.sea_surface_temperature || 28;
        
        return {
            value: parseFloat(sst),
            unit: '°C',
            riskLevel: this.calculateSSTRisk(sst),
            source: 'MOSDAC EOS-04'
        };
    }

    processOceanColorData(data) {
        return {
            chlor_a: data.chlor_a || 0.5,
            Kd_490: data.Kd_490 || 0.1,
            CDOM: data.CDOM || 0.01,
            source: 'MOSDAC Ocean Color'
        };
    }

    calculateChlorophyllRisk(chl) {
        // Chlorophyll-a based coastal risk assessment
        if (chl > 10) return 'Critical';
        if (chl > 5) return 'Endangered';
        if (chl > 2) return 'Vulnerable';
        return 'Stable';
    }

    calculateSSTRisk(sst) {
        // SST anomaly based risk
        if (sst > 32) return 'Critical';
        if (sst > 30) return 'High';
        if (sst > 28) return 'Moderate';
        return 'Normal';
    }

    getMockChlorophyllData(lat, lon) {
        // Mock data for demo when MOSDAC API is not accessible
        const chlor_a = 0.3 + Math.random() * 5;
        
        return {
            value: parseFloat(chlor_a.toFixed(2)),
            unit: 'mg/m³',
            riskLevel: this.calculateChlorophyllRisk(chlor_a),
            source: 'MOSDAC EOS-06 (Simulated)',
            isMock: true
        };
    }

    getMockSSTData(lat, lon) {
        const sst = 26 + Math.random() * 5;
        
        return {
            value: parseFloat(sst.toFixed(1)),
            unit: '°C',
            riskLevel: this.calculateSSTRisk(sst),
            source: 'MOSDAC EOS-04 (Simulated)',
            isMock: true
        };
    }

    getMockOceanColorData(lat, lon) {
        return {
            chlor_a: parseFloat((0.3 + Math.random() * 5).toFixed(2)),
            Kd_490: parseFloat((0.05 + Math.random() * 0.1).toFixed(3)),
            CDOM: parseFloat((0.005 + Math.random() * 0.02).toFixed(3)),
            source: 'MOSDAC Ocean Color (Simulated)',
            isMock: true
        };
    }

    convertToGeoJSON(data, lat, lon, radius) {
        // Convert point data to GeoJSON FeatureCollection
        const riskColor = this.getRiskColor(data.riskLevel);
        
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        ...data,
                        radius_km: radius,
                        color: riskColor
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    }
                },
                {
                    type: 'Feature',
                    properties: {
                        name: `Analysis Zone`,
                        radius_km: radius
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [lon - radius * 0.01, lat - radius * 0.01],
                            [lon + radius * 0.01, lat - radius * 0.01],
                            [lon + radius * 0.01, lat + radius * 0.01],
                            [lon - radius * 0.01, lat + radius * 0.01],
                            [lon - radius * 0.01, lat - radius * 0.01]
                        ]]
                    }
                }
            ]
        };
    }

    getRiskColor(level) {
        switch(level) {
            case 'Critical': return '#ef4444';
            case 'Endangered': return '#f97316';
            case 'Vulnerable': return '#eab308';
            case 'High': return '#f97316';
            case 'Moderate': return '#eab308';
            default: return '#22c55e';
        }
    }

    async analyzeLocation(lat, lon, radius = 25) {
        // Main analysis function combining all MOSDAC data
        const [chlorophyll, sst, oceanColor] = await Promise.all([
            this.getChlorophyllData(lat, lon, radius),
            this.getSSTData(lat, lon, radius),
            this.getOceanColorData(lat, lon, radius)
        ]);

        // Calculate combined risk
        const riskScores = {
            'Critical': 4,
            'Endangered': 3,
            'Vulnerable': 2,
            'High': 2,
            'Moderate': 1,
            'Stable': 0,
            'Normal': 0
        };

        const totalScore = riskScores[chlorophyll.riskLevel] + 
                          riskScores[sst.riskLevel] +
                          (oceanColor.chlor_a > 5 ? 2 : oceanColor.chlor_a > 2 ? 1 : 0);

        let overallRisk = 'Stable';
        if (totalScore >= 6) overallRisk = 'Critical';
        else if (totalScore >= 4) overallRisk = 'Endangered';
        else if (totalRisk >= 2) overallRisk = 'Vulnerable';
        else if (totalScore >= 1) overallRisk = 'Moderate';

        const result = {
            location: { lat, lon, radius_km: radius },
            chlorophyll,
            sst,
            oceanColor,
            overallRisk,
            riskScore: totalScore,
            timestamp: new Date().toISOString(),
            geojson: this.convertToGeoJSON(chlorophyll, lat, lon, radius)
        };

        return result;
    }
}

// Export singleton instance
export const mosdacService = new MosdacService();

// Export class for testing
export { MosdacService };
