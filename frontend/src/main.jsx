import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown render error' };
  }

  componentDidCatch(error) {
    console.error('Root render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0f19',
            color: '#e5efff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'Inter, sans-serif'
          }}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              border: '1px solid rgba(255, 110, 110, 0.5)',
              borderRadius: 12,
              background: 'rgba(120, 0, 0, 0.2)',
              padding: 16
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>UI Runtime Error</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>
              The app prevented a blank screen and captured an error while rendering.
            </div>
            <code style={{ fontSize: 12, opacity: 0.95 }}>{this.state.message}</code>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </RootErrorBoundary>,
)
