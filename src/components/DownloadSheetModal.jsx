import { useState } from 'react';
import SimpleModal from './SimpleModal';

const DownloadSheetModal = ({ isOpen, onClose }) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const [formData, setFormData] = useState({
        fromMonth: currentMonth,
        fromYear: currentYear,
        toMonth: currentMonth,
        toYear: currentYear,
        format: 'PDF'
    });

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
    const formats = ['PDF', 'CSV', 'EXCEL'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Month') ? parseInt(value) : value
        }));
    };

    const handlePrint = (e) => {
        e.preventDefault();
        
        // Validate date range
        const fromDate = new Date(formData.fromYear, formData.fromMonth - 1);
        const toDate = new Date(formData.toYear, formData.toMonth - 1);
        
        if (fromDate > toDate) {
            alert('From date cannot be later than To date');
            return;
        }

        // For now, show the download options
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fromMonthName = monthNames[formData.fromMonth - 1];
        const toMonthName = monthNames[formData.toMonth - 1];
        
        alert(`Download Sheet:\nFrom: ${fromMonthName} ${formData.fromYear}\nTo: ${toMonthName} ${formData.toYear}\nFormat: ${formData.format}`);
        
        // TODO: Implement actual download functionality
        console.log('Download parameters:', formData);
        
        onClose();
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Download Sheet">
            <form onSubmit={handlePrint} className="space-y-6">
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
                                required
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
                                required
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
                                required
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
                                required
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

                {/* Format Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Format
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {formats.map(format => (
                            <label key={format} className="relative">
                                <input
                                    type="radio"
                                    name="format"
                                    value={format}
                                    checked={formData.format === format}
                                    onChange={handleInputChange}
                                    className="sr-only"
                                />
                                <div className={`cursor-pointer px-4 py-3 text-center border rounded-md transition-all ${
                                    formData.format === format
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}>
                                    <div className="font-medium">{format}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Print Sheet
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default DownloadSheetModal;
