import { useState, useEffect, useRef } from 'react';
import SimpleModal from './SimpleModal';
import { useBhaktData } from '../hooks/useBhaktData';

const PrintStatusModal = ({ isOpen, onClose }) => {
    const { bhaktData, refreshData } = useBhaktData();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    

    const [formData, setFormData] = useState({
        selectedBhakt: '',
        reportType: 'current'
    });
    const [step, setStep] = useState(1); // 1: form, 2: result
    const [loading, setLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState(null); // Placeholder for generated data
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const [filteredBhakts, setFilteredBhakts] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Refresh bhakt data when modal opens
    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen, refreshData]);

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


    // Step 1: Generate button handler
    const handleGenerate = async () => {
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
        setLoading(true);
        setTimeout(() => {
            // Only current status implemented for now
            if (formData.reportType === 'current') {
                const selectedBhakt = bhaktData.find(b => b.id === formData.selectedBhakt);
                if (!selectedBhakt) {
                    setGeneratedData({ error: 'Bhakt not found.' });
                } else {
                    // Format receipt message
                    const receipt = {
                        name: selectedBhakt.name,
                        monthly: selectedBhakt.monthly_donation_amount,
                        lastPayment: selectedBhakt.last_payment_date ? new Date(selectedBhakt.last_payment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
                        balance: selectedBhakt.carry_forward_balance || 0,
                        status: selectedBhakt.payment_status || 'N/A',
                        phone: selectedBhakt.phone_number,
                        email: selectedBhakt.email
                    };
                    // Receipt text for copy/share/whatsapp/email
                    const receiptText =
                  `🧾 *Bhiksha Status*\n\n*Name:* ${receipt.name}\n*Monthly Donation:* ₹${receipt.monthly.toLocaleString()}\n*Last Payment Date:* ${receipt.lastPayment}\n*Extra Balance:* ₹${receipt.balance.toLocaleString()}\n*Status:* ${receipt.status}\n`;
                    setGeneratedData({ receipt, receiptText });
                }
            } else {
                setGeneratedData({ error: 'Custom duration not implemented yet.' });
            }
            setLoading(false);
            setStep(2);
        }, 1200);
    };

    // Step 2: Action buttons
    const handleAction = async (actionType) => {
        if (!generatedData || !generatedData.receiptText) return;
        if (actionType === 'Copy') {
            navigator.clipboard.writeText(generatedData.receiptText);
            alert('Receipt copied to clipboard!');
        } else if (actionType === 'Share') {
            if (navigator.share) {
                navigator.share({ text: generatedData.receiptText });
            } else {
                alert('Share not supported on this device.');
            }
        } else if (actionType === 'Email') {
            const email = generatedData.receipt.email;
            if (email) {
                setIsSendingEmail(true)
                try {
                    const resp = await fetch('/api/send-bhakt-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bhakt_id: formData.selectedBhakt })
                    })
                    const data = await resp.json()
                    if (resp.ok && data.success) {
                        alert('Email sent successfully')
                    } else {
                        alert('Failed to send email: ' + (data.error || resp.statusText))
                    }
                } catch (err) {
                    alert('Error sending email: ' + (err.message || err))
                } finally {
                    setIsSendingEmail(false)
                }
            }
        } else if (actionType === 'Print') {
            // Print the receipt
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<pre style='font-size:1.2em'>${generatedData.receiptText.replace(/\n/g, '<br>')}</pre>`);
            printWindow.document.close();
            printWindow.print();
        }
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
                {step === 1 && (
                    <>
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
                        {/* <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Report Type
                            </label>
                            <div className="grid grid-cols-1">
                                <div className="px-4 py-3 text-center border rounded-md bg-blue-500 text-white">
                                    <div className="font-medium">Current Status</div>
                                    <div className="text-sm opacity-75">Showing latest available data</div>
                                </div>
                            </div>
                        </div> */}

                        {/* Custom Duration Fields */}
                        {/* Custom duration removed - only Current Status supported */}

                        {/* Step 1: Generate Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={handleGenerate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center"><span className="loader mr-2"></span>Generating...</span>
                                ) : (
                                    'Generate'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        {/* Step 2: Generated Data Receipt */}
                        <div className="min-h-[120px] flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4">
                            {generatedData?.error ? (
                                <span className="text-red-500">{generatedData.error}</span>
                            ) : (
                                <div className="w-full max-w-md">
                                    <div className="text-lg font-bold mb-2 text-center">🧾 Donation Receipt</div>
                                    <div className="mb-1"><span className="font-semibold">Name:</span> {generatedData.receipt.name}</div>
                                    <div className="mb-1"><span className="font-semibold">Monthly Donation:</span> <span className="text-green-600 dark:text-green-400">₹{generatedData.receipt.monthly.toLocaleString()}</span></div>
                                    <div className="mb-1"><span className="font-semibold">Last Payment Date:</span> {generatedData.receipt.lastPayment}</div>
                                    <div className="mb-1"><span className="font-semibold">Extra Balance:</span> <span className="text-blue-600 dark:text-blue-400">₹{generatedData.receipt.balance.toLocaleString()}</span></div>
                                    <div className="mb-1"><span className="font-semibold">Status:</span> <span className="font-bold text-purple-700 dark:text-purple-400">{generatedData.receipt.status}</span></div>
                                </div>
                            )}
                        </div>
                        {/* Step 2: Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-6">
                            <button
                                type="button"
                                onClick={() => handleAction('Copy')}
                                className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                disabled={!!generatedData?.error}
                            >
                                Copy
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction('Print')}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={!!generatedData?.error}
                            >
                                Print
                            </button>
                            {/* WhatsApp button only if phone number exists */}
                            {generatedData?.receipt?.phone && (
                                <button
                                    type="button"
                                    onClick={() => handleAction('WhatsApp')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                                >
                                    WhatsApp
                                </button>
                            )}
                            {/* Email button only if email exists */}
                            {generatedData?.receipt?.email && (
                                <button
                                    type="button"
                                    onClick={() => handleAction('Email')}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    Email
                                </button>
                            )}
                            {/* Share button always shown */}
                            <button
                                type="button"
                                onClick={() => handleAction('Share')}
                                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 col-span-2"
                                disabled={!!generatedData?.error}
                            >
                                Share
                            </button>
                        </div>
                        {/* Back/Close/Generate New Button */}
                        <div className="flex justify-end pt-4 space-x-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setGeneratedData(null);
                                    setLoading(false);
                                    setSearchTerm('');
                                    setFormData('');
                                }}
                                className="px-4 py-2 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-700"
                            >
                                Generate New
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </SimpleModal>
    );
};

export default PrintStatusModal;
