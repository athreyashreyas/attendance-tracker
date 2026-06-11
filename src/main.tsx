import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Keep the installed PWA up to date without a manual reinstall: check for a new
// version whenever the app regains focus (iOS only re-checks on cold launch),
// and reload into it gracefully once the new service worker takes over.
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return; // skip the first install
    reloading = true;
    window.dispatchEvent(new CustomEvent('attend:updating'));
    window.setTimeout(() => window.location.reload(), 700);
  });

  navigator.serviceWorker.ready
    .then((reg) => {
      const check = () => void reg.update().catch(() => undefined);
      window.addEventListener('focus', check);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, 30 * 60 * 1000);
    })
    .catch(() => undefined);
}
