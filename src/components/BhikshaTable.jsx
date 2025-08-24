import { useBhaktData } from '../hooks/useBhaktData';

const BhikshaTable = () => {
    const { bhaktData, loading, error, toggleDonation } = useBhaktData();
    
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const years = [2025, 2026, 2027, 2028, 2029, 2030];

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

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            {/* Table Container - Full horizontal scroll like Excel */}
            <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-max table-fixed">
                    <thead>
                        {/* Year Headers */}
                        <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 z-10" style={{width: '250px', maxWidth: '250px', minWidth: '250px'}}>
                                Names
                            </th>
                            {years.map((year, index) => {
                                const colors = getYearColors(year, index);
                                return (
                                    <th key={year} colSpan={12} className={`px-2 py-2 text-center text-lg font-bold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${colors.header}`}>
                                        {year}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Month Headers */}
                        <tr className="bg-gray-100 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-600">
                            <th className="sticky left-0 bg-gray-100 dark:bg-gray-600 px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600 z-10" style={{width: '250px', maxWidth: '250px', minWidth: '250px'}}>
                                Amount
                            </th>
                            {years.map((year, yearIndex) => 
                                months.map(month => {
                                    const colors = getYearColors(year, yearIndex);
                                    return (
                                        <th key={`${year}-${month}`} className={`px-2 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[50px] border-r ${colors.border} ${colors.bg}`}>
                                            {month}
                                        </th>
                                    );
                                })
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {bhaktData.map((bhakt, idx) => (
                            <tr key={bhakt.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'
                            }`}>
                                <td className="sticky left-0 bg-inherit px-2 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 z-10" style={{width: '250px', maxWidth: '250px', minWidth: '250px'}}>
                                    <div className="group">
                                        <div className="font-medium text-xs truncate">{bhakt.name}</div>
                                        {bhakt.alias_name && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                ({bhakt.alias_name})
                                            </div>
                                        )}
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium truncate">
                                            ₹{bhakt.monthly_donation_amount}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                                            Click months
                                        </div>
                                    </div>
                                </td>
                                {years.map((year, yearIndex) => 
                                    months.map(month => {
                                        const isDonated = bhakt.donations?.[year]?.[month] || false;
                                        const colors = getYearColors(year, yearIndex);
                                        return (
                                            <td key={`${year}-${month}`} className={`border-r ${colors.border} p-2 text-center ${colors.bg}`}>
                                                <button
                                                    onClick={() => toggleDonation(bhakt.id, year, month)}
                                                    className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center mx-auto ${
                                                        isDonated
                                                            ? 'bg-green-500 border-green-500 text-white'
                                                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:border-green-400 dark:hover:border-green-400'
                                                    }`}
                                                    title={`${month} ${year} - ${isDonated ? 'Donated' : 'Not donated'}`}
                                                >
                                                    {isDonated && (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 transition-colors">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <span>Total Bhakts: {bhaktData.length}</span>
                    <span>Click on month boxes to mark donations</span>
                    <span>Years: {years.join(', ')}</span>
                </div>
            </div>
        </div>
    );
};

export default BhikshaTable;
