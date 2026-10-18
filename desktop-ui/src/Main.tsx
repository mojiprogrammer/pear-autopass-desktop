
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import "./assets/css/style.css";

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Could not find the React root element (#root).');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
