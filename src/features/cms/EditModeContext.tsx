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

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { isAdminUser } = useAuth();
  const [editMode, setEditModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cms_edit_mode') === 'true';
    } catch {
      return false;
    }
  });

  const canEdit = isAdminUser || !isSupabaseConfigured;

  const setEditMode = (val: boolean) => {
    if (!canEdit) {
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
    if (!canEdit && editMode) {
      setEditModeState(false);
    }
  }, [canEdit, editMode]);

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, toggleEditMode, canEdit }}>
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
