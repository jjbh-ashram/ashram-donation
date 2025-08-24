import { useState } from 'react';
import SimpleModal from './SimpleModal';

const AddYearModal = ({ isOpen, onClose, onAddYear, existingYears }) => {
    const [newYear, setNewYear] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const year = parseInt(newYear);
        
        // Validation
        if (isNaN(year)) {
            setError('Please enter a valid number');
            return;
        }
        
        if (year < 2020 || year > 2050) {
            setError('Year must be between 2020 and 2050');
            return;
        }
        
        if (existingYears.includes(year)) {
            setError(`Year ${year} already exists`);
            return;
        }
        
        // Call the parent function to add the year
        onAddYear(year);
        
        // Reset form and close
        setNewYear('');
        setError('');
        onClose();
    };

    const handleClose = () => {
        setNewYear('');
        setError('');
        onClose();
    };

    const currentYear = new Date().getFullYear();
    const suggestedYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear;

    return (
        <SimpleModal isOpen={isOpen} onClose={handleClose} title="Add New Year">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Year *
                    </label>
                    <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        placeholder={`e.g., ${suggestedYear}`}
                        min="2020"
                        max="2050"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                    />
                    {error && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Existing years: {existingYears.join(', ')}</p>
                    <p>Suggested next year: {suggestedYear}</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Add Year
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default AddYearModal;
