import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SiteSettingsProvider>
    </AuthProvider>
  </StrictMode>,
);
