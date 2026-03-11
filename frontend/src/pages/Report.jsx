import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Nav from '../components/Nav';
import { useNavigate } from 'react-router-dom';
import { getUserLocation } from '../utils/location';

// --- CONFIGURATION ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// --- LEAFLET ICONS FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Neon Marker for User Location
const neonIcon = new L.DivIcon({
    className: 'custom-neon-marker',
    html: `<span class="material-symbols-outlined text-neon-green text-4xl drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]" style="font-size: 25px;">location_on</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

// Component to handle map center updates smoothly
const RecenterMap = ({ lat, lon }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lon], 16, { duration: 1.5 });
    }, [lat, lon, map]);
    return null;
};

// --- MAIN COMPONENT ---
const Report = () => {
    const navigate = useNavigate();

    // Form State
    const [obsType, setObsType] = useState('Species');
    const [threatDescription, setThreatDescription] = useState('');
    const [speciesName, setSpeciesName] = useState('');
    const [expertVerify, setExpertVerify] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

    // Map/Location State
    const [location, setLocation] = useState({ lat: 20.5937, lon: 78.9629 }); // Default India
    const [address, setAddress] = useState('Waiting for GPS...');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState(null);

    // File Upload State
    const [uploadedImages, setUploadedImages] = useState([]);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // --- 1. GEOLOCATION LOGIC ---
    const getLocation = async () => {
        setGpsLoading(true);
        setGpsError(null);
        setAddress("Triangulating signal...");

        try {
            // Call the external utility (Capacitor/Web logic)
            const coords = await getUserLocation();
            const { latitude, longitude } = coords;

            setLocation({ lat: latitude, lon: longitude });
            fetchAddress(latitude, longitude);

            return { latitude, longitude };
        } catch (error) {
            console.error("Location Error:", error);
            setGpsError("GPS Signal Lost");
            setAddress("Unable to retrieve location");
            throw error; // Propagate error for the onClick handler
        } finally {
            setGpsLoading(false);
        }
    };

    // --- 2. REVERSE GEOCODING (Nominatim) ---
    const fetchAddress = async (lat, lon) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'BioSentinel-App/1.0' } }
            );
            const data = await response.json();

            let displayAddress = "Uncharted Sector";
            if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.county;
                const state = data.address.state;
                displayAddress = `${city ? city + ', ' : ''}${state || ''}`;
            }
            setAddress(displayAddress);
        } catch {
            setAddress(`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`);
        } finally {
            setGpsLoading(false);
        }
    };

    // Initial GPS Lock
    useEffect(() => {
        getLocation();
    }, []);

    // --- 3. FILE HANDLING ---
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        newFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setUploadedImages(prev => [...prev, {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        data: event.target.result
                    }]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const removeImage = (id) => {
        setUploadedImages(prev => prev.filter(img => img.id !== id));
    };

    // --- 4. SUBMIT HANDLER ---
    const handleSubmit = async () => {
        if (!speciesName) {
            alert("Please identify the species or threat.");
            return;
        }

        setSubmitting(true);

        // Construct Payload
        const reportPayload = {
            type: obsType,
            species: speciesName,
            expertVerification: expertVerify,
            location: {
                latitude: location.lat,
                longitude: location.lon,
                address: address
            },
            images: uploadedImages.map(img => img.data), // Sending Base64 strings
            timestamp: new Date().toISOString()
        };

        console.log("Transmitting Report:", reportPayload);

        // Simulate Network Request (Replace with real axios.post later)
        setTimeout(() => {
            setSubmitting(false);
            setSubmitStatus('success');

            // Auto-redirect after success
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }, 2000);
    };

    return (
        <div className="text-white/90 font-sans min-h-screen bg-bg-dark selection:bg-neon-green/30">
            <div className="max-w-md mx-auto min-h-screen relative z-10 pb-32">

                {/* Header */}
                <div className="flex items-center pt-6 px-6 justify-between">
                    <div className="flex-1 flex flex-col items-center">
                        <h2 className="frosted-text text-lg font-bold tracking-tight">Bio Sentinel</h2>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">New Field Report</span>
                    </div>
                </div>

                {/* Form Container */}
                <div className="px-5 mt-6 space-y-6">

                    {/* 1. OBSERVATION TYPE */}
                    <section>
                        <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">Report Category</h3>
                        <div className="flex h-12 w-full items-center glass-panel p-1 gap-1 rounded-2xl bg-white/5 border border-white/10">
                            {['Species', 'Threat'].map((type) => (
                                <label key={type} className="flex-1 h-full cursor-pointer relative">
                                    <input
                                        type="radio"
                                        name="obs_type"
                                        value={type}
                                        checked={obsType === type}
                                        onChange={() => setObsType(type)}
                                        className="hidden"
                                    />
                                    <div className={`h-full flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${obsType === type
                                        ? `bg-white/10 ${type === 'Threat' ? 'text-hard-pink shadow-[0_0_10px_rgba(255,20,147,0.3)]' : 'text-neon-green shadow-[0_0_10px_rgba(57,255,20,0.3)]'} border border-white/10`
                                        : 'text-white/30 hover:text-white/60'
                                        }`}>
                                        {type === 'Threat' ? 'Ecological Threat' : 'Species Sighting'}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* 2. IDENTIFICATION INPUT */}
                    <section>
                        <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">Identification</h3>
                        <div className="relative">
                            <input
                                className="w-full h-14 pl-5 pr-12 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-green/50 focus:bg-white/10 text-white placeholder-white/20 text-sm font-medium outline-none transition-all"
                                placeholder={obsType === 'Threat' ? "Threat Type (e.g. Migration, Deforestation)" : "Species Name (e.g. Panthera tigris)"}
                                type="text"
                                value={speciesName}
                                onChange={(e) => setSpeciesName(e.target.value)}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
                                {obsType === 'Threat' ? 'warning' : 'search'}
                            </span>
                        </div>
                    </section>

                    {/* Threat Description */}
                    {obsType === 'Threat' && (
                        <section>
                            <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">Threat Description</h3>
                            <div className="relative">
                                <textarea
                                    className="
                                    w-full h-24 pt-4 pl-5 pr-12 
                                    rounded-2xl bg-white/5 border border-white/10 
                                    text-white placeholder-white/20 text-sm font-medium 
                                    outline-none transition-all duration-300 ease-in-out
                                    focus:placeholder-white/30
                                    resize-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                    placeholder={obsType === 'Threat' ? "Describe threat (e.g. Animals Migrating, Deforestation near your area)" : "Species Name (e.g. Panthera tigris)"}
                                    value={threatDescription}
                                    onChange={(e) => setThreatDescription(e.target.value)}
                                />
                            </div>
                        </section>
                    )}

                    {/* 3. LOCATION & MAP */}
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">Geolocation</h3>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${gpsLoading ? 'bg-yellow-400' : 'bg-neon-green'} animate-pulse`}></div>
                                <span className={`${gpsLoading ? 'text-yellow-400' : 'text-neon-green'} text-[9px] font-bold uppercase tracking-wider`}>
                                    {gpsLoading ? 'FETCHING...' : 'FETCHED'}
                                </span>
                            </div>
                        </div>

                        <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <MapContainer
                                center={[location.lat, location.lon]}
                                zoom={15}
                                zoomControl={false}
                                dragging={false}
                                style={{ height: "100%", width: "100%", background: "#050505" }}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <RecenterMap lat={location.lat} lon={location.lon} />
                                <Marker position={[location.lat, location.lon]} icon={neonIcon} />
                            </MapContainer>

                            {/* Address Overlay */}
                            <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center justify-between z-[400]">
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[10px] font-mono text-neon-green font-bold mb-0.5">
                                        {location.lat.toFixed(4)}° N, {location.lon.toFixed(4)}° E
                                    </span>
                                    <span className="text-[10px] text-white/70 truncate w-full">
                                        {gpsError || address}
                                    </span>
                                </div>
                                <button
                                    onClick={getLocation}
                                    disabled={gpsLoading}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-neon-green transition-all"
                                >
                                    <span className={`material-symbols-outlined text-lg ${gpsLoading ? 'animate-spin' : ''}`}>my_location</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 4. EVIDENCE UPLOAD */}
                    <section>
                        <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ml-1">Visual Evidence</h3>

                        {/* Hidden Inputs */}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

                        {uploadedImages.length === 0 ? (
                            <div className="grid grid-cols-1">
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="h-24 rounded-2xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 transition-all group"
                                >
                                    <span className="material-symbols-outlined text-2xl text-neon-green group-hover:scale-110 transition-transform">folder_open</span>
                                    <span className="text-[10px] font-bold text-white/60 uppercase">Gallery</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {/* Add More Button */}
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="min-w-[80px] h-20 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-white/40">add</span>
                                </button>

                                {/* Image Previews */}
                                {uploadedImages.map((img) => (
                                    <div key={img.id} className="relative min-w-[80px] h-20 rounded-xl overflow-hidden border border-white/20 group">
                                        <img src={img.data} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(img.id)}
                                            className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-red-500"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* 5. EXPERT VERIFY TOGGLE */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-white">Expert Verification</p>
                            <p className="text-[10px] text-white/40">Request specialist review</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={expertVerify} onChange={(e) => setExpertVerify(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green"></div>
                        </label>
                    </div>

                </div>

                {/* SUBMIT BUTTON */}
                <div className="my-10 mb-30 px-6 z-50 max-w-md mx-auto pointer-events-none">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || submitStatus === 'success'}
                        className={`hover:cursor-pointer w-full pointer-events-auto h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl transition-all active:scale-95 disabled:opacity-80 flex items-center justify-center gap-3 ${submitStatus === 'success'
                            ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                            : 'bg-neon-green text-black bg-white md:bg-white/50 hover:bg-white hover:text-black shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                Encrypting...
                            </>
                        ) : submitStatus === 'success' ? (
                            <>
                                <span className="material-symbols-outlined">check_circle</span>
                                Sent
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">send</span>
                                Submit Report
                            </>
                        )}
                    </button>
                </div>

                {/* Navbar */}
                <Nav />
            </div>
        </div>
    );
}

export default Report;