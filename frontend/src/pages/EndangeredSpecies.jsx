import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const STATUS_META = {
  CR: { label: 'Critically Endangered', badge: 'bg-red-600 text-white border-red-400/40' },
  EN: { label: 'Endangered', badge: 'bg-orange-500 text-white border-orange-400/40' },
  VU: { label: 'Vulnerable', badge: 'bg-yellow-500 text-black border-yellow-300/50' },
  NT: { label: 'Near Threatened', badge: 'bg-lime-500 text-black border-lime-300/50' },
  LC: { label: 'Least Concern', badge: 'bg-green-600 text-white border-green-400/40' },
  DD: { label: 'Data Deficient', badge: 'bg-slate-500 text-white border-slate-300/40' },
  NE: { label: 'Not Evaluated', badge: 'bg-slate-700 text-white border-slate-400/40' }
};

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All Endangered' },
  { key: 'Mammals', label: 'Mammals' },
  { key: 'Birds', label: 'Birds' },
  { key: 'Reptiles', label: 'Reptiles' }
];

const EndangeredSpecies = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');
  const [wikiEnrichedCount, setWikiEnrichedCount] = useState(0);
  const [wikiOnlyCount, setWikiOnlyCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorText('');

      try {
        const response = await axios.get(`${API_URL}/satellite/species/endangered`, {
          params: { statuses: 'CR,EN,VU', limit: 180, includeWiki: true, wikiLimit: 180, includeWikiCatalog: true },
          timeout: 45000
        });

        const payload = response?.data || {};
        setRecords(Array.isArray(payload.records) ? payload.records : []);
        setUpdatedAt(payload.generatedAt || new Date().toISOString());
        setWikiEnrichedCount(Number(payload?.summary?.wikiEnriched || 0));
        setWikiOnlyCount(Number(payload?.summary?.wikiOnly || 0));
      } catch (err) {
        try {
          const fallback = await axios.get(`${API_URL}/satellite/species/endangered`, {
            params: { statuses: 'CR,EN,VU', limit: 120, includeWiki: true, wikiLimit: 120, includeWikiCatalog: false },
            timeout: 25000
          });

          const payload = fallback?.data || {};
          setRecords(Array.isArray(payload.records) ? payload.records : []);
          setUpdatedAt(payload.generatedAt || new Date().toISOString());
          setWikiEnrichedCount(Number(payload?.summary?.wikiEnriched || 0));
          setWikiOnlyCount(Number(payload?.summary?.wikiOnly || 0));
          setErrorText('Showing fallback result (Wikipedia catalog was slow).');
        } catch {
          setRecords([]);
          setWikiEnrichedCount(0);
          setWikiOnlyCount(0);
          setErrorText('Unable to load endangered records right now. Please retry.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    const q = String(searchText || '').trim().toLowerCase();
    return records.filter((item) => {
      const statusCode = String(item?.iucnStatus || '').toUpperCase();
      const statusOk = statusFilter === 'ALL' || statusCode === statusFilter;
      if (!statusOk) return false;

      const category = String(item?.category || 'Other Animals');
      const categoryOk = activeCategoryTab === 'ALL' || category === activeCategoryTab;
      if (!categoryOk) return false;

      if (!q) return true;

      const pool = [
        item?.scientificName,
        item?.commonName,
        item?.category,
        item?.className,
        item?.stateProvince,
        item?.family,
        item?.genus
      ].map((v) => String(v || '').toLowerCase()).join(' ');

      return pool.includes(q);
    });
  }, [records, searchText, statusFilter, activeCategoryTab]);

  const byStatus = useMemo(() => {
    return filteredRecords.reduce((acc, item) => {
      const status = String(item?.iucnStatus || 'NE').toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredRecords]);

  const byCategory = useMemo(() => {
    return filteredRecords.reduce((acc, item) => {
      const category = String(item?.category || 'Other Animals');
      acc[category] = acc[category] || [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [filteredRecords]);

  const sortedCategoryEntries = useMemo(() => {
    return Object.entries(byCategory).sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return a[0].localeCompare(b[0]);
    });
  }, [byCategory]);

  return (
    <div className="min-h-screen bg-[#050b16] text-white pb-28">
      <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 md:p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-bold mb-1">Judges View</p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Endangered Species Watchlist</h1>
              <p className="text-xs md:text-sm text-white/60 mt-1">Scientific name, local/common name, image, status and details from live GBIF records in India.</p>
            </div>
            <div className="text-[11px] text-white/65 rounded-xl px-3 py-2 bg-white/5 border border-white/10">
              Last Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : 'Loading...'}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => {
              const active = activeCategoryTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCategoryTab(tab.key)}
                  className={`h-9 rounded-lg px-3 text-xs md:text-sm font-bold tracking-wide border transition ${active ? 'bg-white text-black border-white' : 'bg-black/35 text-white border-white/20 hover:bg-white/10'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by scientific name, local/common name, genus, family, state"
              className="h-11 rounded-xl bg-black/35 border border-white/15 px-4 text-sm text-white placeholder:text-white/35 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl bg-black/35 border border-white/15 px-3 text-sm text-white outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="CR">CR</option>
              <option value="EN">EN</option>
              <option value="VU">VU</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">Visible Cards: {filteredRecords.length}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">Tab: {CATEGORY_TABS.find((tab) => tab.key === activeCategoryTab)?.label || 'All Endangered'}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">CR: {byStatus.CR || 0}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">EN: {byStatus.EN || 0}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">VU: {byStatus.VU || 0}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">Wiki Enriched: {wikiEnrichedCount}</span>
            <span className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">Wiki Added: {wikiOnlyCount}</span>
            {sortedCategoryEntries.map(([category, items]) => (
              <span key={category} className="px-3 py-1 rounded-lg border border-white/10 bg-white/5">{category}: {items.length}</span>
            ))}
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">Loading endangered species records...</div>
        )}

        {!loading && errorText && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">{errorText}</div>
        )}

        {!loading && !errorText && filteredRecords.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">No species found for current filters.</div>
        )}

        {!loading && !errorText && filteredRecords.length > 0 && (
          <div className="space-y-5 pb-4">
            {sortedCategoryEntries.map(([category, items]) => (
              <section key={category} className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                  <h2 className="text-sm md:text-base font-extrabold tracking-wide uppercase">{category}</h2>
                  <span className="text-xs text-white/60">{items.length} species</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((item, idx) => {
              const statusCode = String(item?.iucnStatus || 'NE').toUpperCase();
              const meta = STATUS_META[statusCode] || STATUS_META.NE;
              const image = item?.imageUrl || item?.wikiThumbnail || item?.media?.[0]?.identifier || 'https://placehold.co/600x360/111827/FFFFFF?text=No+Image';

              return (
                <article key={`${item.key || item.speciesKey || 'sp'}-${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden backdrop-blur-md">
                  <div className="h-40 w-full bg-black/50">
                    <img src={image} alt={item?.scientificName || 'Species'} className="h-full w-full object-cover" />
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-md border text-[10px] font-extrabold uppercase tracking-wider ${meta.badge}`}>{statusCode}</span>
                      <span className="text-[10px] text-white/55">{meta.label}</span>
                    </div>

                    <h3 className="text-lg font-bold italic leading-tight">{item?.scientificName || 'Unknown'}</h3>
                    <p className="text-sm text-white/70 uppercase tracking-wide mt-1">{item?.commonName || 'Unknown Local/Common Name'}</p>

                    <div className="mt-2 space-y-1 text-xs text-white/75">
                      <p>
                        <span className="text-white/45">Local Name:</span>{' '}
                        {item?.localName || item?.commonName || 'N/A'}
                      </p>
                      <p>
                        <span className="text-white/45">Hindi Name:</span>{' '}
                        {item?.hindiName || 'N/A'}
                      </p>
                    </div>

                    {(item?.wikiSummary || item?.about) && (
                      <p className="mt-2 text-xs leading-5 text-white/65 line-clamp-4">
                        {item?.wikiSummary || item?.about}
                      </p>
                    )}

                    {item?.wikiSummary && (
                      <p className="mt-1 text-[11px] text-cyan-300/80 uppercase tracking-wide font-semibold">
                        Wikipedia Summary Added
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-white/70">
                      <p><span className="text-white/40">Category:</span> {item?.category || 'Other Animals'}</p>
                      <p><span className="text-white/40">Class:</span> {item?.className || 'N/A'}</p>
                      <p><span className="text-white/40">Family:</span> {item?.family || 'N/A'}</p>
                      <p><span className="text-white/40">Genus:</span> {item?.genus || 'N/A'}</p>
                      <p><span className="text-white/40">State:</span> {item?.stateProvince || 'Unknown'}</p>
                      <p><span className="text-white/40">Date:</span> {item?.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'N/A'}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/30 border border-white/10 px-2 py-1">
                        <p className="text-white/40">Latitude</p>
                        <p className="font-semibold">{Number(item?.decimalLatitude || 0).toFixed(4)}</p>
                      </div>
                      <div className="rounded-lg bg-black/30 border border-white/10 px-2 py-1">
                        <p className="text-white/40">Longitude</p>
                        <p className="font-semibold">{Number(item?.decimalLongitude || 0).toFixed(4)}</p>
                      </div>
                    </div>

                    <Link
                      to={`/species/${item.key}`}
                      className="mt-4 inline-flex w-full items-center justify-center h-10 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-bold uppercase tracking-wider"
                    >
                      Full Details
                    </Link>
                  </div>
                </article>
              );
            })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Nav />
    </div>
  );
};

export default EndangeredSpecies;
