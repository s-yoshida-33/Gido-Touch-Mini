// src/main.tsx
// Main entry point for the React application
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import './styles/fonts.css'
import './styles/location-icons.css'
import { PatchScreen } from './screens/PatchScreen'

// Root component: manages the PatchScreen → App transition via React state.
// No page reload needed — window properties persist across the state change.
function Root() {
  const [showApp, setShowApp] = useState(false);

  if (showApp) return <App />;
  return <PatchScreen onComplete={() => setShowApp(true)} />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
