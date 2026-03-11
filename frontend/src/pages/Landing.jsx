import '../css/landing.css'
import Nav from '../components/Nav'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Landing = () => {
  const { isLoggedIn } = useAuth();
  const checkStatus = isLoggedIn();

  return (
    <div className="overflow-x-hidden">
      <main className="px-4 pb-32">
        <section className="mt-4 relative group">
          <div className="glass-panel overflow-hidden min-h-125 relative flex flex-col justify-end p-8 border-white/10">
            <div className="absolute inset-0 z-[-1]">
              <img alt="Biodiversity" className="w-full h-full object-cover opacity-40 scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiJ46tjQUxFkYqQ-43q0mVTtUFATUlRUdzc3LiQuYMKzzKPC36XC8KOsLTm-4Xa41fUgcKR4PCRh_4O_LfJVt0xPVyIPUHDpNuebQujpBjUO0jaBiPnCql0xWgi3uKYmKZcHmUIxRxqPzQk_CIz_s2ph85bg6qTX3LeYkZvuKlYo-tsARCrNnXpLpGSDfvPU4Qf37qh5rR5jreIBswZlO7ik0dYMwCnaXeiPa4HQmDeWvVWHS5BAMGIe_NkuiWFI8HcxB7Ahg7xgeP" />
              <div className="absolute inset-0 bg-linear-to-t from-dark-start via-dark-start/60 to-transparent"></div>
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-pink/20 border border-accent-pink/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-green animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-pink">Bio Sentinel Live</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
                <span className="text-primary-green">Bio Sentinal</span> <br /> Detect, Protect & Preserve.
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xs">
                Government-grade AI monitoring for planetary biodiversity and ecological shifts.
              </p>

              {checkStatus ? (
                <div className="flex flex-col gap-3">
                  <Link to='/map' className="glass-button-primary h-14 w-full font-bold flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition-transform">
                    Explore Map <span className="material-symbols-outlined">explore</span>
                  </Link>
                  <Link to='/report' className="glass-button-secondary h-14 w-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                    Report Sighting <span className="material-symbols-outlined text-accent-pink">add_a_photo</span>
                  </Link>
                  <Link to='/dashboard' className="glass-button-dashboard h-14 w-full font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                    Go to Dashboard <span className="material-symbols-outlined">dashboard</span>
                  </Link>
                </div>
              ) : (
                <Link to='/login' className="glass-button-primary h-14 w-full font-bold flex items-center justify-center gap-2 text-lg active:scale-[0.98] transition-transform">
                  Get Started <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>
        </section >
        <section className="mt-10 px-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <span className="text-primary-green font-bold text-[10px] uppercase tracking-[0.2em]">Authority</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-4">The Authoritative Data Standard</h2>
          <p className="text-white/50 text-center text-sm leading-relaxed px-4">
            Bridging the gap between raw ecological data and actionable policy through high-fidelity modeling and GIS intelligence.
          </p>
        </section>
        <section className="mt-12 space-y-4">
          <h3 className="text-white font-bold px-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-green"></span>
            Framework
          </h3>
          <div className="glass-panel p-6 flex items-start gap-4 border-white/5">
            <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-primary-green/20 shrink-0">
              <span className="material-symbols-outlined text-primary-green">sensors</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-1">Detect</h4>
              <p className="text-white/40 text-xs">Real-time remote sensing and community-driven verification protocols.</p>
            </div>
          </div>
          <div className="glass-panel p-6 flex items-start gap-4 border-white/5">
            <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-accent-pink/20 shrink-0">
              <span className="material-symbols-outlined text-accent-pink">query_stats</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-1">Analyze</h4>
              <p className="text-white/40 text-xs">Proprietary AI engines processing petabytes of environmental imagery.</p>
            </div>
          </div>
          <div className="glass-panel p-6 flex items-start gap-4 border-white/5">
            <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-white/20 shrink-0">
              <span className="material-symbols-outlined text-white">nature_people</span>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg mb-1">Protect</h4>
              <p className="text-white/40 text-xs">Instant deployment of conservation assets and policy enforcement tools.</p>
            </div>
          </div>
        </section>
        <section className="mt-12">
          <div className="glass-panel h-56 relative overflow-hidden group border-white/10">
            <img alt="Map" className="w-full h-full object-cover brightness-50 contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAV-BI2pB7wLfDKJLLt9XG0SFWid2wg_0OQPAxbFDNXwooVcoG9uksVx7JzKTnGkk39lEU3AmQRF3bvwtIFr5W3lG-_PIJUjGKk3pbtZ7QyHcfUfQd8AXsN0mkz1aGbnbTfSn6r9cOK7SG2xpBIwbSaGRxtLt46ENYKDi19wlrEfpKvyPzEc2795d7tE6NIcbA7-CqeU-KhXHj0ve8MaCw297POuyvp6RgaEXBg7NilJFn-fExXqlph9ILzQylpfRJHLk2CsBeamjp" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-start/40">
              <div className="glass-panel p-4 flex flex-col items-center">
                <span className="material-symbols-outlined text-primary-green text-3xl mb-2">location_on</span>
                <span className="text-white font-bold">2,450 Monitoring Sites</span>
                <span className="text-white/40 text-[10px] uppercase tracking-tighter">Live Satellite Feed</span>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-12">
          <h3 className="text-white font-bold px-2 mb-6 text-xl">Operational Modules</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 border-white/5 flex flex-col gap-3">
              <span className="material-symbols-outlined text-primary-green text-2xl">science</span>
              <h5 className="text-white font-bold text-sm leading-tight">Research Core</h5>
              <p className="text-white/40 text-[10px]">Open data sets for global scientists.</p>
            </div>
            <div className="glass-panel p-5 border-white/5 flex flex-col gap-3">
              <span className="material-symbols-outlined text-accent-pink text-2xl">policy</span>
              <h5 className="text-white font-bold text-sm leading-tight">Gov Console</h5>
              <p className="text-white/40 text-[10px]">Legislative and regulatory oversight.</p>
            </div>
            <div className="glass-panel p-5 border-white/5 col-span-2 flex items-center gap-4">
              <span className="material-symbols-outlined text-white text-2xl">volunteer_activism</span>
              <div>
                <h5 className="text-white font-bold text-sm">Citizen Sentinel</h5>
                <p className="text-white/40 text-[10px]">Public contribution interface for field sightings.</p>
              </div>
            </div>
          </div>
        </section>
      </main >
      <Nav />
    </div >
  );
}

export default Landing
