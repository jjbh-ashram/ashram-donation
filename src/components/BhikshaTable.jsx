import { useBhaktData } from '../hooks/useBhaktData';
import { useState } from 'react';
import { DEFAULT_SELECTED_YEARS, formatYearRange } from '../config/years';
import BhaktDetailsModal from './BhaktDetailsModal';

const BhikshaTable = ({ isEditMode = false, selectedYears = DEFAULT_SELECTED_YEARS }) => {
    const { bhaktData, loading, error, toggleDonation, refreshData } = useBhaktData();
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const [showBhaktDetails, setShowBhaktDetails] = useState(false);
    const [selectedBhakt, setSelectedBhakt] = useState(null);
    
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const years = selectedYears.sort(); // Use filtered years instead of hardcoded ones

    // Handler for opening bhakt details modal
    const handleBhaktDetails = (bhakt) => {
        setSelectedBhakt(bhakt);
        setShowBhaktDetails(true);
    };

    // Handler for when bhakt is updated
    const handleBhaktUpdated = async () => {
        // Close the modal first
        setShowBhaktDetails(false);
        setSelectedBhakt(null);
        
        // Refresh data from Supabase
        if (refreshData) {
            await refreshData();
        }
    };

    // Color coding for different years
    const getYearColors = (year, index) => {
        const colors = [
            { bg: 'bg-blue-50 dark:bg-blue-900/20', header: 'bg-blue-100 dark:bg-blue-800/30', border: 'border-blue-200 dark:border-blue-700' },
            { bg: 'bg-green-50 dark:bg-green-900/20', header: 'bg-green-100 dark:bg-green-800/30', border: 'border-green-200 dark:border-green-700' },
            { bg: 'bg-purple-50 dark:bg-purple-900/20', header: 'bg-purple-100 dark:bg-purple-800/30', border: 'border-purple-200 dark:border-purple-700' },
            { bg: 'bg-orange-50 dark:bg-orange-900/20', header: 'bg-orange-100 dark:bg-orange-800/30', border: 'border-orange-200 dark:border-orange-700' },
            { bg: 'bg-indigo-50 dark:bg-indigo-900/20', header: 'bg-indigo-100 dark:bg-indigo-800/30', border: 'border-indigo-200 dark:border-indigo-700' },
            { bg: 'bg-pink-50 dark:bg-pink-900/20', header: 'bg-pink-100 dark:bg-pink-800/30', border: 'border-pink-200 dark:border-pink-700' }
        ];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading bhakt data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-2">Error loading data:</p>
                        <p className="text-gray-600 dark:text-gray-400">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (years.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">No years selected</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">Please select at least one year from the filter above</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            {/* Table Container - Excel-like scrolling with fixed header */}
            <div className="flex-1 overflow-auto">
                <table className="table-fixed" style={{minWidth: 'max-content'}}>
                    <thead className="sticky top-0 z-20">
                        {/* Year Headers */}
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-3 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 z-30" style={{width: '200px', maxWidth: '200px', minWidth: '200px'}}>
                                Names
                            </th>
                            {years.map((year, index) => {
                                const colors = getYearColors(year, index);
                                return (
                                    <th key={year} colSpan={12} className={`px-2 py-3 text-center text-lg font-bold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${colors.header}`}>
                                        {year}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Month Headers */}
                        <tr className="bg-gray-100 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-600">
                            <th className="sticky left-0 bg-gray-100 dark:bg-gray-600 px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600 z-30" style={{width: '200px', maxWidth: '200px', minWidth: '200px'}}>
                                Amount
                            </th>
                            {years.map((year, yearIndex) => 
                                months.map(month => {
                                    const colors = getYearColors(year, yearIndex);
                                    return (
                                        <th key={`${year}-${month}`} className={`px-1 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 border-r ${colors.border} ${colors.bg}`} style={{width: '60px', minWidth: '60px', maxWidth: '60px'}}>
                                            {month}
                                        </th>
                                    );
                                })
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {bhaktData.map((bhakt, idx) => (
                            <tr 
                                key={bhakt.id} 
                                className={`group transition-colors ${
                                    hoveredRowId === bhakt.id 
                                        ? 'bg-gray-200 dark:bg-gray-600 shadow-sm' 
                                        : idx % 2 === 0 
                                            ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' 
                                            : 'bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                onMouseEnter={() => setHoveredRowId(bhakt.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                            >
                                <td 
                                    className={`sticky left-0 px-3 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 z-20 ${
                                        hoveredRowId === bhakt.id 
                                            ? 'bg-gray-200 dark:bg-gray-600' 
                                            : idx % 2 === 0 
                                                ? 'bg-white dark:bg-gray-800' 
                                                : 'bg-gray-50 dark:bg-gray-750'
                                    }`} 
                                    style={{width: '200px', maxWidth: '200px', minWidth: '200px'}}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight mb-1">{bhakt.name}</div>
                                            {bhakt.alias_name && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight mb-1">
                                                    ({bhakt.alias_name})
                                                </div>
                                            )}
                                            <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                                                ₹{bhakt.monthly_donation_amount.toLocaleString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleBhaktDetails(bhakt)}
                                            className="ml-2 p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                                            title="View bhakt details"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                                {years.map((year, yearIndex) => 
                                    months.map(month => {
                                        const isDonated = bhakt.donations?.[year]?.[month] || false;
                                        const colors = getYearColors(year, yearIndex);
                                        return (
                                            <td 
                                                key={`${year}-${month}`} 
                                                className={`border-r ${colors.border} p-1 text-center ${
                                                    hoveredRowId === bhakt.id 
                                                        ? 'bg-gray-200 dark:bg-gray-600' 
                                                        : colors.bg
                                                }`} 
                                                style={{width: '60px', minWidth: '60px', maxWidth: '60px'}}
                                            >
                                                <button
                                                    onClick={isEditMode ? () => toggleDonation(bhakt.id, year, month) : undefined}
                                                    disabled={!isEditMode}
                                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto shadow-sm ${
                                                        !isEditMode 
                                                            ? 'cursor-not-allowed opacity-75' 
                                                            : 'hover:scale-105 cursor-pointer'
                                                    } ${
                                                        isDonated
                                                            ? 'bg-green-500 border-green-500 text-white shadow-md'
                                                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:border-green-400 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    }`}
                                                    title={
                                                        !isEditMode 
                                                            ? 'Locked - Switch to Edit mode to modify' 
                                                            : `${month} ${year} - ${isDonated ? 'Donated' : 'Not donated'}`
                                                    }
                                                >
                                                    {isDonated && (
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </td>
                                        );
                                    })
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Instructions Footer */}
            <div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 transition-colors">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Total Bhakts: {bhaktData.length}</span>
                    <span className="hidden sm:inline">
                        {isEditMode ? 'Click on month boxes to mark donations' : 'Switch to Edit mode to modify donations'}
                    </span>
                    <div className="flex items-center space-x-4">
                        <span className={`font-medium ${isEditMode ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            Mode: {isEditMode ? 'Edit' : 'Locked'}
                        </span>
                        <span className="font-medium">
                            Years: {formatYearRange(years)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bhakt Details Modal */}
            <BhaktDetailsModal
                isOpen={showBhaktDetails}
                onClose={() => setShowBhaktDetails(false)}
                bhakt={selectedBhakt}
                onBhaktUpdated={handleBhaktUpdated}
            />
        </div>
    );
};

export default BhikshaTable;
