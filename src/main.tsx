import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import { App } from './app/App';
import './ui/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root ausente.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
