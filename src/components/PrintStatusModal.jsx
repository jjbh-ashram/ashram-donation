import { useState } from 'react';
import SimpleModal from './SimpleModal';

const PrintStatusModal = ({ isOpen, onClose }) => {
    const [options, setOptions] = useState({
        year: '2025',
        includeAmounts: true,
        includeNotes: false,
        format: 'pdf'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // For now, just show the options in an alert
        alert(`Print Status Report:\n${JSON.stringify(options, null, 2)}`);
        
        onClose();
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOptions(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Print Status Report">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Year
                    </label>
                    <select
                        name="year"
                        value={options.year}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="2023">2023</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Format
                    </label>
                    <select
                        name="format"
                        value={options.format}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="pdf">PDF</option>
                        <option value="excel">Excel</option>
                        <option value="csv">CSV</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="includeAmounts"
                            name="includeAmounts"
                            checked={options.includeAmounts}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="includeAmounts" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Include donation amounts
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="includeNotes"
                            name="includeNotes"
                            checked={options.includeNotes}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="includeNotes" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Include notes
                        </label>
                    </div>
                </div>

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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Generate Report
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default PrintStatusModal;
