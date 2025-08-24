import { useState, useEffect } from 'react';
import SimpleModal from './SimpleModal';
import { supabase } from '../lib/supabase';

const BhaktDetailsModal = ({ isOpen, onClose, bhakt, onBhaktUpdated }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: bhakt?.name || '',
        alias_name: bhakt?.alias_name || '',
        phone_number: bhakt?.phone_number || '',
        email: bhakt?.email || '',
        address: bhakt?.address || '',
        monthly_donation_amount: bhakt?.monthly_donation_amount || ''
    });

    // Update form data when bhakt prop changes
    useEffect(() => {
        if (bhakt) {
            const newFormData = {
                name: bhakt.name || '',
                alias_name: bhakt.alias_name || '',
                phone_number: bhakt.phone_number || '',
                email: bhakt.email || '',
                address: bhakt.address || '',
                monthly_donation_amount: bhakt.monthly_donation_amount || ''
            };
            setFormData(newFormData);
            // Reset editing mode when bhakt changes
            setIsEditing(false);
        }
    }, [bhakt]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdate = async () => {
        if (!bhakt?.id) return;

        setIsLoading(true);
        try {
            // Prepare data for update
            const updateData = {
                name: formData.name.trim(),
                alias_name: formData.alias_name.trim() || null,
                phone_number: formData.phone_number.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                monthly_donation_amount: parseFloat(formData.monthly_donation_amount) || 0
            };

            // Update in Supabase
            const { data, error } = await supabase
                .from('bhakt')
                .update(updateData)
                .eq('id', bhakt.id)
                .select();

            if (error) throw error;

            // Success feedback
            alert('Bhakt details updated successfully!');
            
            // Switch back to view mode
            setIsEditing(false);
            
            // Close modal and notify parent component to refresh data
            if (onBhaktUpdated) {
                // Close the modal first
                if (onClose) {
                    onClose();
                }
                // Then trigger data refresh
                onBhaktUpdated();
            }

        } catch (error) {
            console.error('Error updating bhakt:', error);
            alert('Error updating bhakt details: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset form data to original values
        setFormData({
            name: bhakt?.name || '',
            alias_name: bhakt?.alias_name || '',
            phone_number: bhakt?.phone_number || '',
            email: bhakt?.email || '',
            address: bhakt?.address || '',
            monthly_donation_amount: bhakt?.monthly_donation_amount || ''
        });
        setIsEditing(false);
    };

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    if (!bhakt) return null;

    return (
        <SimpleModal isOpen={isOpen} onClose={handleClose} title={`Bhakt Details - ${bhakt.name}`}>
            <div className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                    </label>
                    {isEditing ? (
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                            {formData.name}
                        </div>
                    )}
                </div>

                {/* Alias Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Alias Name
                    </label>
                    {isEditing ? (
                        <input
                            type="text"
                            name="alias_name"
                            value={formData.alias_name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                            {formData.alias_name || 'Not set'}
                        </div>
                    )}
                </div>

                {/* Phone Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                    </label>
                    {isEditing ? (
                        <input
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                            {formData.phone_number || 'Not set'}
                        </div>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    {isEditing ? (
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                            {formData.email || 'Not set'}
                        </div>
                    )}
                </div>

                {/* Address */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                    </label>
                    {isEditing ? (
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white min-h-[80px]">
                            {formData.address || 'Not set'}
                        </div>
                    )}
                </div>

                {/* Monthly Donation Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monthly Donation Amount
                    </label>
                    {isEditing ? (
                        <input
                            type="number"
                            name="monthly_donation_amount"
                            value={formData.monthly_donation_amount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    ) : (
                        <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white">
                            ₹{formData.monthly_donation_amount || '0.00'}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdate}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Updating...' : 'Update'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit Details
                            </button>
                        </>
                    )}
                </div>
            </div>
        </SimpleModal>
    );
};

export default BhaktDetailsModal;
