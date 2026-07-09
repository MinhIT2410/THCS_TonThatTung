/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCanEditCms } from './useCanEditCms';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  toggleEditMode: () => void;
  canEdit: boolean;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export { useCanEditCms };


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
