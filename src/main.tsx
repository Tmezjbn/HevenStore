import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { installGlobalErrorHandlers } from './lib/reportError';
import './index.css';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
