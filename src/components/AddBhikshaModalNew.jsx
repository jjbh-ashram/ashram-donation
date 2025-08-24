import { useState } from 'react';
import Modal from './Modal';
import { useBhaktData } from '../hooks/useBhaktData';

const AddBhikshaModal = ({ isOpen, onClose }) => {
    const { bhaktData, addBhikshaEntry } = useBhaktData();
    const [formData, setFormData] = useState({
        bhaktName: '',
        month: '',
        year: new Date().getFullYear(),
        amount: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await addBhikshaEntry(
                formData.bhaktName,
                formData.month,
                formData.year,
                formData.amount,
                formData.notes
            );

            if (result.success) {
                onClose();
                setFormData({
                    bhaktName: '',
                    month: '',
                    year: new Date().getFullYear(),
                    amount: '',
                    notes: ''
                });
            } else {
                alert('Error adding bhiksha entry: ' + result.error);
            }
        } catch (error) {
            console.error('Error submitting bhiksha entry:', error);
            alert('Error adding bhiksha entry');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedBhakt = bhaktData.find(b => b.name === formData.bhaktName);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Bhiksha Entry">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bhakt Name
                    </label>
                    <select
                        name="bhaktName"
                        value={formData.bhaktName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                    >
                        <option value="">Select Bhakt</option>
                        {bhaktData.map(bhakt => (
                            <option key={bhakt.id} value={bhakt.name}>
                                {bhakt.name} - ₹{bhakt.monthly_donation_amount}
                            </option>
                        ))}
                    </select>
                    {selectedBhakt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Default amount: ₹{selectedBhakt.monthly_donation_amount}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Month
                        </label>
                        <select
                            name="month"
                            value={formData.month}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        >
                            <option value="">Select Month</option>
                            {months.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Year
                        </label>
                        <select
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        >
                            {[2024, 2025, 2026, 2027].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount (Optional)
                    </label>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder={selectedBhakt ? `Default: ${selectedBhakt.monthly_donation_amount}` : "0.00"}
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Any additional notes..."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Adding...' : 'Add Bhiksha'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddBhikshaModal;
