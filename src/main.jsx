import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-recover from Stale Dynamic Module/Chunk Load Errors (Deploy Version Mismatch)
window.addEventListener('error', (e) => {
  const msg = e?.message || e?.error?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Failed to load module script') ||
    msg.includes('Importing a module script failed')
  ) {
    const key = 'rt_chunk_reload_' + (e.filename || 'general');
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      console.warn('Stale dynamic chunk detected due to new deployment. Reloading to fetch latest version...');
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || e?.reason?.toString() || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Failed to load module script') ||
    msg.includes('Importing a module script failed')
  ) {
    const key = 'rt_chunk_reload_rejection';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      console.warn('Stale dynamic module promise rejection detected. Reloading...');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
