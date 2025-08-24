import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useBhaktData = () => {
    const [bhaktData, setBhaktData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBhaktData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch bhakt data with their monthly donations
            const { data: bhaktList, error: bhaktError } = await supabase
                .from('bhakt')
                .select(`
                    id,
                    name,
                    alias_name,
                    phone_number,
                    email,
                    address,
                    monthly_donation_amount,
                    monthly_donations (
                        year,
                        month,
                        donated,
                        amount,
                        donation_date,
                        notes
                    )
                `)
                .order('name');

            if (bhaktError) throw bhaktError;

            // Transform data to match our component structure
            const transformedData = bhaktList.map(bhakt => {
                const donations = {};
                
                // Initialize donation structure for 2025 and 2026
                [2025, 2026].forEach(year => {
                    donations[year] = {};
                    for (let month = 1; month <= 12; month++) {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthName = monthNames[month - 1];
                        
                        // Find if there's a donation record for this month/year
                        const donationRecord = bhakt.monthly_donations?.find(
                            d => d.year === year && d.month === month
                        );
                        
                        donations[year][monthName] = donationRecord?.donated || false;
                    }
                });

                return {
                    id: bhakt.id,
                    name: bhakt.name,
                    alias_name: bhakt.alias_name,
                    phone_number: bhakt.phone_number,
                    email: bhakt.email,
                    address: bhakt.address,
                    monthly_donation_amount: bhakt.monthly_donation_amount,
                    donations
                };
            });

            setBhaktData(transformedData);
        } catch (err) {
            console.error('Error fetching bhakt data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleDonation = async (bhaktId, year, month) => {
        try {
            const monthNumber = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month) + 1;

            // Check if record exists
            const { data: existingRecord, error: fetchError } = await supabase
                .from('monthly_donations')
                .select('*')
                .eq('bhakt_id', bhaktId)
                .eq('year', year)
                .eq('month', monthNumber)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            const newDonatedStatus = !existingRecord?.donated;

            if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('monthly_donations')
                    .update({ 
                        donated: newDonatedStatus,
                        donation_date: newDonatedStatus ? new Date().toISOString().split('T')[0] : null
                    })
                    .eq('id', existingRecord.id);

                if (updateError) throw updateError;
            } else {
                // Create new record
                const { error: insertError } = await supabase
                    .from('monthly_donations')
                    .insert({
                        bhakt_id: bhaktId,
                        year: year,
                        month: monthNumber,
                        donated: newDonatedStatus,
                        donation_date: newDonatedStatus ? new Date().toISOString().split('T')[0] : null
                    });

                if (insertError) throw insertError;
            }

            // Update local state
            setBhaktData(prevData =>
                prevData.map(bhakt =>
                    bhakt.id === bhaktId
                        ? {
                            ...bhakt,
                            donations: {
                                ...bhakt.donations,
                                [year]: {
                                    ...bhakt.donations[year],
                                    [month]: newDonatedStatus
                                }
                            }
                        }
                        : bhakt
                )
            );

            return { success: true };
        } catch (err) {
            console.error('Error toggling donation:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const addNewBhakt = async (bhaktData) => {
        try {
            const { data, error } = await supabase
                .from('bhakt')
                .insert([bhaktData])
                .select()
                .single();

            if (error) throw error;

            // Refresh the data
            await fetchBhaktData();
            return { success: true, data };
        } catch (err) {
            console.error('Error adding bhakt:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const addBhikshaEntry = async (bhaktName, month, year, amount, notes) => {
        try {
            // Find bhakt by name
            const bhakt = bhaktData.find(b => b.name === bhaktName);
            if (!bhakt) {
                throw new Error('Bhakt not found');
            }

            const monthNumber = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month) + 1;

            // Insert or update monthly donation record
            const { error } = await supabase
                .from('monthly_donations')
                .upsert({
                    bhakt_id: bhakt.id,
                    year: parseInt(year),
                    month: monthNumber,
                    donated: true,
                    amount: parseFloat(amount) || bhakt.monthly_donation_amount,
                    donation_date: new Date().toISOString().split('T')[0],
                    notes: notes
                });

            if (error) throw error;

            // Refresh the data
            await fetchBhaktData();
            return { success: true };
        } catch (err) {
            console.error('Error adding bhiksha entry:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchBhaktData();
    }, []);

    return {
        bhaktData,
        loading,
        error,
        refreshData: fetchBhaktData,
        toggleDonation,
        addNewBhakt,
        addBhikshaEntry
    };
};
