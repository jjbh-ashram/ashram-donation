import { useBhaktData } from '../hooks/useBhaktData';
import { useState, useEffect, useRef } from 'react';
import BhaktDetailsModal from './BhaktDetailsModal';
import { useEditMode } from '../contexts/EditModeContext';

const BhikshaTable = ({ selectedYears }) => {
    const { bhaktData, loading, error, refreshData } = useBhaktData();
    const { 
        isEditMode, 
        hasUnsavedChanges, 
        saving,
        toggleEditMode, 
        updateEditData, 
        saveChanges, 
        getEditValue, 
        isCellModified,
        changesCount,
        setDataRefreshCallback 
    } = useEditMode();
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const [showBhaktDetails, setShowBhaktDetails] = useState(false);
    const [selectedBhakt, setSelectedBhakt] = useState(null);
    
    // Filter states
    const [selectedBhakts, setSelectedBhakts] = useState([]);
    const [showBhaktFilter, setShowBhaktFilter] = useState(false);
    const [bhaktSearchTerm, setBhaktSearchTerm] = useState('');
    const [filteredBhakts, setFilteredBhakts] = useState([]);
    const filterDropdownRef = useRef(null);
    const filterSearchRef = useRef(null);
    
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const years = selectedYears.sort(); // Use filtered years instead of hardcoded ones

    // Register data refresh callback for edit mode
    useEffect(() => {
        setDataRefreshCallback(refreshData);
    }, [refreshData, setDataRefreshCallback]);

    // Filter bhakts based on search term
    useEffect(() => {
        if (!bhaktData || bhaktData.length === 0) {
            setFilteredBhakts([]);
            return;
        }

        const filtered = bhaktData.filter(bhakt => {
            const name = bhakt.name?.toLowerCase() || '';
            const aliasName = bhakt.alias_name?.toLowerCase() || '';
            const search = bhaktSearchTerm.toLowerCase();
            
            return name.includes(search) || aliasName.includes(search);
        });

        setFilteredBhakts(filtered);
    }, [bhaktData, bhaktSearchTerm]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowBhaktFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter data based on selected bhakts
    const displayData = selectedBhakts.length > 0 
        ? bhaktData.filter(bhakt => selectedBhakts.some(selected => selected.id === bhakt.id))
        : bhaktData;

    // Handle bhakt selection for filter
    const toggleBhaktSelection = (bhakt) => {
        setSelectedBhakts(prev => {
            const isSelected = prev.some(selected => selected.id === bhakt.id);
            if (isSelected) {
                return prev.filter(selected => selected.id !== bhakt.id);
            } else {
                return [...prev, bhakt];
            }
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setSelectedBhakts([]);
        setBhaktSearchTerm('');
    };

    // Handle cell click in edit mode
    const handleCellClick = (bhakt, year, month) => {
        if (!isEditMode) return;
        
        // Convert month name to number (Jan=1, Feb=2, etc.)
        const monthNumber = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month) + 1;
        
        const originalData = bhakt.donations?.[year]?.[month] || { isPaid: false, amount: 0 };
        const currentValue = typeof originalData === 'boolean' 
            ? getEditValue(bhakt.id, year, monthNumber, 'is_paid', originalData)
            : getEditValue(bhakt.id, year, monthNumber, 'is_paid', originalData.isPaid);
        
        // When marking as paid, store the current monthly_donation_amount
        const newPaidStatus = !currentValue;
        const amountToStore = newPaidStatus ? bhakt.monthly_donation_amount : (originalData.amount || 0);
        
        updateEditData(bhakt.id, bhakt.name, year, monthNumber, 'is_paid', newPaidStatus, amountToStore);
    };

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
            {/* Filter Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4">
                    {/* Filter Dropdown - Left aligned */}
                    <div className="flex items-center space-x-2">
                        <div className="relative" ref={filterDropdownRef}>
                            <button
                                onClick={() => setShowBhaktFilter(!showBhaktFilter)}
                                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                                </svg>
                                <span>Filter Bhakts</span>
                                <svg className={`w-4 h-4 transition-transform ${showBhaktFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        
                        {/* Clear Button - Right next to Filter */}
                        {selectedBhakts.length > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center space-x-1 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Clear</span>
                            </button>
                        )}
                            
                            {showBhaktFilter && (
                                <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                                    <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                                        <input
                                            ref={filterSearchRef}
                                            type="text"
                                            placeholder="Search bhakts..."
                                            value={bhaktSearchTerm}
                                            onChange={(e) => setBhaktSearchTerm(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {filteredBhakts.map((bhakt) => {
                                            const isSelected = selectedBhakts.some(selected => selected.id === bhakt.id);
                                            return (
                                                <div
                                                    key={bhakt.id}
                                                    onClick={() => toggleBhaktSelection(bhakt)}
                                                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${
                                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} // Handled by div click
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {bhakt.name}
                                                        </div>
                                                        {bhakt.alias_name && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {bhakt.alias_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right side - Edit controls and selected count */}
                    <div className="flex items-center space-x-2">
                        {/* Edit Mode Toggle */}
                        <button
                            onClick={toggleEditMode}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                isEditMode
                                    ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800'
                                    : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 '
                            }`}
                            disabled={saving}
                        >
                            {isEditMode ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Exit Edit</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit Mode</span>
                                </>
                            )}
                        </button>

                        {/* Save Button - Only visible in edit mode with changes */}
                        {isEditMode && hasUnsavedChanges && (
                            <button
                                onClick={saveChanges}
                                disabled={saving}
                                className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Save ({changesCount})</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* Selected count */}
                        {selectedBhakts.length > 0 && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                                {selectedBhakts.length} selected
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
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
                        {displayData.map((bhakt, idx) => (
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
                                    className={`sticky left-0 px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 z-20 ${
                                        hoveredRowId === bhakt.id 
                                            ? 'bg-gray-200 dark:bg-gray-600' 
                                            : idx % 2 === 0 
                                                ? 'bg-white dark:bg-gray-800' 
                                                : 'bg-gray-50 dark:bg-gray-750'
                                    }`} 
                                    style={{width: '250px', maxWidth: '250px', minWidth: '250px'}}
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
                                        const monthNumber = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month) + 1;
                                        const originalData = bhakt.donations?.[year]?.[month] || { isPaid: false, amount: 0 };
                                        const originalValue = typeof originalData === 'boolean' ? originalData : originalData.isPaid;
                                        const amount = typeof originalData === 'boolean' ? 0 : (originalData.amount || 0);
                                        const isDonated = isEditMode 
                                            ? getEditValue(bhakt.id, year, monthNumber, 'is_paid', originalValue)
                                            : originalValue;
                                        const isModified = isCellModified(bhakt.id, year, monthNumber, 'is_paid');
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
                                                <div className="flex flex-col items-center justify-center space-y-0.5">
                                                    <div
                                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center shadow-sm relative ${
                                                            isEditMode ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                                                        } ${
                                                            isDonated
                                                                ? 'bg-green-500 border-green-500 text-white shadow-md'
                                                                : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                                                        } ${
                                                            isModified ? 'ring-2 ring-orange-400 ring-offset-1' : ''
                                                        }`}
                                                        title={isEditMode 
                                                            ? `${month} ${year} - Click to ${isDonated ? 'mark as unpaid' : 'mark as paid'}${isModified ? ' (Modified)' : ''}`
                                                            : `${month} ${year} - ${isDonated ? 'Paid' : 'Not paid'} (Read-only - Use Add Bhiksha Entry)`
                                                        }
                                                        onClick={() => handleCellClick(bhakt, year, month)}
                                                    >
                                                        {isDonated && (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        {/* Modified indicator */}
                                                        {isModified && (
                                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                                                        )}
                                                    </div>
                                                    {/* Display amount if donated */}
                                                    {isDonated && amount > 0 && (
                                                        <div className="text-[10px] font-medium text-green-700 dark:text-green-400 leading-none">
                                                            ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                        </div>
                                                    )}
                                                </div>
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
                    <span className="font-medium">Total Bhakts: {displayData.length}</span>
                    <span className="hidden sm:inline">
                        {isEditMode 
                            ? 'Edit Mode: Click cells to toggle payment status - Don\'t forget to save!'
                            : 'Transaction-based payment tracking - Use "Add Bhiksha Entry" to record payments'
                        }
                    </span>
                    <div className="flex items-center space-x-4">
                        <span className={`font-medium ${
                            isEditMode 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-blue-600 dark:text-blue-400'
                        }`}>
                            Mode: {isEditMode ? 'Edit' : 'Read-Only'}
                            {hasUnsavedChanges && ` (${changesCount} unsaved)`}
                        </span>
                        <span className="font-medium">
                            Years: {years.length > 0 ? `${Math.min(...years)}${years.length > 1 ? ' - ' + Math.max(...years) : ''}` : 'None'}
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
