import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${isActive
        ? 'text-primary-green scale-105 drop-shadow-[0_0_8px_rgba(34,255,136,0.5)]'
        : 'text-white/40 hover:text-white/70'
      }`
    }
  >
    <span className="material-symbols-outlined text-[18px]">{icon}</span>
    <span className="text-[7px] font-bold uppercase tracking-wider truncate max-w-[50px]">{label}</span>
  </NavLink>
);

const Nav = () => {
  const location = useLocation();

  useEffect(() => {
    // Chat disabled
  }, [location.pathname]);

  const navItems = [
    { to: "/", icon: "home", label: "Home" },
    { to: "/map", icon: "map", label: "Map" },
    { to: "/alerts", icon: "notifications", label: "Alerts" },
    { to: "/satellite", icon: "satellite", label: "Sat" },
    { to: "/riparian", icon: "eco", label: "Riparian" },
    { to: "/team", icon: "groups", label: "Team" },
    { to: "/dashboard", icon: "dashboard", label: "Dash" },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end pb-4 sm:pb-6">
      <nav className="pointer-events-auto relative mx-auto w-[98%] sm:w-[90%] max-w-md">

        {/* Ask Kaya Button */}
        <div className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 z-20">
          <button className="flex bg-dark-start h-10 sm:h-12 w-22 sm:w-26 items-center justify-center gap-1 rounded-full border border-primary-green/60 bg-bg-dark shadow-[0_0_20px_rgba(34,255,136,0.4)]">
            <span className="material-symbols-outlined text-lg sm:text-xl text-primary-green">nest_eco_leaf</span>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[6px] sm:text-[7px] text-white/60 uppercase">Ask</span>
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white">Kaya</span>
            </div>
          </button>
        </div>

        {/* Main Navigation Bar */}
        <div className="glass-panel flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-1 py-1.5 shadow-2xl backdrop-blur-xl overflow-hidden">
          
          {/* Left Side - 3 items */}
          <div className="flex items-center flex-1">
            {navItems.slice(0, 3).map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>

          {/* Floating Report Button */}
          <div className="relative mx-0.5 flex-shrink-0">
            <NavLink
              to="/report"
              aria-label="Report Issue"
              className={({ isActive }) =>
                `flex h-10 w-12 sm:h-12 sm:w-16 items-center justify-center rounded-full border border-primary-green/60 shadow-[0_0_15px_rgba(34,255,136,0.3)] transition-all duration-300 ${isActive
                  ? 'bg-primary-green text-white scale-105 shadow-[0_0_25px_rgba(34,255,136,0.6)]'
                  : 'bg-black/40 text-white/80 hover:scale-105'
                }`
              }
            >
              <div className="flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-lg sm:text-xl leading-none">report</span>
                <span className="text-[6px] sm:text-[7px] font-bold uppercase tracking-widest mt-0.5">Report</span>
              </div>
            </NavLink>
          </div>

          {/* Right Side - 4 items */}
          <div className="flex items-center flex-1 justify-end">
            {navItems.slice(3).map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>

        </div>
      </nav>
    </div>
  );
};

export default Nav;
