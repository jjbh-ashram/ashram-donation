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

            // Fetch bhakt data with their payment summary
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
                    carry_forward_balance,
                    last_payment_date,
                    payment_status
                `)
                .order('name');

            if (bhaktError) throw bhaktError;

            // Get payment transactions for all bhakts
            const { data: transactions, error: transactionError } = await supabase
                .from('monthly_donations')
                .select('*')
                .order('payment_date', { ascending: true });

            if (transactionError) throw transactionError;

            // Calculate dynamic years from transactions
            const allYears = transactions.length > 0 
                ? [...new Set(transactions.map(t => new Date(t.payment_date).getFullYear()))].sort()
                : [new Date().getFullYear()];

            // Transform data to calculate month-wise status dynamically
            const transformedData = bhaktList.map(bhakt => {
                const donations = {};
                const bhaktTransactions = transactions.filter(t => t.bhakt_id === bhakt.id);
                const monthlyAmount = bhakt.monthly_donation_amount || 0;
                
                // Calculate total paid by this bhakt
                const totalPaid = bhaktTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
                const totalAvailable = totalPaid + (bhakt.carry_forward_balance || 0);
                
                // Calculate how many months are covered
                const monthsCovered = monthlyAmount > 0 ? Math.floor(totalAvailable / monthlyAmount) : 0;
                
                // Calculate "Paid till" status
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                
                let calculatedStatus = 'No payments';
                if (monthsCovered > 0) {
                    // Start from January of current year and count forward
                    let paidTillYear = currentYear;
                    let paidTillMonth = monthsCovered; // monthsCovered gives us the last paid month number
                    
                    // Handle year overflow
                    while (paidTillMonth > 12) {
                        paidTillMonth -= 12;
                        paidTillYear += 1;
                    }
                    
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    calculatedStatus = `Paid till ${monthNames[paidTillMonth - 1]} ${paidTillYear}`;
                } else if (totalAvailable > 0) {
                    calculatedStatus = 'Partial payment';
                }

                // Use calculated status if payment_status is generic, otherwise use stored status
                const displayStatus = (!bhakt.payment_status || 
                                     bhakt.payment_status === 'current' || 
                                     bhakt.payment_status === 'advance' || 
                                     bhakt.payment_status === 'overdue') 
                    ? calculatedStatus 
                    : bhakt.payment_status;

                // Generate month status for each year
                allYears.forEach(year => {
                    donations[year] = {};
                    for (let month = 1; month <= 12; month++) {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthName = monthNames[month - 1];
                        
                        // Calculate if this month is paid based on sequential payment logic
                        const monthsSinceStart = (year - allYears[0]) * 12 + month;
                        const isPaid = monthsSinceStart <= monthsCovered;
                        
                        donations[year][monthName] = isPaid;
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
                    carry_forward_balance: bhakt.carry_forward_balance || 0,
                    last_payment_date: bhakt.last_payment_date,
                    payment_status: displayStatus,
                    total_paid: totalPaid,
                    months_covered: monthsCovered,
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

    // Fetch available years from monthly donations (transactions)
    const fetchAvailableYears = async () => {
        try {
            const { data: transactions, error } = await supabase
                .from('monthly_donations')
                .select('payment_date')
                .order('payment_date', { ascending: true });
            
            if (error) throw error;
            
            if (!transactions || transactions.length === 0) {
                // Default to current year if no transactions
                const currentYear = new Date().getFullYear();
                return [currentYear];
            }
            
            // Extract unique years from payment dates
            const years = [...new Set(
                transactions.map(t => new Date(t.payment_date).getFullYear())
            )].sort();
            
            return years;
        } catch (error) {
            console.error('Error fetching available years:', error);
            // Fallback to current year
            return [new Date().getFullYear()];
        }
    };

    // New TRUE transaction-based bhiksha entry function
    const addBhikshaEntryTransaction = async (bhaktName, paymentAmount, paymentDate, notes) => {
        try {
            // Find bhakt by name
            const bhakt = bhaktData.find(b => b.name === bhaktName);
            if (!bhakt) {
                throw new Error('Bhakt not found');
            }

            const monthlyAmount = bhakt.monthly_donation_amount || 0;
            let totalAmountToProcess = parseFloat(paymentAmount);

            // Get current carry forward balance from bhakt table
            const { data: bhaktRecord, error: bhaktError } = await supabase
                .from('bhakt')
                .select('carry_forward_balance')
                .eq('id', bhakt.id)
                .single();

            if (bhaktError) throw bhaktError;

            // Add any existing carry forward balance to the payment
            const existingBalance = bhaktRecord.carry_forward_balance || 0;
            totalAmountToProcess += existingBalance;

            // Calculate how many months this payment covers
            const monthsCovered = Math.floor(totalAmountToProcess / monthlyAmount);
            const remainingBalance = totalAmountToProcess - (monthsCovered * monthlyAmount);

            // Calculate the last month/year paid till
            // Start from January of current year and count forward
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            
            // Calculate the end month/year based on months covered from start of year
            let paidTillYear = currentYear;
            let paidTillMonth = monthsCovered; // Start from month 0, so monthsCovered gives us the last paid month
            
            // Handle year overflow
            while (paidTillMonth > 12) {
                paidTillMonth -= 12;
                paidTillYear += 1;
            }
            
            // If monthsCovered is 0, payment doesn't cover any full month
            const paidTillStatus = monthsCovered > 0 
                ? `Paid till ${getMonthName(paidTillMonth)} ${paidTillYear}`
                : 'Partial payment';

            // Helper function to get month name
            function getMonthName(monthNum) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[monthNum - 1];
            }

            // Create a single transaction record for the payment
            const autoGeneratedNote = `Payment of ₹${paymentAmount}${existingBalance > 0 ? ` (including ₹${existingBalance.toFixed(2)} carry-forward)` : ''}. Covers ${monthsCovered} month(s).`;
            
            const finalNotes = notes && notes.trim() 
                ? `${notes.trim()}\n---\n${autoGeneratedNote}`
                : autoGeneratedNote;

            const transactionRecord = {
                bhakt_id: bhakt.id,
                bhakt_name: bhaktName,
                payment_date: paymentDate,
                amount_paid: parseFloat(paymentAmount),
                notes: finalNotes
            };

            // Insert the transaction record
            const { error: transactionError } = await supabase
                .from('monthly_donations')
                .insert([transactionRecord]);

            if (transactionError) throw transactionError;

            // Update bhakt record with new balance and payment info
            const { error: updateBhaktError } = await supabase
                .from('bhakt')
                .update({
                    carry_forward_balance: remainingBalance,
                    last_payment_date: paymentDate,
                    payment_status: paidTillStatus
                })
                .eq('id', bhakt.id);

            if (updateBhaktError) throw updateBhaktError;

            // Refresh the data to update UI immediately
            await fetchBhaktData();

            // Create result message
            let resultMessage = `Payment of ₹${paymentAmount} processed successfully.`;
            
            if (existingBalance > 0) {
                resultMessage += ` Used ₹${existingBalance.toFixed(2)} carry-forward balance.`;
            }
            
            resultMessage += ` Total covers ${monthsCovered} month(s).`;
            
            if (remainingBalance > 0) {
                resultMessage += ` New carry-forward balance: ₹${remainingBalance.toFixed(2)}.`;
            }

            return { 
                success: true, 
                message: resultMessage,
                monthsCovered,
                carryForward: remainingBalance,
                totalProcessed: totalAmountToProcess
            };

        } catch (err) {
            console.error('Error adding transaction-based bhiksha entry:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    return {
        bhaktData,
        loading,
        error,
        refreshData: fetchBhaktData,
        fetchAvailableYears,
        toggleDonation,
        addNewBhakt,
        addBhikshaEntry,
        addBhikshaEntryTransaction
    };
};
