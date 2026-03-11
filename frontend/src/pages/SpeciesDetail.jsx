import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Navbar from '../components/Nav';

// --- ICON FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CONFIGURATION ---
const conservationDict = {
    "EX": { label: "Extinct", color: "bg-black text-white border-white/30", desc: "No known individuals remaining." },
    "EW": { label: "Extinct in Wild", color: "bg-purple-900 text-white border-purple-500/50", desc: "Known only to survive in captivity." },
    "CR": { label: "Critically Endangered", color: "bg-red-600 text-white border-red-500/50", desc: "Extremely high risk of extinction in the wild." },
    "EN": { label: "Endangered", color: "bg-red-500 text-white border-red-400/50", desc: "Very high risk of extinction in the wild." },
    "VU": { label: "Vulnerable", color: "bg-orange-500 text-white border-orange-400/50", desc: "High risk of extinction in the wild." },
    "NT": { label: "Near Threatened", color: "bg-yellow-500 text-black border-yellow-400/50", desc: "Likely to become endangered in the near future." },
    "LC": { label: "Least Concern", color: "bg-green-600 text-white border-green-400/50", desc: "Widespread and abundant." },
    "DD": { label: "Data Deficient", color: "bg-gray-500 text-white border-gray-400/50", desc: "Not enough data to make an assessment." },
    "NE": { label: "Not Evaluated", color: "bg-slate-600 text-slate-300 border-slate-500/50", desc: "This species has not yet been assessed." }
};

const SpeciesDetail = () => {
    const { id } = useParams();

    // State
    const [sighting, setSighting] = useState(null);
    const [speciesInfo, setSpeciesInfo] = useState(null);
    const [wikiData, setWikiData] = useState(null);
    const [indiaSightings, setIndiaSightings] = useState([]);
    const [aiData, setAiData] = useState(null);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('natural_history');

    useEffect(() => {
        const fetchDeepData = async () => {
            try {
                // A. Get Occurrence
                const occResponse = await axios.get(`https://api.gbif.org/v1/occurrence/${id}`);
                const occData = occResponse.data;
                setSighting(occData);

                // B. Get Species Profile
                if (occData.taxonKey) {
                    const speciesResponse = await axios.get(`https://api.gbif.org/v1/species/${occData.taxonKey}`);
                    setSpeciesInfo(speciesResponse.data);
                }

                // C. Get Wikipedia Data
                const cleanName = occData.scientificName.split('(')[0].replace(/[0-9]/g, '').trim();
                const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${cleanName}`;
                try {
                    const wikiRes = await axios.get(wikiUrl);
                    setWikiData(wikiRes.data);
                } catch (e) { console.log("Wiki data missing"); }

                // --- D. AI DATA (VIA BACKEND) ---
                try {
                    // Use API URL from .env or fallback to localhost
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    
                    const aiRes = await axios.post(`${apiUrl}/species`, {
                        speciesName: cleanName
                    });

                    setAiData(aiRes.data);

                } catch (e) {
                    console.error("AI Data fetch failed:", e);
                    // Fallback Data
                    setAiData({
                        favourable_climate: "Data currently unavailable via BioSentinel Uplink.",
                        dos_and_donts: ["Do not disturb"],
                        conservation_methods: ["Monitor local population"]
                    });
                }

            } catch (error) { console.error(error); }
            setLoading(false);
        };

        fetchDeepData();
    }, [id]);

    // 2. Fetch India Distribution (Dependent on sighting data)
    useEffect(() => {
        if (sighting && sighting.taxonKey) {
            const fetchIndiaData = async () => {
                try {
                    const res = await axios.get(`https://api.gbif.org/v1/occurrence/search`, {
                        params: {
                            taxonKey: sighting.taxonKey,
                            country: 'IN',
                            limit: 50,
                            hasCoordinate: 'true'
                        }
                    });
                    setIndiaSightings(res.data.results);
                } catch (e) { console.log("Could not fetch distribution"); }
            };
            fetchIndiaData();
        }
    }, [sighting]);

    if (loading) return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-primary-green text-5xl animate-spin">genetics</span>
                <span className="text-white/50 text-sm tracking-widest font-mono">FETCHING SPECIES DATA...</span>
            </div>
        </div>
    );

    if (!sighting) return <div className="min-h-screen bg-bg-dark flex items-center justify-center text-red-500 font-mono">DATA CORRUPTED: RECORD NOT FOUND.</div>;

    // --- DERIVED DATA ---
    const commonName = speciesInfo?.vernacularName || wikiData?.title || sighting.vernacularName || "Unknown Specimen";
    const statusKey = speciesInfo?.iucnRedListCategoryCode || sighting.iucnRedListCategory || "NE";
    const statusObj = conservationDict[statusKey] || conservationDict["NE"];
    const position = [sighting.decimalLatitude, sighting.decimalLongitude];

    // Construct object for Chat Interface context
    const speciesContextObj = {
        name: commonName,
        scientificName: sighting.scientificName,
        kingdom: sighting.kingdom,
        status: statusObj.label,
        description: wikiData?.extract || "No wiki data",
        ...aiData // Spread AI insights into context
    };

    return (
        <div className="min-h-screen pb-32 font-sans text-white/90 bg-bg-dark selection:bg-primary-green/30">
            <div className="max-w-7xl mx-auto px-4 mt-8">

                {/* HERO BANNER */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/10 glass-panel mb-8">
                    {/* Image Section */}
                    <div className="relative h-72 lg:h-auto bg-black">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                        <img
                            src={wikiData?.thumbnail?.source || sighting.media?.[0]?.identifier || "https://placehold.co/600x400/000/FFF?text=No+Signal"}
                            alt="Species"
                            className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute top-4 left-4 z-20">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${statusObj.color}`}>
                                {statusObj.label}
                            </span>
                        </div>
                    </div>

                    {/* Title Section */}
                    <div className="p-8 lg:p-12 flex flex-col justify-center bg-white/[0.02]">
                        <h1 className="text-3xl lg:text-5xl font-bold italic font-serif mb-2 text-white leading-tight">
                            {sighting.scientificName || sighting.species}
                        </h1>
                        <p className="text-xl text-white/50 font-light mb-6 capitalize">
                            {commonName}
                        </p>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <p className="text-sm text-white/70 italic leading-relaxed">
                                "{wikiData?.description || `A verified specimen of the ${sighting.family} family recorded in the global database.`}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex overflow-x-auto border-b border-white/10 mb-8 gap-8 no-scrollbar">
                    {['natural_history', 'global_range', 'conservation'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${activeTab === tab
                                ? 'border-b-2 border-primary-green text-primary-green drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]'
                                : 'text-white/30 hover:text-white border-b-2 border-transparent'
                                }`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* MAIN CONTENT (Left 2/3) */}
                    <div className="lg:col-span-2">

                        {/* TAB 1: NATURAL HISTORY */}
                        {activeTab === 'natural_history' && (
                            <div className="glass-panel p-8 bg-white/[0.02] border-white/10 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary-green">genetics</span>
                                        Biological Context
                                    </h3>
                                    <p className="text-sm leading-7 text-white/60 font-light">
                                        {wikiData?.extract || "No detailed encyclopedia entry available. This species is recorded in the GBIF backbone taxonomy."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                                        <h4 className="font-bold text-white/40 mb-4 text-[10px] uppercase tracking-widest">Taxonomic Hierarchy</h4>
                                        <ul className="space-y-2 text-xs font-mono">
                                            {['kingdom', 'phylum', 'class', 'order', 'family'].map((rank) => (
                                                <li key={rank} className="flex justify-between border-b border-white/5 pb-1 last:border-0">
                                                    <span className="text-white/30 capitalize">{rank}</span>
                                                    <span className="text-primary-green font-bold">{sighting[rank]}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-primary-green/5 p-5 rounded-2xl border border-primary-green/20">
                                        <h4 className="font-bold text-primary-green/60 mb-2 text-[10px] uppercase tracking-widest">Scientific Authority</h4>
                                        <p className="text-xs text-white/50 mb-2">First described by:</p>
                                        <p className="text-lg font-serif italic text-white">
                                            {speciesInfo?.authorship || sighting.scientificNameAuthorship || "Unknown Author"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: GLOBAL RANGE */}
                        {activeTab === 'global_range' && (
                            <div className="glass-panel p-4 bg-white/[0.02] border-white/10 h-[600px] flex flex-col animate-in fade-in slide-in-from-bottom-4">
                                <div className="mb-4 px-2">
                                    <h3 className="text-lg font-bold text-white">India Distribution</h3>
                                    <p className="text-xs text-white/50">
                                        Displaying <span className="text-primary-green font-bold">{indiaSightings.length}</span> confirmed geospatial points.
                                    </p>
                                </div>

                                <div className="flex-1 rounded-xl overflow-hidden border border-white/10 relative">
                                    <MapContainer center={[20.5937, 78.9629]} zoom={5} zoomControl={false} style={{ width: "100%", height: "100%", background: "#050505" }}>
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

                                        {indiaSightings.map((record, i) => (
                                            <CircleMarker
                                                key={record.key || i}
                                                center={[record.decimalLatitude, record.decimalLongitude]}
                                                pathOptions={{ color: '#39FF14', fillColor: '#39FF14', fillOpacity: 0.2, weight: 1 }}
                                                radius={3}
                                            >
                                                <Popup className="glass-popup">
                                                    <div className="text-black">
                                                        <strong>{record.stateProvince || "India"}</strong><br />
                                                        <span className="text-xs">{new Date(record.eventDate).toDateString()}</span>
                                                    </div>
                                                </Popup>
                                            </CircleMarker>
                                        ))}

                                        <Marker position={position}>
                                            <Popup>Current Specimen</Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: CONSERVATION */}
                        {activeTab === 'conservation' && (
                            <div className="glass-panel p-8 bg-white/[0.02] border-white/10 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className={`p-6 rounded-2xl border ${statusObj.color.replace('text-white', 'text-white/90')} relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
                                    <div className="relative flex items-center gap-5">
                                        <div className="text-3xl font-black border-4 border-white/20 w-20 h-20 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-md">
                                            {statusKey}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-widest">{statusObj.label}</h3>
                                            <p className="opacity-80 text-xs font-mono mt-1 max-w-md">{statusObj.desc}</p>
                                        </div>
                                    </div>
                                </div>
                                {aiData && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-white/5 pt-8">

                                        {/* Climate */}
                                        <div className="col-span-full bg-white/5 p-4 rounded-xl border border-white/10">
                                            <h4 className="text-primary-green font-bold text-xs uppercase tracking-widest mb-2">
                                                <span className="material-symbols-outlined align-middle mr-2 text-sm">thermostat</span>
                                                Favourable Environment
                                            </h4>
                                            <p className="text-white/80 text-sm leading-relaxed">{aiData.favourable_climate}</p>
                                        </div>

                                        {/* Do's and Don'ts */}
                                        <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20">
                                            <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3">Interaction Guidelines</h4>
                                            <ul className="space-y-2">
                                                {aiData.dos_and_donts?.map((item, i) => (
                                                    <li key={i} className="flex gap-2 text-xs text-emerald-100/80">
                                                        <span className="text-emerald-500">•</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Conservation Methods */}
                                        <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                                            <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">Conservation Strategy</h4>
                                            <ul className="space-y-2">
                                                {aiData.conservation_methods?.map((item, i) => (
                                                    <li key={i} className="flex gap-2 text-xs text-blue-100/80">
                                                        <span className="text-blue-500">•</span> {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                    </div>
                                )}

                                <div className="text-white/60 text-sm leading-relaxed border-t border-white/5 pt-6">
                                    <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary-green">policy</span>
                                        Assessment Details
                                    </h4>
                                    {statusKey === "NE" ? (
                                        <p className="bg-white/5 p-4 rounded-xl border border-white/10 italic">
                                            "Not Evaluated" status indicates a gap in global monitoring. This species requires immediate field study to determine population health.
                                        </p>
                                    ) : (
                                        <p>
                                            This species has been formally assessed by the IUCN Red List. Conservation efforts should prioritize habitat preservation and strictly monitoring population trends in key biodiversity areas.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* SIDEBAR (Right 1/3) */}
                    <div className="space-y-6">

                        {/* Location Context */}
                        <div className="glass-panel p-6 bg-white/2 border-white/10">
                            <h4 className="text-[10px] font-bold text-primary-green uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-green animate-pulse"></span>
                                Coordinates
                            </h4>
                            <div className="h-48 bg-black rounded-xl overflow-hidden mb-4 border border-white/10 relative grayscale hover:grayscale-0 transition-all duration-500">
                                <MapContainer center={position} zoom={18} zoomControl={false} dragging={false} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    <Marker position={position} />
                                </MapContainer>
                            </div>
                            <div className="space-y-3 text-xs font-mono text-white/60">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span>Lat</span>
                                    <span className="text-white">{sighting.decimalLatitude.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span>Lon</span>
                                    <span className="text-white">{sighting.decimalLongitude.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span>Region</span>
                                    <span className="text-white text-right w-1/2 truncate">
                                        {sighting.stateProvince}, {sighting.country}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Metadata Card */}
                        <div className="glass-panel p-6 bg-white/[0.02] border-white/10">
                            <h4 className="text-[10px] font-bold text-white/40 uppercase mb-4 tracking-[0.2em]">Record Metadata</h4>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-white/30 uppercase mb-1">Source Dataset</p>
                                    <p className="text-xs font-bold text-white leading-tight">
                                        {sighting.datasetName || "GBIF Backbone Taxonomy"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[9px] text-white/30 uppercase mb-1">Observed By</p>
                                    <p className="text-xs font-bold text-primary-green">
                                        {sighting.recordedBy || "Anonymous Sentinel"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[9px] text-white/30 uppercase mb-1">Timestamp</p>
                                    <p className="text-xs font-mono text-white">
                                        {sighting.eventDate ? new Date(sighting.eventDate).toLocaleString() : "UNKNOWN"}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* Pass the full context object to the Navbar so the Chat Interface can use it */}
            <Navbar species={speciesContextObj} />
        </div>
    );
};

export default SpeciesDetail;