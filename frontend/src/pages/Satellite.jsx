import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Nav from '../components/Nav';

// Risk color mapping
const RISK_COLORS = {
    RED: '#ef4444',       // Critically Endangered
    BLUE: '#3b82f6',      // Endangered
    YELLOW: '#eab308',    // Vulnerable
    GREEN: '#22c55e'     // Least Concern
};

const RISK_LABELS = {
    RED: 'Critically Endangered',
    BLUE: 'Endangered',
    YELLOW: 'Vulnerable',
    GREEN: 'Least Concern'
};

const GangaSatellite = () => {
    const [bufferRadius, setBufferRadius] = useState(25);
    const [showGangaLayer, setShowGangaLayer] = useState(true);
    const [majorSpeciesOnly, setMajorSpeciesOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [gangaBuffer, setGangaBuffer] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);

    // Map center on Ganga
    const mapCenter = [25.5, 83.0];
    const mapZoom = 7;

    // Fetch Ganga buffer zone
    const fetchGangaBuffer = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_GBIF_API_URL}/satellite/ganga/buffer?radius=${bufferRadius}`);
            if (response.ok) {
                const data = await response.json();
                setGangaBuffer(data.buffer);
            }
        } catch (error) {
            console.error('Error fetching Ganga buffer:', error);
        }
    };

    // Run Ganga buffer analysis
    const runAnalysis = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_GBIF_API_URL}/satellite/ganga/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    radius: bufferRadius,
                    majorSpeciesOnly
                })
            });

            if (response.ok) {
                const data = await response.json();
                setAnalysisData(data);
                setGangaBuffer(data.buffer?.geojson || null);
            }
        } catch (error) {
            console.error('Error running Ganga analysis:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchGangaBuffer();
        // Auto-run analysis on first load
        runAnalysis();
    }, [bufferRadius]);

    // GeoJSON layer for Ganga buffer
    const renderBufferLayer = () => {
        if (!gangaBuffer || !showGangaLayer) return null;

        return (
            <GeoJSON
                data={gangaBuffer}
                style={{
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    color: '#3b82f6',
                    weight: 2
                }}
            />
        );
    };

    // Render species markers
    const renderSpeciesMarkers = () => {
        if (!analysisData?.geojson?.features) return null;

        return analysisData.geojson.features.map((feature, index) => {
            const [lon, lat] = feature.geometry.coordinates;
            const { riskLevel, scientificName, commonName, individualCount } = feature.properties;

            return (
                <CircleMarker
                    key={feature.properties.id || index}
                    center={[lat, lon]}
                    radius={majorSpeciesOnly ? 12 : 8}
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
                        <div className="p-2">
                            <h4 className="font-bold text-sm">{commonName || scientificName}</h4>
                            <p className="text-xs text-gray-600">{scientificName}</p>
                            <div className="mt-1">
                                <span 
                                    className="inline-block px-2 py-0.5 text-xs rounded-full"
                                    style={{ 
                                        backgroundColor: RISK_COLORS[riskLevel] || RISK_COLORS.GREEN,
                                        color: riskLevel === 'YELLOW' ? '#000' : '#fff'
                                    }}
                                >
                                    {RISK_LABELS[riskLevel] || 'Unknown'}
                                </span>
                            </div>
                            {individualCount > 0 && (
                                <p className="text-xs text-gray-500 mt-1">Count: {individualCount}</p>
                            )}
                        </div>
                    </Popup>
                </CircleMarker>
            );
        });
    };

    // Get risk summary
    const getRiskSummary = () => {
        if (!analysisData?.species?.breakdown) return null;
        
        const { breakdown } = analysisData.species;

        return (
            <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="text-center p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <div className="text-xl font-bold text-red-400">{breakdown.red || 0}</div>
                    <div className="text-[10px] text-red-300">Critical</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <div className="text-xl font-bold text-blue-400">{breakdown.blue || 0}</div>
                    <div className="text-[10px] text-blue-300">Endangered</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                    <div className="text-xl font-bold text-yellow-400">{breakdown.yellow || 0}</div>
                    <div className="text-[10px] text-yellow-300">Vulnerable</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <div className="text-xl font-bold text-green-400">{breakdown.green || 0}</div>
                    <div className="text-[10px] text-green-300">Stable</div>
                </div>
            </div>
        );
    };

    return (
        <div className="text-white/90 font-sans min-h-screen bg-bg-gradient-start">
            <div className="max-w-md mx-auto min-h-screen relative z-10 pb-32">
                
                {/* Header */}
                <div className="flex items-center p-6 justify-between">
                    <div className="flex-1 flex flex-col items-center">
                        <h2 className="frosted-text text-lg font-bold tracking-tight">Bio Sentinal</h2>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Ganga Buffer Zone</span>
                    </div>
                </div>

                {/* Map */}
                <section className="px-5 mb-4">
                    <div className="relative w-full h-80 rounded-3xl overflow-hidden border border-white/10 glass-panel">
                        <MapContainer
                            center={mapCenter}
                            zoom={mapZoom}
                            style={{ height: "100%", width: "100%" }}
                            zoomControl={true}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            {renderBufferLayer()}
                            {renderSpeciesMarkers()}
                        </MapContainer>
                        
                        {/* Map Legend */}
                        <div className="absolute bottom-3 left-3 bg-black/90 backdrop-blur-md p-3 rounded-xl z-[400] border border-white/20 shadow-lg">
                            <p className="text-xs font-bold text-white/90 mb-2 uppercase tracking-wider">Risk Level</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                    <span className="text-xs text-white/80 font-medium">Critical (CR)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                    <span className="text-xs text-white/80 font-medium">Endangered (EN)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
                                    <span className="text-xs text-white/80 font-medium">Vulnerable (VU)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                    <span className="text-xs text-white/80 font-medium">Stable (LC)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Buffer Radius Selector */}
                <section className="px-5 mb-4">
                    <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">
                        Buffer Radius
                    </h3>
                    <div className="flex gap-2">
                        {[5, 10, 25, 50].map((radius) => (
                            <button
                                key={radius}
                                onClick={() => setBufferRadius(radius)}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                                    bufferRadius === radius
                                        ? 'bg-neon-green text-black'
                                        : 'glass-panel text-white/70 hover:bg-white/10'
                                }`}
                            >
                                {radius} km
                            </button>
                        ))}
                    </div>
                </section>

                {/* Analysis Options */}
                <section className="px-5 mb-4">
                    <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">
                        Analysis Options
                    </h3>
                    <div className="space-y-2">
                        <label className="glass-panel p-4 rounded-2xl flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-neon-green">visibility</span>
                                <div>
                                    <span className="text-sm font-bold">Show Buffer Zone</span>
                                    <p className="text-[10px] text-white/40">Display Ganga buffer area</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={showGangaLayer}
                                onChange={(e) => setShowGangaLayer(e.target.checked)}
                                className="w-5 h-5 accent-neon-green"
                            />
                        </label>

                        <label className="glass-panel p-4 rounded-2xl flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-yellow-400">star</span>
                                <div>
                                    <span className="text-sm font-bold">Major Species Only</span>
                                    <p className="text-[10px] text-white/40">Dolphin, Gharial, Tiger, etc.</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={majorSpeciesOnly}
                                onChange={(e) => setMajorSpeciesOnly(e.target.checked)}
                                className="w-5 h-5 accent-neon-green"
                            />
                        </label>
                    </div>
                </section>

                {/* Run Analysis Button */}
                <section className="px-5 mb-4">
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="w-full glass-panel bg-neon-green hover:bg-neon-green/90 text-black font-black h-14 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-sm rounded-2xl shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                ANALYZING...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">science</span>
                                Analyze Biodiversity
                            </>
                        )}
                    </button>
                </section>

                {/* Analysis Results */}
                {analysisData && (
                    <section className="px-5 mb-4">
                        <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">
                            Biodiversity Analysis
                        </h3>
                        
                        {/* Summary */}
                        <div className="glass-panel p-4 rounded-2xl mb-3 border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold">Species Found</span>
                                <span className="text-2xl font-black text-neon-green">
                                    {analysisData.species?.total || 0}
                                </span>
                            </div>
                            
                            {/* Buffer Info */}
                            <div className="text-xs text-white/50 mb-3">
                                <p>Buffer Radius: {analysisData.buffer?.radiusKm || bufferRadius} km</p>
                                <p>Area: {(analysisData.buffer?.areaKm2 || 0).toFixed(0)} km²</p>
                            </div>
                            
                            {/* Risk Breakdown */}
                            {getRiskSummary()}
                        </div>

                        {/* Selected Marker Details */}
                        {selectedMarker && (
                            <div className="glass-panel p-4 rounded-2xl mb-3 border-neon-green/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-sm">Species Details</h4>
                                    <button 
                                        onClick={() => setSelectedMarker(null)}
                                        className="text-white/50 hover:text-white"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-neon-green">{selectedMarker.commonName}</p>
                                    <p className="text-xs text-white/60 italic">{selectedMarker.scientificName}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span 
                                            className="px-2 py-0.5 text-xs rounded-full"
                                            style={{ 
                                                backgroundColor: RISK_COLORS[selectedMarker.riskLevel],
                                                color: selectedMarker.riskLevel === 'YELLOW' ? '#000' : '#fff'
                                            }}
                                        >
                                            {RISK_LABELS[selectedMarker.riskLevel]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Info Disclaimer */}
                <section className="px-5">
                    <div className="p-4 glass-panel border-blue-500/20 bg-blue-500/5 rounded-2xl">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-blue-400 text-[20px]">info</span>
                            <p className="text-[10px] text-white/50 leading-relaxed">
                                Ganga Buffer Zone analysis filters GBIF species data within the selected radius 
                                from the river centerline. Risk classification based on IUCN Red List status.
                                <br/><br/>
                                🔴 <strong>Critical</strong> - Critically Endangered
                                🔵 <strong>Endangered</strong> - Endangered species
                                🟡 <strong>Vulnerable</strong> - At-risk species
                                🟢 <strong>Stable</strong> - Least concern
                            </p>
                        </div>
                    </div>
                </section>

            </div>
            <Nav />
        </div>
    );
};

export default GangaSatellite;
