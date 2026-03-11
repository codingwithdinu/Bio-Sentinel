import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import { getUserLocation } from '../utils/location';
import axios from 'axios';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Nav from '../components/Nav';

// --- CONFIGURATION ---

const conservationDict = {
  "EX": { label: "Extinct", color: "bg-black text-white border-white/30" },
  "EW": { label: "Extinct in Wild", color: "bg-purple-900 text-white border-purple-500/50" },
  "CR": { label: "Critically Endangered", color: "bg-red-600 text-white border-red-500/50" },
  "EN": { label: "Endangered", color: "bg-red-500 text-white border-red-400/50" },
  "VU": { label: "Vulnerable", color: "bg-orange-500 text-white border-orange-400/50" },
  "NT": { label: "Near Threatened", color: "bg-yellow-500 text-black border-yellow-400/50" },
  "LC": { label: "Least Concern", color: "bg-green-600 text-white border-green-400/50" },
  "DD": { label: "Data Deficient", color: "bg-gray-500 text-white border-gray-400/50" },
  "NE": { label: "Not Evaluated", color: "bg-slate-600 text-slate-300 border-slate-500/50" }
};

const createNeonIcon = (color = '#39FF14') => {
  return new L.DivIcon({
    className: 'custom-neon-marker',
    html: `<span class="material-symbols-outlined text-[30px]" style="color: ${color}; text-shadow: 0 0 15px ${color};">location_on</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const userIcon = new L.DivIcon({
    className: 'user-marker',
    html: `<div class="w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// Helper: Move Map Camera
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 2.0, easeLinearity: 0.2 });
    }, [center, zoom, map]);
    return null;
};

// --- MAIN COMPONENT ---
const Map = () => {
    // State
    const [query, setQuery] = useState('');
    const [center, setCenter] = useState([20.5937, 78.9629]); // Default: India
    const [zoom, setZoom] = useState(5);
    const [searchRadius, setSearchRadius] = useState(5000); // Default 5km
    const [speciesList, setSpeciesList] = useState([]);
    const [selectedSpecies, setSelectedSpecies] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanStatus, setScanStatus] = useState("Enter a location to scan (e.g. Amazon Rainforest, Delhi)");
    
    // Use ref to prevent initial useEffect loop
    const isFirstRun = useRef(true);

    // --- LOGIC ---

    // 1. Search Location
    const handleSearch = async (e) => {
        if (e.key === 'Enter' && query.length > 1) {
            setLoading(true);
            setScanStatus("TRIANGULATING TARGET...");
            setSelectedSpecies(null);
            
            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
                if (geoRes.data.length > 0) {
                    const { lat, lon } = geoRes.data[0];
                    const newCenter = [parseFloat(lat), parseFloat(lon)];
                    setCenter(newCenter);
                    setZoom(13);
                    fetchSpecies(parseFloat(lat), parseFloat(lon));
                } else {
                    setScanStatus("COORDINATES NOT FOUND");
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setScanStatus("CONNECTION ERROR");
                setLoading(false);
            }
        }
    };

    // 2. Fetch Species (Triggered by Search or Slider Change)
    const fetchSpecies = async (lat, lon) => {
        setScanStatus(`SCANNING ${searchRadius}M RADIUS...`);
        setLoading(true);
        
        // Convert radius (meters) to degrees approx (1 deg lat ~= 111km)
        const degreeDelta = searchRadius / 111000;

        try {
            const gbifUrl = `https://api.gbif.org/v1/occurrence/search`;
            const params = {
                decimalLatitude: `${lat - degreeDelta},${lat + degreeDelta}`,
                decimalLongitude: `${lon - degreeDelta},${lon + degreeDelta}`,
                taxonKey: '1', // Kingdom Animalia
                hasCoordinate: 'true',
                mediaType: 'StillImage', 
                limit: 50, 
            };
            
            const res = await axios.get(gbifUrl, { params });
            const results = res.data.results;
            
            setSpeciesList(results);
            
            if (results.length > 0) {
                setScanStatus(`${results.length} LIFEFORMS DETECTED`);
            } else {
                setScanStatus("SECTOR CLEAR (NO DATA)");
            }
        } catch (error) {
            setScanStatus("SENSOR MALFUNCTION");
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when radius changes (only if we have already searched/moved)
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        // Don't fetch if we are still at default zoom (viewing whole country)
        if (zoom > 10) {
            const timeoutId = setTimeout(() => {
                fetchSpecies(center[0], center[1]);
            }, 500); // Debounce slider inputs
            return () => clearTimeout(timeoutId);
        }
    }, [searchRadius]);

    const getStatusInfo = (code) => {
        return conservationDict[code] || conservationDict["NE"];
    };

    // --- RENDER ---
    return (
        <div className="font-sans bg-black text-slate-100 antialiased overflow-hidden h-screen w-full relative">
            
            {/* BACKGROUND MAP */}
            <div className="absolute inset-0 z-0">
                <MapContainer 
                    center={center} 
                    zoom={zoom} 
                    zoomControl={false} 
                    attributionControl={false}
                    style={{ height: "100%", width: "100%", background: "#050505" }}
                >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <MapController center={center} zoom={zoom} />

                    {/* Scanning Radius Visualizer */}
                    {zoom > 8 && (
                        <Circle 
                            center={center}
                            pathOptions={{ 
                                color: '#39FF14', 
                                fillColor: '#39FF14', 
                                fillOpacity: 0.05, 
                                weight: 1, 
                                dashArray: '5, 10' 
                            }}
                            radius={searchRadius} 
                        />
                    )}

                    {/* Markers */}
                    {speciesList.map((s) => {
                        const isRisk = ['CR', 'EN', 'VU'].includes(s.iucnRedListCategory);
                        return (
                            <Marker 
                                key={s.key}
                                position={[s.decimalLatitude, s.decimalLongitude]}
                                icon={createNeonIcon(isRisk ? '#FF007F' : '#39FF14')}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedSpecies(s);
                                        setCenter([s.decimalLatitude, s.decimalLongitude]);
                                    },
                                }}
                            />
                        );
                    })}
                    <Marker position={center} icon={userIcon} />
                </MapContainer>
                
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            {/* HEADER & SEARCH & SLIDER */}
            <div className="absolute top-0 left-0 w-full z-20 p-4 pt-10 flex flex-col gap-4">
                {/* Bio Sentinal Branding */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="frosted-text text-xl font-bold tracking-tight text-neon-green">Bio Sentinal</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Map Scanner</span>
                </div>
                {/* Search Bar */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 glass-panel h-12 rounded-2xl flex items-center px-4 relative transition-all duration-300 focus-within:bg-white/10">
                        <span className="material-symbols-outlined text-primary mr-3 text-xl">search</span>
                        <input 
                            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-500 font-medium text-white focus:outline-none uppercase tracking-wider" 
                            placeholder={scanStatus}
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        {loading && <div className="absolute right-4 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                </div>

                {/* Range Slider Glass Panel */}
                <div className="glass-panel p-3 rounded-2xl flex flex-col gap-2 w-2/3 max-w-sm mx-auto backdrop-blur-md border-white/5 animate-in slide-in-from-top-5">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Scan Radius</span>
                        <span className="text-[10px] font-mono text-white/80">
                            {searchRadius < 1000 ? `${searchRadius}m` : `${(searchRadius / 1000).toFixed(1)}km`}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="500" 
                        max="10000" 
                        step="500" 
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(Number(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-green-400"
                    />
                    <div className="flex justify-between text-[8px] text-white/30 px-1 font-mono">
                        <span>500m</span>
                        <span>10km</span>
                    </div>
                </div>
            </div>

            {/* RIGHT CONTROLS */}
            <div className="bg-black rounded-xl absolute top-48 right-4 z-20 flex flex-col gap-4">
                <div className="flex flex-col glass-capsule p-1.5 gap-1">
                    <button className="size-10 flex items-center justify-center text-slate-300 hover:text-white" onClick={() => setZoom(z => z + 1)}>
                        <span className="material-symbols-outlined">add</span>
                    </button>
                    <div className="h-[1px] w-6 mx-auto bg-white/10"></div>
                    <button className="size-10 flex items-center justify-center text-slate-300 hover:text-white" onClick={() => setZoom(z => z - 1)}>
                        <span className="material-symbols-outlined">remove</span>
                    </button>
                </div>
                <button 
                    className="size-12 glass-capsule flex items-center justify-center text-primary neon-glow-green border-primary/30 hover:bg-primary/20"
                   onClick={async () => {
                        try {
                            setScanStatus("LOCATING USER...");
                            const { latitude, longitude } = await getUserLocation();

                            setCenter([latitude, longitude]);
                            setZoom(14);
                            fetchSpecies(latitude, longitude);
                        } catch (err) {
                            console.error(err);
                            setScanStatus("LOCATION ACCESS DENIED");
                        }
                    }}
                >
                    <span className="material-symbols-outlined filled-icon">my_location</span>
                </button>
            </div>

            {/* DETAIL CARD */}
            <div className="absolute bottom-0 left-0 w-full z-30 px-4 pb-28">
                {selectedSpecies ? (
                    <div className="glass-panel rounded-[2rem] overflow-hidden relative transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                        <div className="h-1.5 w-10 bg-white/10 rounded-full mx-auto mt-3 mb-1"></div>
                        
                        <div className="p-5">
                            <div className="flex gap-4">
                                <div 
                                    className="w-24 h-24 rounded-2xl bg-cover bg-center border border-white/10 relative overflow-hidden shrink-0 shadow-lg" 
                                    style={{ backgroundImage: `url("${selectedSpecies.media?.[0]?.identifier || 'https://placehold.co/100x100/000/FFF?text=No+Img'}")` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-md uppercase tracking-wider ${getStatusInfo(selectedSpecies.iucnRedListCategory).color}`}>
                                            {getStatusInfo(selectedSpecies.iucnRedListCategory).label}
                                        </span>
                                        <span className="text-white/30 text-[9px] font-mono">ID: {selectedSpecies.key}</span>
                                    </div>

                                    <h2 className="text-xl font-bold text-white leading-tight truncate italic font-serif">
                                        {selectedSpecies.species || selectedSpecies.scientificName}
                                    </h2>
                                    <p className="text-white/50 text-xs font-bold uppercase tracking-wide mt-0.5">
                                        {selectedSpecies.vernacularName || selectedSpecies.family || "Unknown Common Name"}
                                    </p>
                                    
                                    <div className="mt-3 flex items-center gap-3 text-[10px] text-white/60">
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                            {selectedSpecies.eventDate ? new Date(selectedSpecies.eventDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">public</span>
                                            {selectedSpecies.country || "Unknown"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <Link to={`/species/${selectedSpecies.key}`} className="hover:cursor-pointer flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-all">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    Details
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel rounded-3xl p-6 text-center border-white/5 bg-white/[0.02]">
                        <span className="material-symbols-outlined text-white/20 text-4xl mb-3 animate-pulse">radar</span>
                        <h3 className="text-white/90 font-bold text-sm uppercase tracking-widest mb-1">Scanner Ready</h3>
                        <p className="text-white/40 text-xs">Adjust radius and search a location to begin bio-scan.</p>
                    </div>
                )}
            </div>
            
            <Nav />
        </div>
    );
};

export default Map;