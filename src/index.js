import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './lib/stores/store';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './i18n';
import 'flag-icons/css/flag-icons.min.css';
import './index.css';

// Silences les erreurs réseau non critiques (ex: refresh token quand hors ligne)
// pour éviter qu'elles remontent comme uncaught errors dans la console navigateur.
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? '';
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Provider>
);
