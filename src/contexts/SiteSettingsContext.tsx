/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteSettings, SiteSettingsInput } from '../types/siteSettings';
import { siteSettingsService, fallbackSiteSettings } from '../services/siteSettingsService';
import { useAuth } from './AuthContext';

interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (input: Partial<SiteSettingsInput>) => Promise<boolean>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(fallbackSiteSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await siteSettingsService.getSiteSettings();
      const savedHours = localStorage.getItem('site_settings_reception_hours');
      const savedFaqs = localStorage.getItem('site_settings_faqs');
      
      setSiteSettings({
        ...settings,
        reception_hours: savedHours !== null ? savedHours : (settings.reception_hours || fallbackSiteSettings.reception_hours),
        faqs: savedFaqs !== null ? JSON.parse(savedFaqs) : (settings.faqs || fallbackSiteSettings.faqs)
      });
    } catch (err: any) {
      console.error('Error refreshing site settings:', err);
      setError(err?.message || 'Failed to fetch site settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (input: Partial<SiteSettingsInput>): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to update site settings');
      return false;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { reception_hours, faqs, ...dbInput } = input as any;

      let updatedDbSettings: any = null;
      if (Object.keys(dbInput).length > 0) {
        const { data, error: updateError } = await siteSettingsService.updateSiteSettings(dbInput, user.id);
        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return false;
        }
        updatedDbSettings = data;
      }

      if (reception_hours !== undefined) {
        localStorage.setItem('site_settings_reception_hours', reception_hours);
      }
      if (faqs !== undefined) {
        localStorage.setItem('site_settings_faqs', JSON.stringify(faqs));
      }

      setSiteSettings(prev => ({
        ...prev,
        ...(updatedDbSettings || {}),
        reception_hours: reception_hours !== undefined ? reception_hours : prev.reception_hours,
        faqs: faqs !== undefined ? faqs : prev.faqs
      }));

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error updating site settings:', err);
      setError(err?.message || 'Failed to update site settings');
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SiteSettingsContext.Provider
      value={{
        siteSettings,
        loading,
        error,
        refreshSettings,
        updateSettings
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
