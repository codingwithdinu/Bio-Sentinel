import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        top: '14px',
        right: '16px',
        zIndex: 300,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: isDark ? '1.5px solid rgba(34,255,136,0.35)' : '1.5px solid rgba(0,0,0,0.15)',
        background: isDark
          ? 'rgba(10,14,20,0.75)'
          : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: isDark
          ? '0 0 12px rgba(34,255,136,0.18), inset 0 1px 0 rgba(255,255,255,0.07)'
          : '0 2px 12px rgba(0,0,0,0.12)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s ease',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '20px',
          color: isDark ? '#22ff88' : '#1a4a2e',
          fontVariationSettings: "'wght' 300",
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
