import { useState } from 'react';
import SimpleModal from './SimpleModal';
import { useYearConfig } from '../hooks/useYearConfig';

const AddYearModal = ({ isOpen, onClose, onRefreshYears, existingYears }) => {
    const [newYear, setNewYear] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addYear } = useYearConfig();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const year = parseInt(newYear);
        
        // Validation
        if (isNaN(year)) {
            setError('Please enter a valid number');
            setIsLoading(false);
            return;
        }
        
        if (year < 2020 || year > 2050) {
            setError('Year must be between 2020 and 2050');
            setIsLoading(false);
            return;
        }
        
        if (existingYears.includes(year)) {
            setError(`Year ${year} already exists`);
            setIsLoading(false);
            return;
        }
        
        try {
            await addYear(year);
            // Call refresh callback to update parent component
            if (onRefreshYears) {
                await onRefreshYears();
            }
            
            // Reset form and close
            setNewYear('');
            setError('');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to add year');
        } finally {
            setIsLoading(false);
        }
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year *
                    </label>
                    <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        placeholder={`e.g., ${suggestedYear}`}
                        min="2020"
                        max="2050"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                    />
                    {error && (
                        <p className="mt-1 text-sm text-red-600">
                            {error}
                        </p>
                    )}
                </div>

                <div className="text-sm text-gray-600">
                    <p>Existing years: {existingYears.join(', ')}</p>
                    <p>Suggested next year: {suggestedYear}</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Adding...' : 'Add Year'}
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default AddYearModal;
