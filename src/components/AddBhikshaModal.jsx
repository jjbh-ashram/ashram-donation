import { useState, useEffect, useRef } from 'react';
import SimpleModal from './SimpleModal';
import { useBhaktData } from '../hooks/useBhaktData';

const AddBhikshaModal = ({ isOpen, onClose }) => {
    const { bhaktData, loading } = useBhaktData();
    const [formData, setFormData] = useState({
        bhaktName: '',
        month: '',
        year: new Date().getFullYear(),
        amount: '',
        notes: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredBhakts, setFilteredBhakts] = useState([]);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Filter bhakts based on search term
    useEffect(() => {
        if (!bhaktData || bhaktData.length === 0) {
            setFilteredBhakts([]);
            return;
        }

        const filtered = bhaktData.filter(bhakt => {
            const name = bhakt.name?.toLowerCase() || '';
            const aliasName = bhakt.alias_name?.toLowerCase() || '';
            const search = searchTerm.toLowerCase();
            
            return name.includes(search) || aliasName.includes(search);
        });

        setFilteredBhakts(filtered);
    }, [bhaktData, searchTerm]);

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

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setShowDropdown(false);
            setFormData({
                bhaktName: '',
                month: '',
                year: new Date().getFullYear(),
                amount: '',
                notes: ''
            });
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Simple validation
        if (!formData.bhaktName.trim()) {
            alert('Bhakt name is required');
            return;
        }
        if (!formData.month) {
            alert('Month is required');
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            alert('Valid amount is required');
            return;
        }

        // For now, just show the data in an alert
        alert(`Bhiksha data:\n${JSON.stringify(formData, null, 2)}`);
        
        // Reset form and close modal
        setFormData({
            bhaktName: '',
            month: '',
            year: new Date().getFullYear(),
            amount: '',
            notes: ''
        });
        setSearchTerm('');
        onClose();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setFormData(prev => ({ ...prev, bhaktName: value }));
        setShowDropdown(true);
    };

    const handleBhaktSelect = (bhakt) => {
        const selectedName = bhakt.alias_name || bhakt.name;
        setFormData(prev => ({ ...prev, bhaktName: selectedName }));
        setSearchTerm(selectedName);
        setShowDropdown(false);
    };

    const handleSearchFocus = () => {
        setShowDropdown(true);
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Add Bhiksha Entry">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bhakt Name *
                    </label>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        placeholder="Search bhakt name..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                        autoComplete="off"
                    />
                    
                    {/* Dropdown */}
                    {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {loading ? (
                                <div className="px-3 py-2 text-gray-500 dark:text-gray-400">Loading bhakts...</div>
                            ) : filteredBhakts.length > 0 ? (
                                filteredBhakts.map((bhakt) => (
                                    <button
                                        key={bhakt.id}
                                        type="button"
                                        onClick={() => handleBhaktSelect(bhakt)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                                    >
                                        <div className="text-gray-900 dark:text-white font-medium">
                                            {bhakt.name}
                                        </div>
                                        {bhakt.alias_name && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                ({bhakt.alias_name})
                                            </div>
                                        )}
                                        <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                                            ₹{bhakt.monthly_donation_amount?.toLocaleString() || '0'}/month
                                        </div>
                                    </button>
                                ))
                            ) : searchTerm ? (
                                <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                    No bhakts found for "{searchTerm}"
                                </div>
                            ) : (
                                <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                    Type to search bhakts
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Month *
                    </label>
                    <select
                        name="month"
                        value={formData.month}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                    >
                        <option value="">Select month</option>
                        {months.map((month) => (
                            <option key={month} value={month}>
                                {month}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Year
                    </label>
                    <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        min="2020"
                        max="2050"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount *
                    </label>
                    <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Optional notes"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
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
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        Add Bhiksha
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default AddBhikshaModal;
