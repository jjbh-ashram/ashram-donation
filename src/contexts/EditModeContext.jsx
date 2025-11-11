import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const EditModeContext = createContext();

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
};

export const EditModeProvider = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editModeData, setEditModeData] = useState({});
  const [saving, setSaving] = useState(false);
  const onDataRefreshRef = useRef(null);

  // Track changes made in edit mode
  const updateEditData = useCallback((bhaktId, bhaktName, year, month, field, value, amount = null) => {
    setEditModeData(prev => {
      const key = `${bhaktId}_${year}_${month}`;
      const existingData = prev[key] || {};
      
      return {
        ...prev,
        [key]: {
          ...existingData,
          bhakt_id: bhaktId,
          bhakt_name: bhaktName,
          year,
          month,
          [field]: value,
          // Store amount if provided (for marking as paid)
          ...(amount !== null && { amount: amount })
        }
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Clear all edit data
  const clearEditData = useCallback(() => {
    setEditModeData({});
    setHasUnsavedChanges(false);
  }, []);

  // Toggle edit mode with confirmation if there are unsaved changes
  const toggleEditMode = useCallback(() => {
    if (isEditMode && hasUnsavedChanges) {
      const confirmExit = window.confirm(
        'You have unsaved changes. Are you sure you want to exit edit mode? All changes will be lost.'
      );
      if (!confirmExit) return;
    }
    
    setIsEditMode(prev => !prev);
    if (isEditMode) {
      clearEditData();
    }
  }, [isEditMode, hasUnsavedChanges, clearEditData]);

  // Save changes to monthly_sync table
  const saveChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setSaving(true);
    try {
      const updates = Object.values(editModeData);
      
      if (updates.length === 0) {
        setHasUnsavedChanges(false);
        return;
      }

      // Update monthly_sync table with the changes
      for (const update of updates) {
        const { bhakt_id, year, month, ...fields } = update;
        
        // Use upsert to handle both insert and update cases
        const { error } = await supabase
          .from('monthly_sync')
          .upsert({
            bhakt_id,
            year,
            month,
            payment_source: 'manual',
            ...fields
          }, {
            onConflict: ['bhakt_id', 'year', 'month']
          });

        if (error) throw error;
      }

      // Clear edit data and mark as saved
      clearEditData();
      
      // Refresh data if callback is provided
      if (onDataRefreshRef.current) {
        await onDataRefreshRef.current();
      }
      
      // Show success message
      alert(`Successfully saved ${updates.length} changes to the database.`);
      
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [editModeData, hasUnsavedChanges, clearEditData]);

  // Get edit value for a specific cell
  const getEditValue = useCallback((bhaktId, year, month, field, defaultValue) => {
    const key = `${bhaktId}_${year}_${month}`;
    return editModeData[key]?.[field] ?? defaultValue;
  }, [editModeData]);

  // Check if a cell has been modified
  const isCellModified = useCallback((bhaktId, year, month, field) => {
    const key = `${bhaktId}_${year}_${month}`;
    return editModeData[key]?.[field] !== undefined;
  }, [editModeData]);

  // Set data refresh callback
  const setDataRefreshCallback = useCallback((callback) => {
    onDataRefreshRef.current = callback;
  }, []);

  const value = {
    isEditMode,
    hasUnsavedChanges,
    saving,
    toggleEditMode,
    updateEditData,
    saveChanges,
    clearEditData,
    getEditValue,
    isCellModified,
    changesCount: Object.keys(editModeData).length,
    setDataRefreshCallback
  };

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
};
