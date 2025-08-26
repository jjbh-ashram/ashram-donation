import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useYearConfig = () => {
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch years from year_config table
  const fetchYears = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('year_config')
        .select('year, is_active')
        .order('year', { ascending: true });

      if (error) throw error;
      
      const years = data || [];
      setAvailableYears(years);
      return years;
    } catch (error) {
      console.error('Error fetching years:', error);
      setError(error.message);
      // Fallback to default years if database fails
      const fallbackYears = [
        { year: 2023, is_active: true },
        { year: 2024, is_active: true },
        { year: 2025, is_active: true }
      ];
      setAvailableYears(fallbackYears);
      return fallbackYears;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new year to year_config (triggers will handle monthly_sync)
  const addYear = useCallback(async (year) => {
    if (!year || year < 2020 || year > 2050) {
      throw new Error('Please enter a valid year between 2020 and 2050');
    }

    try {
      setLoading(true);
      setError(null);

      // Check if year already exists
      const { data: existingYear } = await supabase
        .from('year_config')
        .select('year, is_active')
        .eq('year', year)
        .single();

      if (existingYear) {
        throw new Error(`Year ${year} already exists`);
      }

      // Add new year to year_config table
      // The trigger will automatically populate monthly_sync
      const { error: insertError } = await supabase
        .from('year_config')
        .insert([{ year, is_active: true }]);

      if (insertError) throw insertError;

      // Refresh the years list
      await fetchYears();
      
    } catch (error) {
      console.error('Error adding year:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchYears]);

  // Delete year from year_config (triggers will handle monthly_sync cleanup)
  const deleteYear = useCallback(async (year) => {
    if (!year) {
      throw new Error('Year is required');
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from year_config table
      // The trigger will automatically clean up monthly_sync
      const { error: deleteError } = await supabase
        .from('year_config')
        .delete()
        .eq('year', year);

      if (deleteError) throw deleteError;

      // Refresh the years list
      await fetchYears();
      
    } catch (error) {
      console.error('Error deleting year:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchYears]);

  // Update year status in year_config (triggers will handle monthly_sync)
  const updateYearStatus = useCallback(async (year, isActive) => {
    if (!year) {
      throw new Error('Year is required');
    }

    try {
      setLoading(true);
      setError(null);

      // Update year status in year_config table
      // The trigger will automatically update monthly_sync
      const { error: updateError } = await supabase
        .from('year_config')
        .update({ is_active: isActive })
        .eq('year', year);

      if (updateError) throw updateError;

      // Refresh the years list
      await fetchYears();
      
    } catch (error) {
      console.error('Error updating year status:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchYears]);

  // Sync existing bhakts with a specific year in monthly_sync
  const syncBhaktsForYear = useCallback(async (year) => {
    try {
      setLoading(true);
      setError(null);

      // Get all bhakts
      const { data: bhakts, error: bhaktError } = await supabase
        .from('bhakt')
        .select('id');

      if (bhaktError) throw bhaktError;

      // Check which bhakts already have records for this year
      const { data: existingRecords, error: existingError } = await supabase
        .from('monthly_sync')
        .select('bhakt_id')
        .eq('year', year);

      if (existingError) throw existingError;

      const existingBhaktIds = new Set(existingRecords.map(r => r.bhakt_id));
      const bhaktsToAdd = bhakts.filter(b => !existingBhaktIds.has(b.id));

      if (bhaktsToAdd.length > 0) {
        // Create monthly_sync records for bhakts that don't have them for this year
        const monthlyRecords = [];
        for (const bhakt of bhaktsToAdd) {
          for (let month = 1; month <= 12; month++) {
            monthlyRecords.push({
              bhakt_id: bhakt.id,
              year: year,
              month: month,
              is_paid: false,
              payment_source: null,
              transaction_id: null,
              notes: null
            });
          }
        }

        const { error: insertError } = await supabase
          .from('monthly_sync')
          .insert(monthlyRecords);

        if (insertError) throw insertError;
      }

    } catch (error) {
      console.error('Error syncing bhakts for year:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Populate monthly_sync for all existing years and bhakts
  const populateMonthlySync = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all active years from year_config
      const { data: years, error: yearError } = await supabase
        .from('year_config')
        .select('year')
        .eq('is_active', true);

      if (yearError) throw yearError;

      // Sync each year
      for (const yearData of years) {
        await syncBhaktsForYear(yearData.year);
      }

    } catch (error) {
      console.error('Error populating monthly_sync:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [syncBhaktsForYear]);

  return {
    availableYears,
    loading,
    error,
    fetchYears,
    addYear,
    deleteYear,
    updateYearStatus,
    syncBhaktsForYear,
    populateMonthlySync
  };
};
