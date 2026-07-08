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
      setSiteSettings(settings);
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
      const { data, error: updateError } = await siteSettingsService.updateSiteSettings(input, user.id);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return false;
      }
      if (data) {
        setSiteSettings(data);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
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
