import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeColorsProvider } from './hooks/useThemeColors';
import { version } from './package.json';

// Set document title with version
document.title = `storywell.games v${version}`;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeColorsProvider>
      <App />
    </ThemeColorsProvider>
  </React.StrictMode>
);
