import { useState, useCallback, useEffect } from 'react';
import SimpleModal from './SimpleModal';
import { supabase } from '../lib/supabase';

const AddBhaktModal = ({ isOpen, onClose, onBhaktAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        alias_name: '',
        phone_number: '',
        email: '',
        address: '',
        monthly_donation_amount: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [nameValidation, setNameValidation] = useState({
        isChecking: false,
        isDuplicate: false,
        existingBhakt: null,
        message: ''
    });

    // Debounced function to check for duplicate names
    const checkDuplicateName = useCallback(async (name) => {
        if (!name.trim()) {
            setNameValidation({ isChecking: false, isDuplicate: false, existingBhakt: null, message: '' });
            return;
        }

        setNameValidation(prev => ({ ...prev, isChecking: true, message: 'Checking...' }));

        try {
            // Check for exact name match or alias match
            const { data, error } = await supabase
                .from('bhakt')
                .select('name, alias_name, phone_number, monthly_donation_amount')
                .or(`name.ilike.${name.trim()},alias_name.ilike.${name.trim()}`)
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const existingBhakt = data[0];
                setNameValidation({
                    isChecking: false,
                    isDuplicate: true,
                    existingBhakt,
                    message: `⚠️ A bhakt with this name already exists: "${existingBhakt.name}"${existingBhakt.alias_name ? ` (alias: ${existingBhakt.alias_name})` : ''} - ₹${existingBhakt.monthly_donation_amount}/month`
                });
            } else {
                setNameValidation({
                    isChecking: false,
                    isDuplicate: false,
                    existingBhakt: null,
                    message: '✅ Name is available'
                });
            }
        } catch (error) {
            console.error('Error checking duplicate name:', error);
            setNameValidation({
                isChecking: false,
                isDuplicate: false,
                existingBhakt: null,
                message: '❌ Error checking name availability'
            });
        }
    }, []);

    // Debounce the name checking
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            checkDuplicateName(formData.name);
        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);
    }, [formData.name, checkDuplicateName]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            alert('Name is required');
            return;
        }

        // Check for duplicate name
        if (nameValidation.isDuplicate) {
            alert('Cannot add bhakt: A bhakt with this name already exists. Please use a different name.');
            return;
        }

        if (!formData.monthly_donation_amount || parseFloat(formData.monthly_donation_amount) <= 0) {
            alert('Monthly donation amount is required and must be greater than 0');
            return;
        }

        setIsLoading(true);
        
        try {
            // Prepare data for insertion
            const insertData = {
                name: formData.name.trim(),
                alias_name: formData.alias_name.trim() || null,
                phone_number: formData.phone_number.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                monthly_donation_amount: parseFloat(formData.monthly_donation_amount)
            };

            // Insert into Supabase
            const { error } = await supabase
                .from('bhakt')
                .insert([insertData])
                .select();

            if (error) throw error;

            // Success feedback
            alert('Bhakt added successfully!');
            
            // Reset form
            setFormData({
                name: '',
                alias_name: '',
                phone_number: '',
                email: '',
                address: '',
                monthly_donation_amount: ''
            });

            // Notify parent component to refresh data
            if (onBhaktAdded) {
                onBhaktAdded();
            }

            // Close modal
            onClose();

        } catch (error) {
            console.error('Error adding bhakt:', error);
            alert('Error adding bhakt: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Add New Bhakt">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            nameValidation.isDuplicate 
                                ? 'border-red-500 dark:border-red-400' 
                                : nameValidation.message && !nameValidation.isDuplicate && !nameValidation.isChecking
                                    ? 'border-green-500 dark:border-green-400'
                                    : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                        disabled={isLoading}
                    />
                    {/* Validation message */}
                    {nameValidation.message && (
                        <div className={`mt-1 text-sm ${
                            nameValidation.isDuplicate 
                                ? 'text-red-600 dark:text-red-400' 
                                : nameValidation.isChecking
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-green-600 dark:text-green-400'
                        }`}>
                            {nameValidation.message}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Alias Name
                    </label>
                    <input
                        type="text"
                        name="alias_name"
                        value={formData.alias_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                    </label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monthly Donation Amount *
                    </label>
                    <input
                        type="number"
                        name="monthly_donation_amount"
                        value={formData.monthly_donation_amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                        disabled={isLoading}
                        placeholder="Enter amount in rupees"
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isLoading || nameValidation.isDuplicate || nameValidation.isChecking
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={isLoading || nameValidation.isDuplicate || nameValidation.isChecking}
                    >
                        {isLoading ? 'Adding...' : 
                         nameValidation.isChecking ? 'Checking name...' :
                         nameValidation.isDuplicate ? 'Name already exists' :
                         'Add Bhakt'}
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default AddBhaktModal;
