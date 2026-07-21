import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const checkAppVersion = async () => {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  const storedVersion = localStorage.getItem('gba-app-version');


  if (storedVersion && storedVersion !== currentVersion) {
    console.log(`New version detected: ${currentVersion} (was ${storedVersion}). Clearing application asset caches...`);


    if (window.caches) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(keys.map(key => window.caches.delete(key)));
        console.log('Cache Storage cleared.');
      } catch (e) {
        console.error('Failed to clear Cache Storage:', e);
      }
    }


    if (navigator.serviceWorker) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('Service Workers unregistered.');
      } catch (e) {
        console.error('Failed to unregister Service Workers:', e);
      }
    }

    localStorage.setItem('gba-app-version', currentVersion);
    window.location.reload();
  } else {
    localStorage.setItem('gba-app-version', currentVersion);
  }
};


checkAppVersion().catch(err => console.error('Error during app version check:', err));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
