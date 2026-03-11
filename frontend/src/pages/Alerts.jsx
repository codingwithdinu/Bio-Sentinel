import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Nav from '../components/Nav';
import { io } from 'socket.io-client';

// API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Initial mock data - shown immediately while API loads
const INITIAL_ALERTS = [
    {
        id: 'alert-001',
        type: 'DANGER',
        category: 'Pollution Event',
        level: 'CRITICAL',
        title: 'Industrial Discharge Detected',
        description: 'High levels of industrial pollutants detected in the river segment near Kanpur. Immediate action required.',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        location: 'Ganga River, Kanpur',
        lat: 26.4499,
        lon: 80.3319,
        confidence: 95,
        source: 'MOSDAC EOS-06 Satellite',
        urgency: 'IMMEDIATE',
        affectedSpecies: ['Gangetic Dolphin', 'Freshwater Turtles', 'Riverine Fish'],
        actions: ['Notify pollution control board', 'Deploy cleanup team', 'Alert downstream communities']
    },
    {
        id: 'alert-002',
        type: 'WARNING',
        category: 'Species Distress',
        level: 'HIGH',
        title: 'Gangetic Dolphin Distress Signal',
        description: 'Acoustic monitoring detected distress calls from dolphin pods in the Patna region.',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
        location: 'Ganga River, Patna',
        lat: 25.5941,
        lon: 85.1376,
        confidence: 88,
        source: 'Acoustic Monitoring Network',
        urgency: 'HIGH',
        affectedSpecies: ['Gangetic River Dolphin (Platanista gangetica)'],
        actions: ['Deploy rescue team', 'Water quality check', 'Veterinarian on standby']
    },
    {
        id: 'alert-003',
        type: 'INFO',
        category: 'Population Change',
        level: 'MODERATE',
        title: 'Tiger Sighting Increase',
        description: 'Unusual increase in tiger sightings near the river corridor. Population may be expanding.',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        location: 'Corbett to Pilibhit Corridor',
        lat: 29.1000,
        lon: 79.0500,
        confidence: 85,
        source: 'Camera Trap Network - GBIF Verified',
        urgency: 'LOW',
        affectedSpecies: ['Bengal Tiger'],
        actions: ['Update population estimates', 'Monitor movement patterns']
    },
    {
        id: 'alert-004',
        type: 'POSITIVE',
        category: 'Conservation Success',
        level: 'POSITIVE',
        title: 'Gharial Population Recovery',
        description: 'Significant increase in Gharial nesting sites detected along the Chambal tributary.',
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
        location: 'Chambal River, Morena',
        lat: 26.8400,
        lon: 77.8000,
        confidence: 92,
        source: 'Wildlife Survey Team',
        urgency: 'LOW',
        affectedSpecies: ['Gharial (Gavialis gangeticus)'],
        actions: ['Continue monitoring', 'Document nesting sites']
    },
    {
        id: 'alert-005',
        type: 'WARNING',
        category: 'Water Quality',
        level: 'WARNING',
        title: 'Elevated Chlorophyll Levels',
        description: 'Satellite data shows elevated chlorophyll-a concentrations indicating potential algal bloom.',
        timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
        location: 'Ganga River, Allahabad',
        lat: 25.4350,
        lon: 81.8460,
        confidence: 78,
        source: 'MOSDAC Ocean Color Sensor',
        urgency: 'MODERATE',
        affectedSpecies: ['Aquatic Plants', 'Fish', 'Dolphins'],
        actions: ['Water sampling', 'DO level monitoring', 'Public advisory']
    },
    {
        id: 'alert-006',
        type: 'DANGER',
        category: 'Flood Warning',
        level: 'HIGH',
        title: 'Monsoon Flood Risk',
        description: 'Met department warns of heavy rainfall upstream. Flood risk for riverine communities.',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        location: 'Upper Ganga Basin',
        lat: 30.5000,
        lon: 78.5000,
        confidence: 90,
        source: 'Indian Meteorological Department',
        urgency: 'HIGH',
        affectedSpecies: ['All Riverine Species', 'Migratory Birds'],
        actions: ['Flood alert to communities', 'Wildlife relocation preparation']
    }
];

const INITIAL_DANGER_ZONES = [
    {
        id: 'zone-001',
        name: 'Kanpur Industrial Zone',
        lat: 26.4499,
        lon: 80.3319,
        riskLevel: 'CRITICAL',
        type: 'Industrial Pollution',
        description: 'High concentration of tanneries and chemical industries',
        activeAlerts: 3
    },
    {
        id: 'zone-002',
        name: 'Allahabad Confluence',
        lat: 25.4350,
        lon: 81.8460,
        riskLevel: 'MODERATE',
        type: 'Religious Activity Impact',
        description: 'High Pilgrim activity during festivals',
        activeAlerts: 1
    },
    {
        id: 'zone-003',
        name: 'Patna Urban Section',
        lat: 25.5941,
        lon: 85.1376,
        riskLevel: 'HIGH',
        type: 'Urban Runoff',
        description: 'Sewage and urban runoff contamination',
        activeAlerts: 2
    }
];

const INITIAL_MOSDAC_DATA = {
    chlorophyll: { value: 5.2, riskLevel: 'WARNING' },
    sst: { value: 29.8, riskLevel: 'MODERATE' },
    turbidity: { value: 45, riskLevel: 'HIGH' },
    dissolvedOxygen: { value: 6.2, riskLevel: 'MODERATE' },
    overallRisk: 'MODERATE'
};

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different alert types
const createAlertIcon = (type, level) => {
    const colors = {
        'CRITICAL': '#ef4444',
        'DANGER': '#ef4444',
        'HIGH': '#f97316',
        'WARNING': '#eab308',
        'MODERATE': '#eab308',
        'INFO': '#3b82f6',
        'POSITIVE': '#22c55e',
        'LOW': '#22c55e'
    };
    
    const icons = {
        'CRITICAL': 'warning',
        'DANGER': 'warning',
        'HIGH': 'error',
        'WARNING': 'warning',
        'MODERATE': 'info',
        'INFO': 'info',
        'POSITIVE': 'eco',
        'LOW': 'eco'
    };
    
    const color = colors[level] || colors['INFO'];
    const icon = icons[level] || 'info';
    
    return L.divIcon({
        className: 'custom-alert-marker',
        html: `<div style="
            width: 36px;
            height: 36px;
            background: ${color};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 15px ${color}, 0 0 30px ${color}40;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <span class="material-symbols-outlined" style="color: white; font-size: 20px;">${icon}</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
};

const RecenterMap = ({ lat, lon, zoom = 8 }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lon) {
            map.flyTo([lat, lon], zoom, { duration: 1 });
        }
    }, [lat, lon, zoom, map]);
    return null;
};

// Ganga River coordinates for danger zone visualization
const GANGA_RIVER_COORDS = [
    [30.9784, 78.1378],   // Gangotri (Source)
    [30.0323, 78.2832],
    [29.9451, 78.6553],
    [29.5842, 79.2189],
    [28.9700, 79.4012],
    [28.6050, 79.8171],
    [28.1500, 80.2500],
    [27.5000, 80.7500],
    [26.7500, 81.5000],
    [26.2000, 82.0000],
    [25.7500, 82.3000],
    [25.4350, 82.8460],   // Varanasi
    [25.2800, 83.2000],
    [25.0500, 83.6500],
    [24.7500, 84.1500],
    [24.3000, 84.6500],
    [23.8500, 85.2500],
    [23.4000, 85.8000],
    [22.9500, 86.3500],
    [22.5000, 86.9000],
    [22.0000, 87.3000],
    [21.6418, 88.1251]    // Sundarbans (Delta)
];

const Alerts = () => {
    const [activeTab, setActiveTab] = useState('alerts');
    const [alerts, setAlerts] = useState(INITIAL_ALERTS);
    const [userReports, setUserReports] = useState([]);
    const [dangerZones, setDangerZones] = useState(INITIAL_DANGER_ZONES);
    const [mosdacData, setMosdacData] = useState(INITIAL_MOSDAC_DATA);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [mapCenter] = useState([25.435, 82.846]); // Varanasi
    const [pushEnabled, setPushEnabled] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [newAlertsCount, setNewAlertsCount] = useState(0);
    const [dataSource, setDataSource] = useState('mock');
    
    const socketRef = useRef(null);

    // Initialize WebSocket connection and fetch data
    useEffect(() => {
        // Connect to WebSocket
        const socket = io(API_URL.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionDelay: 1000,
        });
        
        socketRef.current = socket;
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            socket.emit('join-alerts');
        });
        
        socket.on('new-alert', (alert) => {
            console.log('New alert received:', alert);
            
            // Add new alert to the list
            setAlerts(prev => [alert, ...prev]);
            
            // Show push notification
            showPushNotification('New Alert!', `${alert.title} - ${alert.description.substring(0, 100)}...`);
            
            // Increment new alerts count
            setNewAlertsCount(prev => prev + 1);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });
        
        socket.on('connect_error', () => {
            console.log('WebSocket connection error - using mock data');
        });
        
        // Fetch real data from API
        fetchRealData();
        checkNotificationPermission();
        
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    // Fetch real data from API
    const fetchRealData = async () => {
        setLoading(true);
        
        // Fetch alerts
        try {
            const alertsResponse = await fetch(`${API_URL}/alerts`);
            if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                if (alertsData.length > 0) {
                    setAlerts(alertsData);
                    setDataSource('api');
                }
            }
        } catch (error) {
            console.log('Using mock alerts data (API not available)');
        }
        
        // Fetch danger zones
        try {
            const zonesResponse = await fetch(`${API_URL}/alerts/danger-zones`);
            if (zonesResponse.ok) {
                const zonesData = await zonesResponse.json();
                if (zonesData.length > 0) {
                    setDangerZones(zonesData);
                }
            }
        } catch (error) {
            console.log('Using mock danger zones data (API not available)');
        }
        
        // Fetch MOSDAC data
        try {
            const mosdacResponse = await fetch(`${API_URL}/alerts/mosdac`);
            if (mosdacResponse.ok) {
                const mosdacResult = await mosdacResponse.json();
                setMosdacData(mosdacResult);
            }
        } catch (error) {
            console.log('Using mock MOSDAC data (API not available)');
        }
        
        setLoading(false);
    };

    const checkNotificationPermission = () => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    };

    const showPushNotification = (title, body) => {
        if (notificationPermission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/BioSentinal.png',
                tag: 'alert-notification'
            });
        }
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                setPushEnabled(true);
                showPushNotification('BioSentinal Alerts', 'Push notifications enabled for biodiversity alerts!');
            }
        }
    };

    const handleUserReport = async (reportData) => {
        try {
            const response = await fetch(`${API_URL}/alerts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...reportData,
                    reportedBy: 'Anonymous User'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Add to local user reports
                const newReport = {
                    id: result.alert.id,
                    ...reportData,
                    timestamp: result.alert.createdAt,
                    status: 'SUBMITTED',
                    priority: reportData.severity === 'critical' ? 'HIGH' : 'MODERATE'
                };
                
                setUserReports(prev => [newReport, ...prev]);
                setShowReportModal(false);
                
                showPushNotification('Report Submitted', 'Your biodiversity report has been submitted successfully and broadcasted to all users.');
            } else {
                console.error('Failed to submit report:', result.error);
                alert('Failed to submit report: ' + result.error);
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Error submitting report. Please try again.');
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getLevelColor = (level) => {
        const colors = {
            'CRITICAL': 'bg-red-500/20 border-red-500 text-red-400',
            'DANGER': 'bg-red-500/20 border-red-500 text-red-400',
            'HIGH': 'bg-orange-500/20 border-orange-500 text-orange-400',
            'WARNING': 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
            'MODERATE': 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
            'INFO': 'bg-blue-500/20 border-blue-500 text-blue-400',
            'POSITIVE': 'bg-green-500/20 border-green-500 text-green-400',
            'LOW': 'bg-green-500/20 border-green-500 text-green-400'
        };
        return colors[level] || colors['INFO'];
    };

    const getLevelBadge = (level) => {
        const badges = {
            'CRITICAL': { bg: 'bg-red-500', text: 'CRITICAL' },
            'DANGER': { bg: 'bg-red-500', text: 'DANGER' },
            'HIGH': { bg: 'bg-orange-500', text: 'HIGH' },
            'WARNING': { bg: 'bg-yellow-500', text: 'WARNING' },
            'MODERATE': { bg: 'bg-yellow-500', text: 'MODERATE' },
            'INFO': { bg: 'bg-blue-500', text: 'INFO' },
            'POSITIVE': { bg: 'bg-green-500', text: 'POSITIVE' },
            'LOW': { bg: 'bg-green-500', text: 'LOW' }
        };
        return badges[level] || badges['INFO'];
    };

    const alertCounts = {
        critical: alerts.filter(a => a.level === 'CRITICAL' || a.level === 'DANGER').length,
        high: alerts.filter(a => a.level === 'HIGH').length,
        warning: alerts.filter(a => a.level === 'WARNING' || a.level === 'MODERATE').length,
        positive: alerts.filter(a => a.level === 'POSITIVE' || a.level === 'LOW').length
    };

    return (
        <div className="text-white/90 font-sans min-h-screen bg-bg-gradient-start selection:bg-neon-green/30 pb-28">
            <style>{`
                .custom-alert-marker { background: transparent !important; }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
                @keyframes ring {
                    0%, 100% { transform: rotate(0); }
                    10%, 30% { transform: rotate(15deg); }
                    20% { transform: rotate(-10deg); }
                    40% { transform: rotate(10deg); }
                }
                .ring-animation { animation: ring 0.5s ease-in-out; }
            `}</style>

            <div className="max-w-md mx-auto min-h-screen relative z-10">
                {/* Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="frosted-text text-lg font-bold tracking-tight">Bio Sentinal</h2>
                            <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Ganga Alert System</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {newAlertsCount > 0 && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full ring-animation">
                                    +{newAlertsCount} New
                                </span>
                            )}
                            <button 
                                onClick={notificationPermission === 'granted' ? null : requestNotificationPermission}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    pushEnabled 
                                        ? 'bg-neon-green/20 border border-neon-green/50 text-neon-green' 
                                        : 'bg-white/5 border border-white/20 text-white/50'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${pushEnabled ? 'bg-neon-green animate-pulse' : 'bg-white/30'}`}></span>
                                {pushEnabled ? 'Notifications On' : 'Enable Push'}
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-1 mb-4 overflow-x-auto tab-scrollbar">
                        {[
                            { key: 'alerts', label: 'Alerts', icon: 'notifications', count: alerts.length },
                            { key: 'danger', label: 'Danger Zones', icon: 'warning', count: dangerZones.length },
                            { key: 'reports', label: 'My Reports', icon: 'edit_note', count: userReports.length },
                            { key: 'mosdac', label: 'Satellite', icon: 'satellite', count: null }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    if (tab.key === 'alerts') setNewAlertsCount(0);
                                }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === tab.key 
                                        ? 'bg-neon-green/20 border border-neon-green/50 text-neon-green' 
                                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                                {tab.count !== null && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                        activeTab === tab.key ? 'bg-neon-green/30' : 'bg-white/10'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Quick Stats */}
                    {activeTab === 'alerts' && (
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 glass-panel p-3 rounded-xl text-center border-red-500/30">
                                <p className="text-lg font-bold text-red-400">{alertCounts.critical}</p>
                                <p className="text-[10px] text-white/50 uppercase">Critical</p>
                            </div>
                            <div className="flex-1 glass-panel p-3 rounded-xl text-center border-orange-500/30">
                                <p className="text-lg font-bold text-orange-400">{alertCounts.high}</p>
                                <p className="text-[10px] text-white/50 uppercase">High</p>
                            </div>
                            <div className="flex-1 glass-panel p-3 rounded-xl text-center border-yellow-500/30">
                                <p className="text-lg font-bold text-yellow-400">{alertCounts.warning}</p>
                                <p className="text-[10px] text-white/50 uppercase">Warning</p>
                            </div>
                            <div className="flex-1 glass-panel p-3 rounded-xl text-center border-green-500/30">
                                <p className="text-lg font-bold text-green-400">{alertCounts.positive}</p>
                                <p className="text-[10px] text-white/50 uppercase">Positive</p>
                            </div>
                        </div>
                    )}

                    {/* Map */}
                    <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-white/10 mb-4">
                        <MapContainer 
                            center={mapCenter}
                            zoom={7}
                            style={{ height: "100%", width: "100%" }}
                            attributionControl={false}
                        >
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            <RecenterMap lat={mapCenter[0]} lon={mapCenter[1]} />
                            
                            {/* Ganga River Line */}
                            <Marker position={[30.9784, 78.1378]} icon={L.divIcon({
                                className: 'hidden'
                            })} />
                            <Marker position={[21.6418, 88.1251]} icon={L.divIcon({
                                className: 'hidden'
                            })} />
                            
                            {/* Alert Markers */}
                            {activeTab === 'alerts' && alerts.map(alert => (
                                <Marker 
                                    key={alert.id}
                                    position={[alert.lat, alert.lon]}
                                    icon={createAlertIcon(alert.type, alert.level)}
                                    eventHandlers={{
                                        click: () => setSelectedAlert(alert)
                                    }}
                                >
                                    <Popup>
                                        <div className="text-black min-w-[180px]">
                                            <p className="font-bold text-sm">{alert.title}</p>
                                            <p className="text-xs text-gray-600">{alert.location}</p>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] mt-1 ${
                                                alert.level === 'CRITICAL' || alert.level === 'DANGER' ? 'bg-red-100' :
                                                alert.level === 'HIGH' ? 'bg-orange-100' :
                                                alert.level === 'WARNING' ? 'bg-yellow-100' :
                                                'bg-green-100'
                                            }`}>
                                                {alert.level}
                                            </span>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                            
                            {/* Danger Zone Markers */}
                            {activeTab === 'danger' && dangerZones.map(zone => (
                                <Marker 
                                    key={zone.id}
                                    position={[zone.lat, zone.lon]}
                                    icon={createAlertIcon('DANGER', zone.riskLevel)}
                                    eventHandlers={{
                                        click: () => setSelectedAlert(zone)
                                    }}
                                >
                                    <Popup>
                                        <div className="text-black min-w-[180px]">
                                            <p className="font-bold text-sm">{zone.name}</p>
                                            <p className="text-xs text-gray-600">{zone.type}</p>
                                            <p className="text-xs mt-1">{zone.description}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>

                        {/* Live Indicator */}
                        <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <span className={`w-2 h-2 rounded-full ${dataSource === 'api' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                            <span className="text-[10px] text-white/70">{dataSource === 'api' ? 'LIVE API' : 'MOCK DATA'}</span>
                        </div>

                        {/* Map Legend */}
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-[10px] space-y-1">
                            <p className="text-white/50 mb-1 font-bold">Legend</p>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-white/70">Critical/Danger</span></div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-white/70">High</span></div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span><span className="text-white/70">Warning</span></div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-white/70">Positive</span></div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="px-4 space-y-3">
                    {/* Alerts Tab */}
                    {activeTab === 'alerts' && (
                        <div className="space-y-3">
                            {loading && dataSource === 'mock' && (
                                <div className="flex items-center justify-center py-2 mb-2">
                                    <span className="material-symbols-outlined text-yellow-500 animate-spin text-sm mr-2">sync</span>
                                    <span className="text-xs text-yellow-500">Loading real-time data...</span>
                                </div>
                            )}
                            {alerts.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-white/30 text-4xl">notifications_none</span>
                                    <p className="text-white/50 text-sm mt-2">No alerts active</p>
                                </div>
                            ) : (
                                alerts.map(alert => (
                                    <AlertCard 
                                        key={alert.id} 
                                        alert={alert} 
                                        onClick={() => setSelectedAlert(alert)}
                                        getLevelColor={getLevelColor}
                                        getLevelBadge={getLevelBadge}
                                        formatTimestamp={formatTimestamp}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* Danger Zones Tab */}
                    {activeTab === 'danger' && (
                        <div className="space-y-3">
                            <div className="glass-panel p-4 rounded-xl border-red-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-red-400">warning</span>
                                    <h3 className="text-sm font-bold text-white">High Risk Areas</h3>
                                </div>
                                <p className="text-xs text-white/60">Areas requiring immediate attention and monitoring</p>
                            </div>
                            {dangerZones.map(zone => (
                                <div 
                                    key={zone.id}
                                    onClick={() => setSelectedAlert(zone)}
                                    className="glass-panel p-4 rounded-xl cursor-pointer hover:border-white/30 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold text-white">{zone.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelColor(zone.riskLevel)}`}>
                                            {zone.riskLevel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/60 mb-2">{zone.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-white/40">{zone.type}</span>
                                        <span className="text-[10px] text-white/40">{zone.lat?.toFixed(4)}, {zone.lon?.toFixed(4)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* User Reports Tab */}
                    {activeTab === 'reports' && (
                        <div className="space-y-3">
                            <button 
                                onClick={() => setShowReportModal(true)}
                                className="w-full glass-panel p-4 rounded-xl border-neon-green/30 hover:border-neon-green/50 transition-all"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-neon-green">add_circle</span>
                                    <span className="text-sm font-bold text-neon-green">Submit New Report</span>
                                </div>
                            </button>
                            
                            {userReports.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-out-full text-white/30 text-4xl">edit_note</span>
                                    <p className="text-white/50 text-sm mt-2">No reports submitted yet</p>
                                </div>
                            ) : (
                                userReports.map(report => (
                                    <div key={report.id} className="glass-panel p-4 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-white/40">{formatTimestamp(report.timestamp)}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelColor(report.priority)}`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-white">{report.title}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* MOSDAC Satellite Tab */}
                    {activeTab === 'mosdac' && (
                        <div className="space-y-3">
                            <div className="glass-panel p-4 rounded-xl border-blue-500/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-blue-400">satellite_alt</span>
                                    <h3 className="text-sm font-bold text-white">Ganga River Satellite Data</h3>
                                    <span className="text-[10px] text-white/50 ml-auto">EOS-06</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Chlorophyll-a', value: mosdacData?.chlorophyll?.value, unit: 'mg/m³', risk: mosdacData?.chlorophyll?.riskLevel },
                                    { label: 'Sea Surface Temp', value: mosdacData?.sst?.value, unit: '°C', risk: mosdacData?.sst?.riskLevel },
                                    { label: 'Turbidity', value: mosdacData?.turbidity?.value, unit: 'NTU', risk: mosdacData?.turbidity?.riskLevel },
                                    { label: 'Dissolved O₂', value: mosdacData?.dissolvedOxygen?.value, unit: 'mg/L', risk: mosdacData?.dissolvedOxygen?.riskLevel }
                                ].map((item, idx) => (
                                    <div key={idx} className="glass-panel p-3 rounded-xl">
                                        <p className="text-[10px] text-white/50 uppercase mb-1">{item.label}</p>
                                        <p className="text-lg font-bold text-neon-green">{item.value || '--'}</p>
                                        <p className="text-[10px] text-white/40">{item.unit}</p>
                                        {item.risk && (
                                            <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelColor(item.risk)}`}>
                                                {item.risk}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className={`p-4 rounded-xl border ${getLevelColor(mosdacData?.overallRisk || 'INFO')}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold">Overall Risk Level</span>
                                    <span className={`text-lg font-bold ${
                                        mosdacData?.overallRisk?.includes('CRITICAL') ? 'text-red-400' :
                                        mosdacData?.overallRisk?.includes('HIGH') ? 'text-orange-400' :
                                        mosdacData?.overallRisk?.includes('WARNING') ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {mosdacData?.overallRisk || '--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Submission Modal */}
            {showReportModal && (
                <ReportModal 
                    onClose={() => setShowReportModal(false)}
                    onSubmit={handleUserReport}
                    getLevelColor={getLevelColor}
                />
            )}

            {/* Alert Detail Modal */}
            {selectedAlert && (
                <AlertDetailModal 
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                    getLevelColor={getLevelColor}
                    getLevelBadge={getLevelBadge}
                    formatTimestamp={formatTimestamp}
                />
            )}

            <Nav />
        </div>
    );
};

// Alert Card Component
const AlertCard = ({ alert, onClick, getLevelColor, getLevelBadge, formatTimestamp }) => {
    const badge = getLevelBadge(alert.level);
    
    return (
        <div 
            onClick={onClick}
            className={`glass-panel p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-all border ${getLevelColor(alert.level)}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${badge.bg}`}>
                    <span className="material-symbols-outlined text-white text-sm">
                        {alert.type === 'DANGER' ? 'warning' : alert.type === 'WARNING' ? 'info' : 'eco'}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40 uppercase">{alert.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelColor(alert.level)}`}>
                            {alert.level}
                        </span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate">{alert.title}</h4>
                    <p className="text-xs text-white/60 line-clamp-2 mt-1">{alert.description}</p>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white/30 text-[12px]">location_on</span>
                            <span className="text-[10px] text-white/50 truncate max-w-[120px]">{alert.location}</span>
                        </div>
                        <span className="text-[10px] text-white/40">{formatTimestamp(alert.timestamp)}</span>
                    </div>
                    {alert.urgency && (
                        <div className="mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-white/30 text-[12px]">schedule</span>
                            <span className="text-[10px] text-white/50">Urgency: {alert.urgency}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Alert Detail Modal Component
const AlertDetailModal = ({ alert, onClose, getLevelColor, getLevelBadge, formatTimestamp }) => {
    const badge = getLevelBadge(alert.level);
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
            <div className="glass-panel bg-gray-900/95 border border-white/20 p-6 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${badge.bg}`}>
                            <span className="material-symbols-outlined text-white text-sm">
                                {alert.type === 'DANGER' ? 'warning' : alert.type === 'WARNING' ? 'info' : 'eco'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{alert.title}</h3>
                            <p className="text-xs text-white/50">{alert.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className={`p-3 rounded-xl mb-4 ${getLevelColor(alert.level)}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase">Severity Level</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${badge.bg} text-white`}>
                            {alert.level}
                        </span>
                    </div>
                </div>
                
                <div className="space-y-3 mb-4">
                    <p className="text-sm text-white/80">{alert.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/40 block mb-1">Location</span>
                            <span className="text-white">{alert.location}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/40 block mb-1">Coordinates</span>
                            <span className="text-white">{alert.lat?.toFixed(4)}, {alert.lon?.toFixed(4)}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/40 block mb-1">Timestamp</span>
                            <span className="text-white">{formatTimestamp(alert.timestamp)}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/40 block mb-1">Confidence</span>
                            <span className="text-white">{alert.confidence}%</span>
                        </div>
                    </div>
                </div>
                
                {alert.affectedSpecies && (
                    <div className="mb-4">
                        <h4 className="text-xs font-bold text-white/60 uppercase mb-2">Affected Species</h4>
                        <div className="flex flex-wrap gap-1">
                            {alert.affectedSpecies.map((species, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/70">
                                    {species}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {alert.actions && (
                    <div className="mb-4">
                        <h4 className="text-xs font-bold text-white/60 uppercase mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                            {alert.actions.map((action, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                                    <span className="material-symbols-outlined text-neon-green text-[14px] mt-0.5">arrow_right</span>
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="bg-white/5 rounded-lg p-3 mb-4">
                    <p className="text-[10px] text-white/40 uppercase mb-1">Data Source</p>
                    <p className="text-xs text-white/70">{alert.source}</p>
                </div>
                
                <button onClick={onClose} className="w-full py-3 glass-panel border border-white/20 rounded-xl text-white font-medium hover:bg-white/10 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

// Report Modal Component
const ReportModal = ({ onClose, onSubmit, getLevelColor }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'General',
        severity: 'moderate',
        location: '',
        lat: 0,
        lon: 0
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(formData);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
            <div className="glass-panel bg-gray-900/95 border border-white/20 p-6 rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Submit Biodiversity Report</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Report Title</label>
                        <input 
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-neon-green outline-none"
                            placeholder="Brief description of observation"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Category</label>
                        <select 
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-neon-green outline-none"
                        >
                            <option value="General">General Observation</option>
                            <option value="Species Sighting">Species Sighting</option>
                            <option value="Pollution Event">Pollution Event</option>
                            <option value="Illegal Activity">Illegal Activity</option>
                            <option value="Infrastructure">Infrastructure Issue</option>
                            <option value="Disease">Disease/Health Issue</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Severity</label>
                        <div className="flex gap-2">
                            {['low', 'moderate', 'high', 'critical'].map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData({...formData, severity: level})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                                        formData.severity === level ? getLevelColor(level.toUpperCase()) : 'bg-white/5 text-white/50'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Description</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-neon-green outline-none h-24 resize-none"
                            placeholder="Provide detailed information about your observation..."
                            required
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 glass-panel border border-white/20 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-neon-green/90 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Alerts;
