// src/main.tsx
// Main entry point for the React application
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import './styles/fonts.css'
import './styles/location-icons.css'
import { PatchScreen } from './screens/PatchScreen'

// Decide which screen to render based on URL hash.
// Default: show PatchScreen (update check + startup wait).
// After PatchScreen completes, it navigates to #app to show the main App.
const isAppMode = window.location.hash === '#app';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    {isAppMode ? <App /> : <PatchScreen />}
  </StrictMode>,
);
