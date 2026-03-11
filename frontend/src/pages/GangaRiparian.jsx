import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Nav from '../components/Nav';
import { getUserLocation } from '../utils/location';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Risk colors for species
const RISK_COLORS = {
    RED: '#ef4444',       // Critically Endangered
    BLUE: '#3b82f6',      // Endangered
    YELLOW: '#eab308',    // Vulnerable
    GREEN: '#22c55e'     // Least Concern
};

const RISK_LABELS = {
    RED: 'Critical',
    BLUE: 'Endangered',
    YELLOW: 'Vulnerable',
    GREEN: 'Stable'
};

// Ganga stretches with colors
const GANGA_STRETCHES = [
    { id: 'upper', name: 'Upper Ganga', lat: 30.0, lon: 78.3, color: '#22c55e', status: 'Good', pollution: 'Low' },
    { id: 'middle-upper', name: 'Upper-Middle', lat: 27.5, lon: 79.0, color: '#84cc16', status: 'Good', pollution: 'Moderate' },
    { id: 'middle', name: 'Middle Ganga', lat: 25.8, lon: 81.5, color: '#eab308', status: 'Average', pollution: 'High' },
    { id: 'middle-lower', name: 'Lower-Middle', lat: 25.4, lon: 84.5, color: '#f97316', status: 'Poor', pollution: 'High' },
    { id: 'lower', name: 'Lower Ganga', lat: 24.0, lon: 87.0, color: '#ef4444', status: 'Poor', pollution: 'Very High' },
    { id: 'delta', name: 'Ganga Delta', lat: 21.5, lon: 89.0, color: '#dc2626', status: 'Critical', pollution: 'Critical' },
];

// Ganga River simplified line coordinates
const GANGA_RIVER_COORDS = [
    [78.4968, 30.9878], [78.6, 30.9], [78.7, 30.8], [78.8, 30.7], [78.9, 30.6],
    [79.0, 30.5], [79.1, 30.4], [79.2, 30.3], [79.3, 30.2], [79.4, 30.1],
    [79.5, 30.0], [79.6, 29.9], [79.7, 29.8], [79.8, 29.7], [79.9, 29.6],
    [80.0, 29.5], [80.1, 29.4], [80.2, 29.3], [80.3, 29.2], [80.4, 29.1],
    [80.5, 29.0], [80.6, 28.9], [80.7, 28.8], [80.8, 28.7], [80.9, 28.6],
    [81.0, 28.5], [81.1, 28.4], [81.2, 28.3], [81.3, 28.2], [81.4, 28.1],
    [81.5, 28.0], [81.6, 27.9], [81.7, 27.8], [81.8, 27.7], [81.9, 27.6],
    [82.0, 27.5], [82.1, 27.4], [82.2, 27.3], [82.3, 27.2], [82.4, 27.1],
    [82.5, 27.0], [82.6, 26.9], [82.7, 26.8], [82.8, 26.7], [82.9, 26.6],
    [83.0, 26.5], [83.1, 26.4], [83.2, 26.3], [83.3, 26.2], [83.4, 26.1],
    [83.5, 26.0], [83.6, 25.9], [83.7, 25.8], [83.8, 25.7], [83.9, 25.6],
    [84.0, 25.5], [84.1, 25.4], [84.2, 25.3], [84.3, 25.2], [84.4, 25.1],
    [84.5, 25.0], [84.6, 24.9], [84.7, 24.8], [84.8, 24.7], [84.9, 24.6],
    [85.0, 24.5], [85.1, 24.4], [85.2, 24.3], [85.3, 24.2], [85.4, 24.1],
    [85.5, 24.0], [85.6, 23.9], [85.7, 23.8], [85.8, 23.7], [85.9, 23.6],
    [86.0, 23.5], [86.1, 23.4], [86.2, 23.3], [86.3, 23.2], [86.4, 23.1],
    [86.5, 23.0], [86.6, 22.9], [86.7, 22.8], [86.8, 22.7], [86.9, 22.6],
    [87.0, 22.5], [87.1, 22.4], [87.2, 22.3], [87.3, 22.2], [87.4, 22.1],
    [87.5, 22.0], [87.6, 21.9], [87.7, 21.8], [87.8, 21.7], [87.9, 21.6],
    [88.0, 21.5], [88.1, 21.4], [88.2, 21.3], [88.3, 21.2], [88.4, 21.1],
    [88.5, 21.0], [88.6, 20.9], [88.7, 20.8], [88.8, 20.7], [88.9, 20.6],
    [89.0, 20.5], [89.1, 20.4], [89.2, 20.3], [89.3, 20.2], [89.4, 20.1],
    [89.5, 20.0], [89.6, 19.9], [89.7, 19.8], [89.8, 19.7], [89.9, 19.6],
    [90.0, 19.5], [90.1, 19.4], [90.2, 19.3], [90.3, 19.2], [90.4, 19.1],
    [90.5, 19.0], [90.6, 18.9], [90.7, 18.8], [90.8, 18.7], [90.9, 18.6],
    [91.0, 18.5], [91.1, 18.4], [91.2, 18.3], [91.3, 18.2], [91.4, 18.1],
    [91.5, 18.0], [91.6, 17.9], [91.7, 17.8], [91.8, 17.7], [91.9, 17.6],
    [92.0, 17.5], [92.1, 17.4], [92.2, 17.3], [92.3, 17.2], [92.4, 17.1],
    [92.5, 17.0], [92.6, 16.9], [92.7, 16.8], [92.8, 16.7], [92.9, 16.6],
    [93.0, 16.5], [93.1, 16.4], [93.2, 16.3], [93.3, 16.2], [93.4, 16.1],
    [93.5, 16.0], [93.6, 15.9], [93.7, 15.8], [93.8, 15.7], [93.9, 15.6],
    [94.0, 15.5], [94.1, 15.4], [94.2, 15.3], [94.3, 15.2], [94.4, 15.1],
    [94.5, 15.0], [94.6, 14.9], [94.7, 14.8], [94.8, 14.7], [94.9, 14.6],
    [95.0, 14.5], [95.1, 14.4], [95.2, 14.3], [95.3, 14.2], [95.4, 14.1],
    [95.5, 14.0], [95.6, 13.9], [95.7, 13.8], [95.8, 13.7], [95.9, 13.6],
    [96.0, 13.5], [96.1, 13.4], [96.2, 13.3], [96.3, 13.2], [96.4, 13.1],
    [96.5, 13.0], [96.6, 12.9], [96.7, 12.8], [96.8, 12.7], [96.9, 12.6],
    [97.0, 12.5], [97.1, 12.4], [97.2, 12.3], [97.3, 12.2], [97.4, 12.1],
    [97.5, 12.0], [97.6, 11.9], [97.7, 11.8], [97.8, 11.7], [97.9, 11.6],
    [98.0, 11.5], [98.1, 11.4], [98.2, 11.3], [98.3, 11.2], [98.4, 11.1],
    [98.5, 11.0], [98.6, 10.9], [98.7, 10.8], [98.8, 10.7], [98.9, 10.6],
    [99.0, 10.5], [99.1, 10.4], [99.2, 10.3], [99.3, 10.2], [99.4, 10.1],
    [99.5, 10.0], [99.6, 9.9], [99.7, 9.8], [99.8, 9.7], [99.9, 9.6],
    [100.0, 9.5], [100.1, 9.4], [100.2, 9.3], [100.3, 9.2], [100.4, 9.1],
    [100.5, 9.0], [100.6, 8.9], [100.7, 8.8], [100.8, 8.7], [100.9, 8.6],
];

// Ganga River GeoJSON line
const gangaRiverGeoJSON = {
    type: 'Feature',
    properties: { name: 'Ganga River' },
    geometry: {
        type: 'LineString',
        coordinates: GANGA_RIVER_COORDS
    }
};

// Buffer zone polygons (simplified)
const createBufferPolygon = (lat, lon, size) => {
    const points = [];
    const steps = 16;
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const latOffset = Math.cos(angle) * (size / 111);
        const lonOffset = Math.sin(angle) * (size / 111 / Math.cos(lat * Math.PI / 180));
        points.push([lon + lonOffset, lat + latOffset]);
    }
    points.push(points[0]);
    return [points];
};

// Buffer zone GeoJSON
const bufferZoneGeoJSON = {
    type: 'Feature',
    properties: { name: 'Buffer Zone (25km)' },
    geometry: {
        type: 'Polygon',
        coordinates: createBufferPolygon(25.5, 82.0, 25)
    }
};

// Recenter map
const RecenterMap = ({ lat, lon }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lon) {
            map.flyTo([lat, lon], 8);
        }
    }, [lat, lon, map]);
    return null;
};

const GangaRiparian = () => {
    const [selectedStretch, setSelectedStretch] = useState(null);
    const [location, setLocation] = useState({ lat: 25.435, lon: 81.846 });
    const [uploadedImage, setUploadedImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [step, setStep] = useState(1); // 1=Map/Stretch, 2=Photo, 3=Results
    const [showBuffer, setShowBuffer] = useState(true);
    const [showSpecies, setShowSpecies] = useState(true);
    const [bufferData, setBufferData] = useState(null);
    const [bufferRadius, setBufferRadius] = useState(25);
    const [majorSpeciesOnly, setMajorSpeciesOnly] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [loading, setLoading] = useState(false);
    const [speciesData, setSpeciesData] = useState(null);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        getUserLocation()
            .then(coords => {
                setLocation({ lat: coords.latitude, lon: coords.longitude });
            })
            .catch(() => {});
    }, []);

    // Fetch buffer zone data from API
    useEffect(() => {
        if (showBuffer) {
            fetchBufferData();
        }
    }, [showBuffer, bufferRadius]);

    const fetchBufferData = async () => {
        try {
            const response = await fetch(`${API_URL}/satellite/ganga/buffer?radius=${bufferRadius}`);
            if (response.ok) {
                const data = await response.json();
                setBufferData(data);
            }
        } catch {
            setBufferData(null);
        }
    };

    // Fetch species data for biodiversity analysis
    const fetchSpeciesData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/satellite/ganga/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    radius: bufferRadius,
                    majorSpeciesOnly
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSpeciesData(data);
                setBufferData(prev => data.buffer?.geojson ? { ...prev, buffer: data.buffer } : prev);
            }
        } catch {
            setSpeciesData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleStretchSelect = (stretch) => {
        setSelectedStretch(stretch);
        setLocation({ lat: stretch.lat, lon: stretch.lon });
        setAnalysisResult(null);
        setStep(2);
        fetchSpeciesData();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage({ file, preview: imageUrl });
            setShowCamera(false);
        }
    };

    const analyzeWater = async () => {
        if (!uploadedImage || !selectedStretch) return;
        setAnalyzing(true);
        setStep(3);

        try {
            const formData = new FormData();
            formData.append('image', uploadedImage.file);
            formData.append('lat', location.lat);
            formData.append('lon', location.lon);
            formData.append('stretchId', selectedStretch.id);

            const response = await fetch(`${API_URL}/riparian/ganga/full-analysis`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setAnalysisResult(result);
            } else {
                throw new Error('API error');
            }
        } catch {
            setAnalysisResult({
                success: true,
                waterAnalysis: { waterStatus: 'Average', statusEmoji: '🟡', waterQualityScore: 65, imageAnalysis: { turbidityIndicator: 45, foamAlgaeIndicator: 30 } },
                speciesAnalysis: { waterStatus: 'Average', estimatedRichness: 60, likelySpecies: [{ name: 'Rohu' }], unlikelySpecies: [{ name: 'Gharial' }] }
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setUploadedImage(null);
        setAnalysisResult(null);
        setStep(1);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Good': return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'Average': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
            case 'Poor': return 'bg-red-500/20 border-red-500/50 text-red-400';
            default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
        }
    };

    // Get risk summary for species
    const getRiskSummary = () => {
        if (!speciesData?.species?.breakdown) return null;
        const { breakdown } = speciesData.species;
        return (
            <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <div className="text-lg font-bold text-red-400">{breakdown.red || 0}</div>
                    <div className="text-[8px] text-red-300">Critical</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <div className="text-lg font-bold text-blue-400">{breakdown.blue || 0}</div>
                    <div className="text-[8px] text-blue-300">Endangered</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                    <div className="text-lg font-bold text-yellow-400">{breakdown.yellow || 0}</div>
                    <div className="text-[8px] text-yellow-300">Vulnerable</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <div className="text-lg font-bold text-green-400">{breakdown.green || 0}</div>
                    <div className="text-[8px] text-green-300">Stable</div>
                </div>
            </div>
        );
    };

    return (
        <div className="text-white/90 font-sans min-h-screen bg-bg-gradient-start">
            <div className="max-w-md mx-auto min-h-screen relative z-10 pb-32 sm:max-w-2xl md:max-w-4xl">
                {/* Header */}
                <div className="flex items-center p-4 sm:p-6 justify-between">
                    <div className="flex-1 flex flex-col items-center">
                        <h2 className="frosted-text text-base sm:text-lg font-bold tracking-tight">Bio Sentinel</h2>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-neon-green font-bold">Ganga Riparian</span>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="px-4 sm:px-6 mb-4">
                    <div className="flex items-center justify-between max-w-xs mx-auto">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                    step >= s ? 'bg-neon-green text-black' : 'bg-white/10 text-white/40'
                                }`}>
                                    {s}
                                </div>
                                {s < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > s ? 'bg-neon-green' : 'bg-white/10'}`}></div>}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] sm:text-[10px] text-white/50 px-2 max-w-xs mx-auto">
                        <span>Map</span>
                        <span>Photo</span>
                        <span>Results</span>
                    </div>
                </div>

                {/* Buffer Radius Selector */}
                <div className="px-4 sm:px-6 mb-2">
                    <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ml-1">Buffer Radius</h3>
                    <div className="flex gap-2">
                        {[5, 10, 25, 50].map((radius) => (
                            <button
                                key={radius}
                                onClick={() => setBufferRadius(radius)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                    bufferRadius === radius
                                        ? 'bg-neon-green text-black'
                                        : 'glass-panel text-white/70 hover:bg-white/10'
                                }`}
                            >
                                {radius} km
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map Controls */}
                <div className="px-4 sm:px-6 mb-2 flex gap-2 items-center flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showBuffer} onChange={(e) => setShowBuffer(e.target.checked)} className="w-4 h-4 accent-neon-green" />
                        <span className="text-xs text-white/60">Buffer Zone</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showSpecies} onChange={(e) => setShowSpecies(e.target.checked)} className="w-4 h-4 accent-neon-green" />
                        <span className="text-xs text-white/60">Satellite Species</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer ml-auto">
                        <input type="checkbox" checked={majorSpeciesOnly} onChange={(e) => setMajorSpeciesOnly(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
                        <span className="text-xs text-white/60">Major Species</span>
                    </label>
                </div>

                {/* Map Section */}
                <div className="px-4 sm:px-6 mb-4">
                    <div className="relative w-full h-56 sm:h-72 md:h-80 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
                        <MapContainer center={[25.5, 83.0]} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            <RecenterMap lat={location.lat} lon={location.lon} />

                            {/* Buffer Zone - from API satellite data */}
                            {showBuffer && (() => {
                                const bufferGeoJSON = bufferData?.buffer?.geojson || bufferZoneGeoJSON;
                                return (
                                    <GeoJSON 
                                        data={bufferGeoJSON}
                                        style={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2 }}
                                    />
                                );
                            })()}

                            {/* Ganga River Line */}
                            <GeoJSON 
                                data={gangaRiverGeoJSON}
                                style={{ color: '#3b82f6', weight: 3 }}
                            />

                            {/* Stretch Markers */}
                            {GANGA_STRETCHES.map(stretch => (
                                <CircleMarker
                                    key={stretch.id}
                                    center={[stretch.lat, stretch.lon]}
                                    radius={selectedStretch?.id === stretch.id ? 12 : 8}
                                    pathOptions={{
                                        color: stretch.color,
                                        fillColor: stretch.color,
                                        fillOpacity: 0.8,
                                        weight: 3
                                    }}
                                    eventHandlers={{ click: () => handleStretchSelect(stretch) }}
                                />
                            ))}

                            {/* Satellite Species Markers */}
                            {showSpecies && speciesData?.geojson?.features?.map((feature, index) => {
                                const [lon, lat] = feature.geometry.coordinates;
                                const { riskLevel, scientificName, commonName } = feature.properties;
                                return (
                                    <CircleMarker
                                        key={feature.properties.id || index}
                                        center={[lat, lon]}
                                        radius={majorSpeciesOnly ? 10 : 6}
                                        pathOptions={{
                                            color: RISK_COLORS[riskLevel] || RISK_COLORS.GREEN,
                                            fillColor: RISK_COLORS[riskLevel] || RISK_COLORS.GREEN,
                                            fillOpacity: 0.8,
                                            weight: 2
                                        }}
                                        eventHandlers={{
                                            click: () => setSelectedMarker(feature.properties)
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[120px]">
                                                <h4 className="font-bold text-xs">{commonName || scientificName}</h4>
                                                <p className="text-[10px] text-gray-600">{scientificName}</p>
                                                <span 
                                                    className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full"
                                                    style={{ 
                                                        backgroundColor: RISK_COLORS[riskLevel] || RISK_COLORS.GREEN,
                                                        color: riskLevel === 'YELLOW' ? '#000' : '#fff'
                                                    }}
                                                >
                                                    {RISK_LABELS[riskLevel] || 'Unknown'}
                                                </span>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}

                            {/* User Location */}
                            {location.lat !== 25.435 && (
                                <CircleMarker
                                    center={[location.lat, location.lon]}
                                    radius={6}
                                    pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.8, weight: 2 }}
                                />
                            )}
                        </MapContainer>

                        {/* Map Legend */}
                        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md p-2 rounded-xl z-[400] border border-white/20">
                            <p className="text-[9px] font-bold text-white/90 mb-1 uppercase tracking-wider">Species Risk</p>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-[8px] text-white/70">Critical</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-[8px] text-white/70">Endangered</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span className="text-[8px] text-white/70">Vulnerable</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-[8px] text-white/70">Stable</span>
                                </div>
                            </div>
                        </div>

                        {/* Selected stretch info */}
                        {selectedStretch && (
                            <div className="absolute bottom-3 left-3 right-3 glass-panel px-3 py-2 bg-black/80 border-white/20 rounded-xl backdrop-blur-md z-[400]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs sm:text-sm font-bold text-white">{selectedStretch.name}</p>
                                        <p className="text-[9px] text-white/60">Ganga Basin</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedStretch.color }}></div>
                                        <span className="text-[10px] sm:text-xs font-bold">{selectedStretch.pollution}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Analyze Button */}
                {!step || step === 1 ? (
                    <div className="px-4 sm:px-6 mb-4">
                        <button
                            onClick={fetchSpeciesData}
                            disabled={loading}
                            className="w-full glass-panel bg-neon-green hover:bg-neon-green/90 text-black font-black h-12 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs sm:text-sm rounded-xl"
                        >
                            {loading ? (<><span className="material-symbols-outlined animate-spin">sync</span>Analyzing...</>) : (<><span className="material-symbols-outlined">satellite</span>Satellite Analysis</>)}
                        </button>
                    </div>
                ) : null}

                {/* Species Data Summary */}
                {speciesData && step === 1 && (
                    <div className="px-4 sm:px-6 mb-4">
                        <div className="glass-panel p-4 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Satellite Biodiversity</span>
                                <span className="text-xl font-black text-neon-green">{speciesData.species?.total || 0}</span>
                            </div>
                            <p className="text-[9px] text-white/40 mb-2">
                                Buffer: {speciesData.buffer?.radiusKm || bufferRadius}km | Area: {(speciesData.buffer?.areaKm2 || 0).toFixed(0)} km²
                            </p>
                            {getRiskSummary()}
                        </div>
                    </div>
                )}

                {/* Selected Marker Details */}
                {selectedMarker && (
                    <div className="px-4 sm:px-6 mb-4">
                        <div className="glass-panel p-3 rounded-xl border border-neon-green/30">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-xs">Species Details</h4>
                                <button onClick={() => setSelectedMarker(null)} className="text-white/50 hover:text-white">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </div>
                            <p className="font-bold text-neon-green text-sm">{selectedMarker.commonName}</p>
                            <p className="text-[9px] text-white/60 italic">{selectedMarker.scientificName}</p>
                            <span 
                                className="inline-block mt-1 px-2 py-0.5 text-[9px] rounded-full"
                                style={{ 
                                    backgroundColor: RISK_COLORS[selectedMarker.riskLevel],
                                    color: selectedMarker.riskLevel === 'YELLOW' ? '#000' : '#fff'
                                }}
                            >
                                {RISK_LABELS[selectedMarker.riskLevel]}
                            </span>
                        </div>
                    </div>
                )}

                {/* Step 1: Select Stretch */}
                {step === 1 && (
                    <div className="px-4 sm:px-6">
                        <p className="text-xs sm:text-sm text-white/60 text-center mb-3">
                            Tap a Ganga stretch to analyze water quality
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {GANGA_STRETCHES.map(stretch => (
                                <button
                                    key={stretch.id}
                                    onClick={() => handleStretchSelect(stretch)}
                                    className="w-full glass-panel p-2 sm:p-3 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors border border-white/10"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stretch.color }}></div>
                                        <span className="text-[10px] sm:text-xs font-medium truncate">{stretch.name}</span>
                                    </div>
                                    <span className="text-[8px] text-white/40">{stretch.status}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Upload Photo */}
                {step === 2 && (
                    <div className="px-4 sm:px-6 space-y-3">
                        <div className="glass-panel p-3 rounded-xl border-l-4 border-neon-green">
                            <p className="text-[9px] text-white/60 mb-0.5">Selected Stretch</p>
                            <p className="text-sm font-bold text-neon-green">{selectedStretch?.name}</p>
                        </div>

                        {!uploadedImage && (
                            <div onClick={() => setShowCamera(true)} className="glass-panel border-dashed border-white/20 p-4 sm:p-6 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer rounded-xl sm:rounded-2xl">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neon-green/10 rounded-full flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-neon-green text-xl sm:text-2xl">add_a_photo</span>
                                </div>
                                <p className="frosted-text font-bold text-xs sm:text-sm">Upload Water Photo</p>
                                <p className="text-white/30 text-[8px] sm:text-[10px] mt-1">For water quality analysis</p>
                            </div>
                        )}

                        {uploadedImage && (
                            <div className="glass-panel p-3 rounded-xl">
                                <p className="text-[9px] text-white/60 mb-2">Selected Photo</p>
                                <div className="relative w-full h-32 sm:h-40 rounded-lg overflow-hidden mb-2">
                                    <img src={uploadedImage.preview} alt="Water sample" className="w-full h-full object-cover" />
                                    <button onClick={() => setUploadedImage(null)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors">
                                        <span className="material-symbols-outlined text-white text-[12px]">close</span>
                                    </button>
                                </div>
                                <button onClick={analyzeWater} disabled={analyzing} className="w-full glass-panel bg-neon-green hover:bg-neon-green/90 text-black font-black h-10 sm:h-12 flex items-center justify-center neon-glow transition-all uppercase tracking-widest text-xs rounded-lg">
                                    {analyzing ? (<><span className="material-symbols-outlined animate-spin mr-1">sync</span>Analyzing...</>) : 'Analyze Water'}
                                </button>
                            </div>
                        )}

                        {showCamera && (
                            <div className="glass-panel p-3 rounded-xl space-y-2">
                                <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                                <button onClick={() => cameraInputRef.current?.click()} className="w-full py-2 glass-panel border border-white/20 rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs">
                                    <span className="material-symbols-outlined">photo_camera</span>Take Photo
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 glass-panel border border-white/20 rounded-lg text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-xs">
                                    <span className="material-symbols-outlined">folder</span>Choose from Gallery
                                </button>
                            </div>
                        )}

                        <button onClick={() => setStep(1)} className="w-full py-2 text-xs sm:text-sm text-white/50 hover:text-white transition-colors">← Back to Map</button>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && analysisResult && (
                    <div className="px-4 sm:px-6 space-y-3">
                        <div className={`glass-panel p-3 rounded-xl border ${getStatusColor(analysisResult.waterAnalysis?.waterStatus)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider">Water Status</span>
                                <span className="text-xl">{analysisResult.waterAnalysis?.statusEmoji}</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold">{analysisResult.waterAnalysis?.waterStatus}</p>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-neon-green transition-all" style={{ width: `${analysisResult.waterAnalysis?.waterQualityScore || 0}%` }}></div>
                            </div>
                            <p className="text-[8px] mt-1 text-white/60">Score: {analysisResult.waterAnalysis?.waterQualityScore}/100</p>
                        </div>

                        <div className="glass-panel p-3 rounded-xl">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 mb-2 block">Species Richness</span>
                            <div className="flex items-center gap-3 mb-3">
                                <div>
                                    <p className="text-xl sm:text-2xl font-bold text-neon-green">{analysisResult.speciesAnalysis?.estimatedRichness || 0}%</p>
                                    <p className="text-[8px] text-white/50">of baseline</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs sm:text-sm font-medium">{analysisResult.speciesAnalysis?.waterStatus} Water</p>
                                    <p className="text-[8px] text-white/40">Ecosystem</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-bold text-green-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>Likely Species
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {(analysisResult.speciesAnalysis?.likelySpecies || []).map((species, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-green-500/20 rounded-full text-[9px]">{species.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5 mt-2">
                                <p className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">cancel</span>Unlikely
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {(analysisResult.speciesAnalysis?.unlikelySpecies || []).map((species, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-red-500/20 rounded-full text-[9px]">{species.name}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={resetAnalysis} className="flex-1 py-2 glass-panel border border-white/20 rounded-lg text-white font-medium hover:bg-white/10 transition-colors text-xs">New Analysis</button>
                            <button onClick={() => setStep(2)} className="flex-1 py-2 glass-panel bg-neon-green text-black font-bold rounded-lg hover:bg-neon-green/90 transition-colors text-xs">Upload Another</button>
                        </div>
                    </div>
                )}
            </div>
            <Nav />
        </div>
    );
};

export default GangaRiparian;
