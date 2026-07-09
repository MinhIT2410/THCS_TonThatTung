import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext.tsx';
import { EditModeProvider } from './features/cms/EditModeContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <EditModeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </EditModeProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  </StrictMode>,
);

