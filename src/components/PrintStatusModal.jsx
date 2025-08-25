import { useState, useEffect, useRef } from 'react';
import SimpleModal from './SimpleModal';
import { useBhaktData } from '../hooks/useBhaktData';

const PrintStatusModal = ({ isOpen, onClose }) => {
    const { bhaktData } = useBhaktData();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const [formData, setFormData] = useState({
        selectedBhakt: '',
        reportType: 'current', // 'current' or 'custom'
        fromMonth: currentMonth,
        fromYear: currentYear,
        toMonth: currentMonth,
        toYear: currentYear
    });

    const [filteredBhakts, setFilteredBhakts] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    const years = [2023, 2024, 2025, 2026, 2027];

    // Filter bhakts based on search term
    const handleSearchChange = (value) => {
        setSearchTerm(value);
        if (value.trim()) {
            const filtered = bhaktData.filter(bhakt => 
                bhakt.name.toLowerCase().includes(value.toLowerCase()) ||
                (bhakt.alias_name && bhakt.alias_name.toLowerCase().includes(value.toLowerCase()))
            );
            setFilteredBhakts(filtered);
            setShowDropdown(true);
        } else {
            // Show all bhakts when search is empty
            setFilteredBhakts(bhaktData);
            setShowDropdown(true);
        }
    };

    const handleInputFocus = () => {
        // Show all bhakts when focusing on empty field
        if (!searchTerm.trim()) {
            setFilteredBhakts(bhaktData);
            setShowDropdown(true);
        } else {
            handleSearchChange(searchTerm);
        }
    };

    const handleBhaktSelect = (bhakt) => {
        setFormData(prev => ({ ...prev, selectedBhakt: bhakt.id }));
        setSearchTerm(bhakt.name);
        setShowDropdown(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Month') ? parseInt(value) : value
        }));
    };

    const handleAction = (actionType) => {
        // Validate form
        if (!formData.selectedBhakt) {
            alert('Please select a bhakt');
            return;
        }

        if (formData.reportType === 'custom') {
            const fromDate = new Date(formData.fromYear, formData.fromMonth - 1);
            const toDate = new Date(formData.toYear, formData.toMonth - 1);
            
            if (fromDate > toDate) {
                alert('From date cannot be later than To date');
                return;
            }
        }

        const selectedBhakt = bhaktData.find(b => b.id === formData.selectedBhakt);
        const bhaktName = selectedBhakt?.name || 'Unknown';

        let message = `${actionType} for: ${bhaktName}\nReport Type: ${formData.reportType}`;
        
        if (formData.reportType === 'custom') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const fromMonthName = monthNames[formData.fromMonth - 1];
            const toMonthName = monthNames[formData.toMonth - 1];
            message += `\nPeriod: ${fromMonthName} ${formData.fromYear} to ${toMonthName} ${formData.toYear}`;
        }

        alert(message);
        
        // TODO: Implement actual functionality
        console.log(`${actionType} action:`, { formData, selectedBhakt });
        
        onClose();
    };

    const getSelectedBhaktName = () => {
        if (formData.selectedBhakt) {
            const bhakt = bhaktData.find(b => b.id === formData.selectedBhakt);
            return bhakt?.name || '';
        }
        return searchTerm;
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Print Bhakt Status">
            <div className="space-y-6">
                {/* Bhakt Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Bhakt
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        <input
                            type="text"
                            value={getSelectedBhaktName()}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onFocus={handleInputFocus}
                            placeholder="Search bhakt by name..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                        
                        {showDropdown && filteredBhakts.length > 0 && (
                            <div className="absolute z-50 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                                {filteredBhakts.map(bhakt => (
                                    <div
                                        key={bhakt.id}
                                        onClick={() => handleBhaktSelect(bhakt)}
                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-gray-100"
                                    >
                                        <div className="font-medium">{bhakt.name}</div>
                                        {bhakt.alias_name && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">({bhakt.alias_name})</div>
                                        )}
                                        <div className="text-sm text-green-600 dark:text-green-400">₹{bhakt.monthly_donation_amount.toLocaleString()}/month</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Report Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Report Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="relative">
                            <input
                                type="radio"
                                name="reportType"
                                value="current"
                                checked={formData.reportType === 'current'}
                                onChange={handleInputChange}
                                className="sr-only"
                            />
                            <div className={`cursor-pointer px-4 py-3 text-center border rounded-md transition-all ${
                                formData.reportType === 'current'
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}>
                                <div className="font-medium">Current Status</div>
                                <div className="text-sm opacity-75">All available data</div>
                            </div>
                        </label>
                        <label className="relative">
                            <input
                                type="radio"
                                name="reportType"
                                value="custom"
                                checked={formData.reportType === 'custom'}
                                onChange={handleInputChange}
                                className="sr-only"
                            />
                            <div className={`cursor-pointer px-4 py-3 text-center border rounded-md transition-all ${
                                formData.reportType === 'custom'
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}>
                                <div className="font-medium">Custom Duration</div>
                                <div className="text-sm opacity-75">Specific time range</div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Custom Duration Fields */}
                {formData.reportType === 'custom' && (
                    <>
                        {/* From Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                From Date
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
                                    <select
                                        name="fromMonth"
                                        value={formData.fromMonth}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {months.map(month => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
                                    <select
                                        name="fromYear"
                                        value={formData.fromYear}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* To Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                To Date
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
                                    <select
                                        name="toMonth"
                                        value={formData.toMonth}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {months.map(month => (
                                            <option key={month.value} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
                                    <select
                                        name="toYear"
                                        value={formData.toYear}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Actions
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleAction('Generate & Copy')}
                            className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            Generate & Copy
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAction('Print Receipt')}
                            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            Print Receipt
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAction('WhatsApp')}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                        >
                            WhatsApp
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAction('Email')}
                            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            Email
                        </button>
                    </div>
                </div>

                {/* Cancel Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </SimpleModal>
    );
};

export default PrintStatusModal;
