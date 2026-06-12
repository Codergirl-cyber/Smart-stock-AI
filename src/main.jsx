import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { startAgentRunner } from '../services/automation/runner';

// Default light; only apply dark when user explicitly saved it
document.documentElement.setAttribute(
  'data-theme',
  localStorage.getItem('sellersync_theme') === 'dark' ? 'dark' : 'light'
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// start background agent runner (safe no-op if already running)
try { startAgentRunner(); } catch (e) { console.warn('Agent runner failed to start', e); }
