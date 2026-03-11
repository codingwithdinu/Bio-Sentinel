import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatInterface from './ChatInterface';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 ${isActive
        ? 'text-primary-green scale-110 drop-shadow-[0_0_8px_rgba(34,255,136,0.5)]'
        : 'text-white/40 hover:text-white/70'
      }`
    }
  >
    <span className="material-symbols-outlined mb-0.5 text-2xl">{icon}</span>
    <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
  </NavLink>
);

const Nav = ({ species }) => {
  const { isLoggedIn } = useAuth();
  const checkStatus = isLoggedIn();
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(true);

  const isSpeciesPage = location.pathname.startsWith('/species/');

  // Auto-close chat if user navigates away
  useEffect(() => {
    setIsChatOpen(false);
  }, [location.pathname]);

  // Handler passed to ChatInterface to allow it to close itself
  const handleCloseChat = () => setIsChatOpen(false);

  return (
    <>
      {
        checkStatus ? (
          <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end pb-8" >
            <nav className="pointer-events-auto relative mx-auto w-[90%] max-w-sm">

              {/* {isSpeciesPage && (
          <> */}
              {/* --- 1. Chat Interface (Visible only when open) --- */}
              <div className={`absolute bottom-full left-0 w-full mb-4 transition-all duration-300 origin-bottom ${isChatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
                {isChatOpen && (
                  <div className="relative">
                    <ChatInterface onClose={handleCloseChat} species={species} />
                  </div>
                )}
              </div>

              {/* --- 2. Ask Kaya Button (Visible on all pages) --- */}
              {!isChatOpen && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex bg-dark-start h-14 w-28 items-center justify-center gap-2 rounded-full border border-primary-green/60 bg-bg-dark shadow-[0_0_30px_rgba(34,255,136,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 hover:cursor-pointer group"
                  >
                    <span className="material-symbols-outlined text-2xl text-primary-green group-hover:animate-pulse">
                      nest_eco_leaf
                    </span>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[8px] text-white/60 font-medium uppercase">Ask</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">Kaya</span>
                    </div>
                  </button>
                </div>
              )}
              {/* </>
        )} */}

              {/* --- 3. Main Navigation Bar --- */}
              <div className="glass-panel flex items-center justify-between gap-1 rounded-3xl border border-white/10 bg-black/40 px-1 py-3 shadow-2xl backdrop-blur-xl">

                <NavItem to="/" icon="home" label="Home" />
                <NavItem to="/map" icon="map" label="Map" />
                <NavItem to="/alerts" icon="notifications" label="Alerts" />

                {/* Floating Report Button */}
                <div className="relative mx-2">
                  <NavLink
                    to="/report"
                    aria-label="Report Issue"
                    className={({ isActive }) =>
                      `glass-button-primary flex h-14 w-20 items-center justify-center rounded-full border border-primary-green/60 shadow-[0_0_20px_rgba(34,255,136,0.3)] transition-all duration-300 ${isActive
                        ? 'bg-primary-green text-white scale-110 shadow-[0_0_30px_rgba(34,255,136,0.6)]'
                        : 'bg-black/40 text-white/80 hover:scale-105'
                      }`
                    }
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl leading-none">report</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5">Report</span>
                    </div>
                  </NavLink>
                </div>

                <NavItem to="/satellite" icon="satellite_alt" label="Sat" />
                <NavItem to="/riparian" icon="eco" label="Riparian" />
                <NavItem to="/team" icon="groups" label="Team" />
                <NavItem to="/dashboard" icon="dashboard" label="Dash" />

              </div>
            </nav>
          </div >
        ) : (
          <br></br>
        )}
    </>
  );
};

export default Nav;