import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from 'axios';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Nav from '../components/Nav';

class MapRenderBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Map render failed' };
  }

  componentDidCatch(error) {
    console.error('Leaflet render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#060b18]">
          <div className="glass-panel max-w-md rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-bold text-red-200 mb-1">Map failed to load</p>
            <p className="text-xs text-red-100/80 mb-3">{this.state.message}</p>
            <p className="text-[11px] text-white/70">Refresh page once. If issue persists, disable Strict Mode for dev or clear browser cache.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const conservationDict = {
  EX: { label: 'Extinct', color: 'bg-black text-white border-white/30' },
  EW: { label: 'Extinct in Wild', color: 'bg-purple-900 text-white border-purple-500/50' },
  CR: { label: 'Critically Endangered', color: 'bg-red-600 text-white border-red-500/50' },
  EN: { label: 'Endangered', color: 'bg-red-500 text-white border-red-400/50' },
  VU: { label: 'Vulnerable', color: 'bg-orange-500 text-white border-orange-400/50' },
  NT: { label: 'Near Threatened', color: 'bg-yellow-500 text-black border-yellow-400/50' },
  LC: { label: 'Least Concern', color: 'bg-green-600 text-white border-green-400/50' },
  DD: { label: 'Data Deficient', color: 'bg-gray-500 text-white border-gray-400/50' },
  NE: { label: 'Not Evaluated', color: 'bg-slate-600 text-slate-300 border-slate-500/50' }
};

const TILE_PROVIDERS = [
  {
    key: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  {
    key: 'carto-light',
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  {
    key: 'esri',
    name: 'Esri WorldStreetMap',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
];

const getRiskColor = (status) => {
  const s = String(status || '').toUpperCase();
  if (s.includes('CR')) return '#ef4444';
  if (s.includes('EN')) return '#f97316';
  if (s.includes('VU')) return '#eab308';
  return '#39FF14';
};

const createNeonIcon = (statusCode) => {
  const color = getRiskColor(statusCode);
  return new L.DivIcon({
    className: 'custom-neon-marker',
    html: `<span class="material-symbols-outlined text-[24px]" style="color: ${color}; text-shadow: 0 0 12px ${color};">location_on</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20]
  });
};

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.8, easeLinearity: 0.25 });
    }
  }, [center, zoom, map]);
  return null;
};

const normalizeStatusCode = (value) => {
  const s = String(value || '').toUpperCase();
  if (s.includes('CR')) return 'CR';
  if (s.includes('EN')) return 'EN';
  if (s.includes('VU')) return 'VU';
  if (s.includes('NT')) return 'NT';
  if (s.includes('LC')) return 'LC';
  if (s.includes('DD')) return 'DD';
  return 'NE';
};

const MapPage = () => {
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ totalOccurrences: 0, displayedOccurrences: 0, uniqueSpecies: 0, threatenedCount: 0 });
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Search any species (e.g. tiger, sparrow, elephant)');
  const [center, setCenter] = useState([22.9734, 78.6569]);
  const [zoom, setZoom] = useState(5);
  const [tileProviderIndex, setTileProviderIndex] = useState(0);
  const [tileWarning, setTileWarning] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const lastTileSwitchRef = useRef(0);

  const activeTileProvider = TILE_PROVIDERS[tileProviderIndex] || TILE_PROVIDERS[0];

  const validRecords = useMemo(
    () => records.filter((item) => Number.isFinite(item?.decimalLatitude)
      && Number.isFinite(item?.decimalLongitude)
      && Math.abs(item.decimalLatitude) <= 90
      && Math.abs(item.decimalLongitude) <= 180),
    [records]
  );

  const stateStats = useMemo(() => {
    const stats = new Map();
    for (const item of records) {
      const state = item.stateProvince || 'Unknown';
      stats.set(state, (stats.get(state) || 0) + 1);
    }

    return [...stats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [records]);

  const hasResults = validRecords.length > 0;

  const filterRecordsForQuery = (items, rawQuery) => {
    const queryText = String(rawQuery || '').trim().toLowerCase();
    if (!queryText) return Array.isArray(items) ? items : [];

    const tokens = queryText.split(/\s+/).filter(Boolean);
    const wordRegexes = tokens.map((token) => new RegExp(`\\b${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`, 'i'));

    return (Array.isArray(items) ? items : []).filter((item) => {
      const searchable = [
        item?.scientificName,
        item?.commonName,
        item?.species,
        item?.vernacularName
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
        .trim();

      if (!searchable) return false;

      // For a short single-term query, enforce word-start match to avoid unrelated noise.
      if (tokens.length === 1) {
        return wordRegexes[0].test(searchable);
      }

      return tokens.every((token) => searchable.includes(token));
    });
  };

  const fetchFromGbifFallback = async (species, limit = 250) => {
    let taxonKey = null;
    const normalizedQuery = String(species || '').trim().toLowerCase();

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

    try {
      const match = await axios.get('https://api.gbif.org/v1/species/match', {
        params: { name: species, verbose: true },
        timeout: 10000
      });

      if (Number.isFinite(match?.data?.usageKey)) {
        taxonKey = Number(match.data.usageKey);
      }
    } catch {
      // Continue with text-query fallback.
    }

    if (!taxonKey) {
      try {
        const suggest = await axios.get('https://api.gbif.org/v1/species/suggest', {
          params: {
            q: species,
            limit: 20,
            datasetKey: 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
          },
          timeout: 10000
        });

        const suggestions = Array.isArray(suggest?.data) ? suggest.data : [];
        const preferred = suggestions.find((item) => {
          const rank = String(item?.rank || '').toUpperCase();
          const kingdom = String(item?.kingdom || '').toUpperCase();
          return Number.isFinite(item?.key)
            && (rank === 'SPECIES' || rank === 'SUBSPECIES')
            && (kingdom === 'ANIMALIA' || !kingdom)
            && matchesQuery(item);
        }) || suggestions.find((item) => Number.isFinite(item?.key));

        if (Number.isFinite(preferred?.key)) {
          taxonKey = Number(preferred.key);
        }
      } catch {
        // Keep query-based fallback.
      }
    }

    const params = {
      country: 'IN',
      hasCoordinate: true,
      hasGeospatialIssue: false,
      occurrenceStatus: 'PRESENT',
      limit
    };

    if (taxonKey) {
      params.taxonKey = taxonKey;
    } else {
      params.q = species;
      params.kingdomKey = 1;
    }

    const occ = await axios.get('https://api.gbif.org/v1/occurrence/search', {
      params,
      timeout: 30000
    });

    let filtered = (occ?.data?.results || [])
      .filter((item) => Number.isFinite(item?.decimalLatitude) && Number.isFinite(item?.decimalLongitude));

    if (taxonKey) {
      filtered = filtered.filter((item) => {
        const keys = [item?.taxonKey, item?.speciesKey, item?.acceptedTaxonKey];
        return keys.some((key) => Number(key) === taxonKey);
      });
    } else {
      filtered = filtered.filter(matchesQuery);
    }

    const nextRecords = filtered
      .map((item) => ({
        key: item.key,
        scientificName: item.scientificName || item.species || species,
        commonName: item.vernacularName || item.species || item.scientificName || species,
        iucnStatus: item.iucnRedListCategory || 'NE',
        decimalLatitude: item.decimalLatitude,
        decimalLongitude: item.decimalLongitude,
        eventDate: item.eventDate || null,
        stateProvince: item.stateProvince || null,
        country: item.country || 'India',
        media: item.media || []
      }));

    const uniqueSpecies = new Set(
      nextRecords
        .map((item) => item.scientificName)
        .filter((name) => typeof name === 'string' && name.trim())
    ).size;

    const threatenedCount = nextRecords.filter((item) => {
      const status = String(item.iucnStatus || '').toUpperCase();
      return status.includes('CR') || status.includes('EN') || status.includes('VU');
    }).length;

    const totalMatches = Number(occ?.data?.count) || nextRecords.length;

    return {
      records: nextRecords,
      summary: {
        totalOccurrences: totalMatches,
        displayedOccurrences: nextRecords.length,
        uniqueSpecies,
        threatenedCount
      }
    };
  };

  const handleSpeciesSearch = async () => {
    const species = query.trim();

    if (species.length < 2) {
      setStatusText('Enter at least 2 characters for species search');
      return;
    }

    setLoading(true);
    setSelectedSpecies(null);
    setStatusText('Scanning India biodiversity records...');

    try {
      const response = await axios.post(`${API_URL}/satellite/species/search-india`, {
        species,
        limit: 180
      });

      const payload = response?.data || {};
      let nextRecords = Array.isArray(payload.records) ? payload.records : [];
      let nextSummary = payload.summary || {
        totalOccurrences: nextRecords.length,
        displayedOccurrences: nextRecords.length,
        uniqueSpecies: 0,
        threatenedCount: 0
      };
      let usedFallback = false;

      if (!nextRecords.length) {
        const fallback = await fetchFromGbifFallback(species, 250);
        nextRecords = fallback.records;
        nextSummary = fallback.summary;
        usedFallback = true;
      }

      const strictlyFiltered = filterRecordsForQuery(nextRecords, species);
      const wasClientFiltered = strictlyFiltered.length !== nextRecords.length;
      nextRecords = strictlyFiltered;

      const strictUniqueSpecies = new Set(
        nextRecords
          .map((item) => item.scientificName)
          .filter((name) => typeof name === 'string' && name.trim())
      ).size;

      const strictThreatenedCount = nextRecords.filter((item) => {
        const status = String(item.iucnStatus || '').toUpperCase();
        return status.includes('CR') || status.includes('EN') || status.includes('VU');
      }).length;

      setRecords(nextRecords);
      setSummary({
        totalOccurrences: wasClientFiltered ? nextRecords.length : (nextSummary.totalOccurrences || nextRecords.length),
        displayedOccurrences: nextRecords.length,
        uniqueSpecies: strictUniqueSpecies,
        threatenedCount: strictThreatenedCount
      });

      if (nextRecords.length > 0) {
        const first = nextRecords[0];
        setCenter([first.decimalLatitude, first.decimalLongitude]);
        setZoom(6);
        setStatusText(
          usedFallback
            ? `Showing ${nextRecords.length} relevant India occurrences (GBIF fallback)`
            : `Showing ${nextRecords.length} relevant India occurrences for "${species}"`
        );
      } else {
        setCenter([22.9734, 78.6569]);
        setZoom(5);
        setStatusText(`No relevant India records found for "${species}"`);
      }
    } catch (error) {
      try {
        const fallback = await fetchFromGbifFallback(species, 250);
        const strictFallbackRecords = filterRecordsForQuery(fallback.records, species);

        const strictUniqueSpecies = new Set(
          strictFallbackRecords
            .map((item) => item.scientificName)
            .filter((name) => typeof name === 'string' && name.trim())
        ).size;

        const strictThreatenedCount = strictFallbackRecords.filter((item) => {
          const status = String(item.iucnStatus || '').toUpperCase();
          return status.includes('CR') || status.includes('EN') || status.includes('VU');
        }).length;

        setRecords(strictFallbackRecords);
        setSummary({
          totalOccurrences: strictFallbackRecords.length,
          displayedOccurrences: strictFallbackRecords.length,
          uniqueSpecies: strictUniqueSpecies,
          threatenedCount: strictThreatenedCount
        });

        if (strictFallbackRecords.length > 0) {
          const first = strictFallbackRecords[0];
          setCenter([first.decimalLatitude, first.decimalLongitude]);
          setZoom(6);
          setStatusText(`Backend unavailable. Showing ${strictFallbackRecords.length} relevant results from GBIF fallback.`);
        } else {
          setCenter([22.9734, 78.6569]);
          setZoom(5);
          setStatusText(`No relevant India records found for "${species}"`);
        }
      } catch {
        setRecords([]);
        setSummary({ totalOccurrences: 0, displayedOccurrences: 0, uniqueSpecies: 0, threatenedCount: 0 });
        setStatusText('Search failed. Please try another species name.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSpeciesSearch();
    }
  };

  const getStatusInfo = (code) => {
    return conservationDict[normalizeStatusCode(code)] || conservationDict.NE;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        setTileWarning('Map is taking longer to initialize. Please refresh once or check extensions/network filters.');
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [mapReady]);

  const handleTileError = () => {
    const now = Date.now();
    if (now - lastTileSwitchRef.current < 1200) {
      return;
    }

    lastTileSwitchRef.current = now;

    if (tileProviderIndex < TILE_PROVIDERS.length - 1) {
      const nextIndex = tileProviderIndex + 1;
      setTileProviderIndex(nextIndex);
      setTileWarning(`Primary map source failed. Switched to ${TILE_PROVIDERS[nextIndex].name}.`);
    } else {
      setTileWarning('Map tiles failed to load. Check internet or firewall settings.');
    }
  };

  const resetMapSources = () => {
    setTileProviderIndex(0);
    setTileWarning('');
    setMapReady(false);
  };

  return (
    <div className="font-sans bg-[#020915] text-slate-100 antialiased overflow-hidden h-screen w-full relative">
      <div className="absolute inset-0 z-0">
        <MapRenderBoundary>
          <MapContainer
            center={center}
            zoom={zoom}
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#050505' }}
            whenReady={() => {
              setMapReady(true);
            }}
          >
            <TileLayer
              key={activeTileProvider.key}
              url={activeTileProvider.url}
              attribution={activeTileProvider.attribution}
              eventHandlers={{
                tileerror: handleTileError
              }}
            />
            <MapController center={center} zoom={zoom} />

            {validRecords.map((item, idx) => (
              <Marker
                key={`${item.key || 'occ'}-${idx}`}
                position={[item.decimalLatitude, item.decimalLongitude]}
                icon={createNeonIcon(item.iucnStatus)}
                eventHandlers={{
                  click: () => {
                    setSelectedSpecies(item);
                    setCenter([item.decimalLatitude, item.decimalLongitude]);
                    setZoom(8);
                  }
                }}
              />
            ))}
          </MapContainer>
        </MapRenderBoundary>

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/60 pointer-events-none"></div>
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[min(900px,calc(100%-1rem))]">
        <div className="glass-panel border border-white/15 rounded-2xl p-3 md:p-4 backdrop-blur-md shadow-[0_12px_38px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="frosted-text text-2xl leading-none font-bold tracking-tight text-neon-green">Bio Sentinel</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">India Species Map</span>
            </div>
            <button
              onClick={resetMapSources}
              className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-white text-[11px] font-semibold hover:bg-white/15"
            >
              Reset Tiles
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 glass-panel h-12 rounded-xl flex items-center px-4 relative bg-black/30 border border-white/15">
              <span className="material-symbols-outlined text-primary mr-3 text-xl">pets</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-400 font-medium text-white focus:outline-none"
                placeholder="Search species: tiger, sparrow, elephant"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
              {loading && <div className="absolute right-4 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
            </div>
            <button
              onClick={handleSpeciesSearch}
              disabled={loading}
              className="h-12 px-4 md:px-5 rounded-xl bg-neon-green text-[#07130b] text-xs font-black uppercase tracking-wider hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Searching' : 'Search'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/10">{statusText}</span>
            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/10">Provider: {activeTileProvider.name}</span>
            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/10">Points: {validRecords.length}</span>
            <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white/60">Record count only (not population estimate)</span>
          </div>
        </div>
      </div>

      {tileWarning && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 z-30 w-[min(860px,calc(100%-1rem))] glass-panel border border-yellow-400/40 bg-yellow-500/10 rounded-xl px-3 py-2 text-[11px] text-yellow-200">
          {tileWarning}
        </div>
      )}

      <div className="absolute top-[182px] md:top-[138px] left-4 z-30 w-[calc(100%-2rem)] md:w-auto md:max-w-[420px] grid grid-cols-3 gap-2">
        <div className="bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-md">
            <p className="text-[10px] text-white/60">GBIF Records</p>
          <p className="text-base font-black text-neon-green leading-tight">{summary.totalOccurrences || 0}</p>
        </div>
        <div className="bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-md">
            <p className="text-[10px] text-white/60">Shown</p>
            <p className="text-base font-black text-cyan-300 leading-tight">{summary.displayedOccurrences || validRecords.length || 0}</p>
          </div>
          <div className="bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-md">
            <p className="text-[10px] text-white/60">Unique</p>
          <p className="text-base font-black text-cyan-300 leading-tight">{summary.uniqueSpecies || 0}</p>
        </div>
          <div className="bg-black/45 border border-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-md">
            <p className="text-[10px] text-white/60">Threat</p>
            <p className="text-base font-black text-red-300 leading-tight">{summary.threatenedCount || 0}</p>
          </div>
      </div>

      <div className="hidden lg:block absolute top-44 right-4 z-30 w-[280px] glass-panel rounded-2xl border border-white/10 p-3 backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-2">GBIF India Records</p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[9px] text-white/50">Records</p>
            <p className="text-sm font-black text-neon-green">{summary.totalOccurrences || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[9px] text-white/50">Unique</p>
            <p className="text-sm font-black text-cyan-300">{summary.uniqueSpecies || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-[9px] text-white/50">Threat</p>
            <p className="text-sm font-black text-red-300">{summary.threatenedCount || 0}</p>
          </div>
        </div>

        <p className="text-[10px] text-white/45 mb-2">These are observed records in GBIF, not actual local population.</p>

        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1">Top States</p>
        <div className="space-y-1">
          {stateStats.length > 0 ? (
            stateStats.map(([state, count]) => (
              <div key={state} className="flex items-center justify-between text-[11px] bg-white/5 rounded-lg px-2 py-1">
                <span className="truncate text-white/80">{state}</span>
                <span className="text-neon-green font-bold">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-white/40">No state data yet</p>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full z-30 px-4 pb-28">
        {selectedSpecies ? (
          <div className="glass-panel rounded-3xl overflow-hidden relative transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in max-w-[920px] mx-auto border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
            <button
              type="button"
              aria-label="Close details"
              onClick={() => setSelectedSpecies(null)}
              className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/45 border border-white/25 text-white/90 text-xl leading-none flex items-center justify-center hover:bg-black/65"
            >
              &times;
            </button>
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
                    <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-md uppercase tracking-wider ${getStatusInfo(selectedSpecies.iucnStatus).color}`}>
                      {getStatusInfo(selectedSpecies.iucnStatus).label}
                    </span>
                    <span className="text-white/30 text-[9px] font-mono">ID: {selectedSpecies.key}</span>
                  </div>

                  <h2 className="text-xl font-bold text-white leading-tight truncate italic font-serif">
                    {selectedSpecies.scientificName}
                  </h2>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wide mt-0.5">
                    {selectedSpecies.commonName || 'Unknown Common Name'}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-[10px] text-white/60">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      {selectedSpecies.eventDate ? new Date(selectedSpecies.eventDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">public</span>
                      {selectedSpecies.country || 'India'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">location_city</span>
                      {selectedSpecies.stateProvince || 'Unknown'}
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
          <div className="max-w-[520px] mx-auto rounded-2xl px-4 py-3 text-center border border-white/10 bg-black/45 backdrop-blur-md">
            <h3 className="text-white/90 font-bold text-xs uppercase tracking-[0.18em] mb-1">Species Search Ready</h3>
            <p className="text-white/60 text-xs">
              {hasResults
                ? 'Tap any marker to view species details and jump to detailed profile.'
                : 'Search species name to mark occurrences across India and view totals.'}
            </p>
          </div>
        )}
      </div>

      <Nav />
    </div>
  );
};

export default MapPage;
