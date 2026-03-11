import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ChatInterface from './ChatInterface';

const NavItem = ({ to, icon, label, isDark }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-[2px] min-w-0 flex-1 py-1.5 transition-all duration-200 ${
        isActive
          ? 'text-[#22ff88]'
          : isDark ? 'text-white/40 hover:text-white/65' : 'text-[#1a4a2e]/45 hover:text-[#1a4a2e]/75'
      }`
    }
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 280, 'GRAD' 0, 'opsz' 20" }}
    >
      {icon}
    </span>
    <span style={{ fontSize: '7px', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
      {label}
    </span>
  </NavLink>
);

const Nav = ({ species }) => {
  const { isLoggedIn } = useAuth();
  const themeCtx = useTheme();
  const isDark = (themeCtx?.theme ?? 'dark') === 'dark';
  const checkStatus = isLoggedIn();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => { setIsChatOpen(false); }, [location.pathname]);

  if (!checkStatus) return null;

  const barStyle = isDark
    ? { background: 'rgba(8,12,18,0.85)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 -4px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)' }
    : { background: 'rgba(240,250,242,0.92)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 -4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)' };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end pb-3 px-2">

      {/* Chat Interface */}
      <div className={`pointer-events-auto mx-auto w-full max-w-lg mb-2 transition-all duration-300 origin-bottom ${
        isChatOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none h-0'
      }`}>
        {isChatOpen && <ChatInterface onClose={() => setIsChatOpen(false)} species={species} />}
      </div>

      {/* Navigation Bar — all 9 items in one row */}
      <nav
        className="pointer-events-auto mx-auto w-full max-w-lg rounded-[22px] overflow-hidden"
        style={{ ...barStyle, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}
      >
        <div className="flex items-stretch">
          <NavItem to="/" icon="home" label="Home" isDark={isDark} />
          <NavItem to="/map" icon="map" label="Map" isDark={isDark} />
          <NavItem to="/alerts" icon="notifications" label="Alerts" isDark={isDark} />

          {/* Report — center accent */}
          <NavLink
            to="/report"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-[2px] min-w-0 flex-1 py-1.5 transition-all duration-200 border-x ${
                isActive
                  ? isDark
                    ? 'text-[#22ff88] bg-[#22ff88]/10 border-[#22ff88]/20'
                    : 'text-[#22ff88] bg-[#22ff88]/10 border-[#22ff88]/20'
                  : isDark
                    ? 'text-[#22ff88]/60 border-white/5 hover:bg-[#22ff88]/5'
                    : 'text-[#22ff88]/60 border-black/5 hover:bg-[#22ff88]/5'
              }`
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 280, 'GRAD' 0, 'opsz' 20" }}
            >
              add_circle
            </span>
            <span style={{ fontSize: '7px', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
              Report
            </span>
          </NavLink>

          <NavItem to="/satellite" icon="satellite_alt" label="Sat" isDark={isDark} />
          <NavItem to="/riparian" icon="eco" label="Riparian" isDark={isDark} />
          <NavItem to="/team" icon="groups" label="Team" isDark={isDark} />
          <NavItem to="/dashboard" icon="dashboard" label="Dash" isDark={isDark} />

          {/* Kaya — inline toggle */}
          <button
            onClick={() => setIsChatOpen(v => !v)}
            className={`flex flex-col items-center justify-center gap-[2px] min-w-0 flex-1 py-1.5 transition-all duration-200 ${
              isChatOpen
                ? 'text-[#22ff88]'
                : isDark ? 'text-white/40 hover:text-white/65' : 'text-[#1a4a2e]/45 hover:text-[#1a4a2e]/75'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 280, 'GRAD' 0, 'opsz' 20" }}
            >
              nest_eco_leaf
            </span>
            <span style={{ fontSize: '7px', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              Kaya
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Nav;