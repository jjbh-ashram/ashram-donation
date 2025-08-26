import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ActivitySummary = () => {
    const [todaysStats, setTodaysStats] = useState({
        todayTransactions: 0,
        todayAmount: 0,
        weekTransactions: 0,
        weekAmount: 0,
        recentTransactions: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodaysActivity();
    }, []);

    const fetchTodaysActivity = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Get today's transactions
            const { data: todayData, error: todayError } = await supabase
                .from('monthly_donations')
                .select('*')
                .eq('payment_date', today);

            if (todayError) throw todayError;

            // Get this week's transactions
            const { data: weekData, error: weekError } = await supabase
                .from('monthly_donations')
                .select('*')
                .gte('payment_date', weekAgo)
                .order('payment_date', { ascending: false });

            if (weekError) throw weekError;

            // Get recent 5 transactions for display
            const { data: recentData, error: recentError } = await supabase
                .from('monthly_donations')
                .select('*')
                .order('payment_date', { ascending: false })
                .limit(5);

            if (recentError) throw recentError;

            setTodaysStats({
                todayTransactions: todayData?.length || 0,
                todayAmount: todayData?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0,
                weekTransactions: weekData?.length || 0,
                weekAmount: weekData?.reduce((sum, t) => sum + (t.amount_paid || 0), 0) || 0,
                recentTransactions: recentData || []
            });
        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📊 Activity Summary
                </h2>
                <button
                    onClick={fetchTodaysActivity}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-sm text-green-600 dark:text-green-400">Today</div>
                    <div className="text-xl font-bold text-green-800 dark:text-green-200">
                        {todaysStats.todayTransactions} donations
                    </div>
                    <div className="text-lg text-green-700 dark:text-green-300">
                        {formatCurrency(todaysStats.todayAmount)}
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400">This Week</div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        {todaysStats.weekTransactions} donations
                    </div>
                    <div className="text-lg text-blue-700 dark:text-blue-300">
                        {formatCurrency(todaysStats.weekAmount)}
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 dark:text-purple-400">Recent Activity</div>
                    <div className="text-xl font-bold text-purple-800 dark:text-purple-200">
                        {todaysStats.recentTransactions.length} latest
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                        Last: {todaysStats.recentTransactions[0] ? formatDate(todaysStats.recentTransactions[0].payment_date) : 'None'}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            {todaysStats.recentTransactions.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Transactions</h3>
                    <div className="space-y-2">
                        {todaysStats.recentTransactions.slice(0, 3).map((transaction, index) => (
                            <div key={transaction.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {transaction.bhakt_name}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                        {formatDate(transaction.payment_date)}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {formatCurrency(transaction.amount_paid)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivitySummary;
