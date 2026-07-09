/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase/client';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  toggleEditMode: () => void;
  canEdit: boolean;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function useCanEditCms() {
  const { isAdminUser, roles } = useAuth();
  const isCmsAdmin = isAdminUser;
  const isCmsEditor = roles?.some(r => r.code === 'EDITOR' || r.code === 'CMS_EDITOR') || false;
  
  const isDev = import.meta.env.DEV;
  const enableCmsEditing = import.meta.env.VITE_ENABLE_CMS_EDITING === "true";
  
  const canEditCms = isCmsAdmin || isCmsEditor || !isSupabaseConfigured || isDev || enableCmsEditing;

  return {
    canEditCms,
    canEdit: canEditCms,
    isAdmin: isCmsAdmin,
    isEditor: isCmsEditor || isCmsAdmin,
    role: isCmsAdmin ? "admin" : isCmsEditor ? "editor" : isDev ? "developer" : "viewer"
  };
}

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { canEditCms } = useCanEditCms();
  const [editMode, setEditModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cms_edit_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setEditMode = (val: boolean) => {
    if (!canEditCms) {
      setEditModeState(false);
      try {
        localStorage.setItem('cms_edit_mode', 'false');
      } catch {}
      return;
    }
    setEditModeState(val);
    try {
      localStorage.setItem('cms_edit_mode', String(val));
    } catch {}
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  // If permissions change and user can no longer edit, disable edit mode
  useEffect(() => {
    if (!canEditCms && editMode) {
      setEditModeState(false);
    }
  }, [canEditCms, editMode]);

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, toggleEditMode, canEdit: canEditCms }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
