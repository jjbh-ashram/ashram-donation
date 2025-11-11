import { useState, useEffect, useRef } from 'react';
import SimpleModal from './SimpleModal';
import Toast from './Toast';
import { useBhaktData } from '../hooks/useBhaktData';
import RecieptPdf from './RecieptPdf';

const AddBhikshaModal = ({ isOpen, onClose, onSuccess }) => {
    const { bhaktData, loading, addBhikshaEntryTransaction, refreshData } = useBhaktData();
    const [formData, setFormData] = useState({
        bhaktName: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0], // Today's date
        remarks: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredBhakts, setFilteredBhakts] = useState([]);
    const [toast, setToast] = useState(null);
    const [showStatus, setShowStatus] = useState(false);
    const [lastSubmittedName, setLastSubmittedName] = useState('');
    const [showPDF, setShowPDF] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submission
    
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

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
            // Refresh bhakt data to get latest monthly_donation_amount values
            refreshData();
            
            setSearchTerm('');
            setShowDropdown(false);
            setFormData({
                bhaktName: '',
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                remarks: ''
            });
            setShowStatus(false);
            setIsSubmitting(false); // Reset submitting state when modal opens
        }
    }, [isOpen, refreshData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        if (isSubmitting) {
            return;
        }
        
        // Simple validation
        if (!formData.bhaktName.trim()) {
            setToast({ message: 'Bhakt name is required', type: 'error' });
            return;
        }
        if (!formData.amount || formData.amount <= 0) {
            setToast({ message: 'Valid amount is required', type: 'error' });
            return;
        }
        if (!formData.paymentDate) {
            setToast({ message: 'Payment date is required', type: 'error' });
            return;
        }

        // Set loading state
        setIsSubmitting(true);

        try {
            const result = await addBhikshaEntryTransaction(
                formData.bhaktName,
                parseFloat(formData.amount),
                formData.paymentDate,
                formData.remarks
            );

            if (result.success) {
                // Create detailed success message
                let successMsg = `Payment recorded successfully! `;
                successMsg += `₹${formData.amount} on ${formData.paymentDate}. `;
                
                if (result.monthsCovered) {
                    successMsg += `Covers ${result.monthsCovered} month(s). `;
                }
                
                if (result.carryForward > 0) {
                    successMsg += `Carry-forward: ₹${result.carryForward.toFixed(2)}. `;
                }
                
                successMsg += `Auto-sync will assign to next unpaid months.`;
                
                setToast({ message: successMsg, type: 'success' });
                
                // Reset form and close modal after a delay
                setTimeout(() => {
                        // capture submitted name before clearing
                        setLastSubmittedName(formData.bhaktName);

                        // prepare receipt / generated data for actions (print/share/whatsapp/email)
                        try {
                            const selectedBhakt = (bhaktData || []).find(b => (b.name === formData.bhaktName) || (b.alias_name === formData.bhaktName));
                            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                            const fmtNumber = (n) => (n == null ? 0 : n).toLocaleString();
                            const fmtCurrency = (v) => {
                                if (v == null || v === '') return '₹0';
                                return `₹${Number(v).toLocaleString('en-IN')}`;
                            };

                            const receipt = {
                                name: selectedBhakt?.name || formData.bhaktName,
                                monthly: selectedBhakt?.monthly_donation_amount || 0,
                                lastPayment: selectedBhakt?.last_payment_date ? fmtDate(selectedBhakt.last_payment_date) : 'N/A',
                                balance: selectedBhakt?.carry_forward_balance || 0,
                                status: selectedBhakt?.payment_status || 'N/A',
                                phone: selectedBhakt?.phone || selectedBhakt?.phone_number || '',
                                email: selectedBhakt?.email || ''
                            };

                            const receiptText =
`🧾 *Donation Receipt*\n\n*Name:* ${receipt.name}\n*Monthly Donation:* ₹${fmtNumber(receipt.monthly)}\n*Last Payment Date:* ${receipt.lastPayment}\n*Extra Balance:* ₹${fmtNumber(receipt.balance)}\n*Status:* ${receipt.status}\n`;

                            setGeneratedData({ receipt, receiptText });
                        } catch (err) {
                            console.warn('Could not build generatedData', err);
                        }

                        setFormData({
                        bhaktName: '',
                        amount: '',
                        paymentDate: new Date().toISOString().split('T')[0],
                        remarks: ''
                    });
                    setSearchTerm('');
                    
                    // Trigger refresh in parent component
                    if (onSuccess) {
                        onSuccess();   
                    }
                    
                    onClose();
                    
                    setShowStatus(true);
                }, 2000);
                
            } else {
                setToast({ message: `Error: ${result.error}`, type: 'error' });
                setIsSubmitting(false); // Reset loading state on error
            }
        } catch (error) {
            console.error('Error submitting bhiksha entry:', error);
            setToast({ message: 'An error occurred while saving the entry. Please try again.', type: 'error' });
            setIsSubmitting(false); // Reset loading state on error
        }
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

    // Step 2: Action buttons
    const handleAction = (actionType) => {
        if (!generatedData || !generatedData.receiptText) return;
        if (actionType === 'Share') {
            if (navigator.share) {
                navigator.share({ text: generatedData.receiptText });
            } else {
                alert('Share not supported on this device.');
            }
            setShowPDF(true);
        } else if (actionType === 'WhatsApp') {
            const phone = generatedData.receipt.phone;
            if (phone) {
                const url = `https://wa.me/${phone}?text=${encodeURIComponent(generatedData.receiptText)}`;
                window.open(url, '_blank');
            }
        } else if (actionType === 'Email') {
            const email = generatedData.receipt.email;
            if (email) {
                const subject = encodeURIComponent('Donation Receipt');
                const body = encodeURIComponent(generatedData.receiptText);
                window.open(`mailto:${email}?subject=${subject}&body=${body}`);
            }
        } else if (actionType === 'Print') {
            // Print the receipt
            // const printWindow = window.open('', '_blank');
            // printWindow.document.write(`<pre style='font-size:1.2em'>${generatedData.receiptText.replace(/\n/g, '<br>')}</pre>`);
            // printWindow.document.close();
            // printWindow.print();
            setShowPDF(true);
        }
    };

    return (
        <>
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Add Bhiksha Entry">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bhakt Name *
                    </label>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                        placeholder="Search bhakt name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                        autoComplete="off"
                    />
                    
                    {/* Dropdown */}
                    {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {loading ? (
                                <div className="px-3 py-2 text-gray-500">Loading bhakts...</div>
                            ) : filteredBhakts.length > 0 ? (
                                filteredBhakts.map((bhakt) => (
                                    <button
                                        key={bhakt.id}
                                        type="button"
                                        onClick={() => handleBhaktSelect(bhakt)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                    >
                                        <div className="text-gray-900 font-medium">
                                            {bhakt.name}
                                        </div>
                                        {bhakt.alias_name && (
                                            <div className="text-sm text-gray-500">
                                                ({bhakt.alias_name})
                                            </div>
                                        )}
                                        <div className="text-sm text-green-600 font-semibold">
                                            ₹{bhakt.monthly_donation_amount?.toLocaleString() || '0'}/month
                                        </div>
                                    </button>
                                ))
                            ) : searchTerm ? (
                                <div className="px-3 py-2 text-gray-500">
                                    No bhakts found for "{searchTerm}"
                                </div>
                            ) : (
                                <div className="px-3 py-2 text-gray-500">
                                    Type to search bhakts
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                    </label>
                    <input
                        type="date"
                        name="paymentDate"
                        value={formData.paymentDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remarks
                    </label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Optional remarks"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isSubmitting ? 'Processing...' : 'Add Bhiksha'}
                    </button>
                </div>
            </form>
        </SimpleModal>

{/* //~~ Traditional PrintStatus Modal - Data showing and buttons */}
        {/* {showStatus && (
            <SimpleModal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Bhakt Status">
                <div className="p-4 rounded-lg">
                    
                    {(() => {
                        const bhakt = (bhaktData || []).find(b => {
                            const name = b.name || '';
                            const alias = b.alias_name || '';
                            return name === lastSubmittedName || alias === lastSubmittedName;
                        });
                        {console.log("Checkeing", bhaktData, lastSubmittedName, bhakt)}
                        const fmtDate = (d) => {
                            if (!d) return 'N/A';
                            try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
                        };
                        const fmtCurrency = (v) => {
                            if (v == null || v === '') return 'N/A';
                            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
                        };

                        if (!bhakt) {
                            return <div className="mt-3 text-sm text-gray-600">Could not find bhakt details for "{lastSubmittedName}"</div>;
                        }


                        return (
                            <>
                            <div className="w-full max-w-md">
                                    <div className="text-lg font-bold mb-4 text-center">🧾Payment Receipt</div>
                                    <div className="mb-2"><span className="font-semibold">Name:</span> {bhakt.name}</div>
                                    <div className="mb-2"><span className="font-semibold">Monthly Donation:</span> <span className="text-green-600">₹{bhakt.monthly_donation_amount}</span></div>
                                    <div className="mb-2"><span className="font-semibold">Last Payment Date:</span> {fmtDate(bhakt.last_payment_date)}</div>
                                    <div className="mb-2"><span className="font-semibold">Extra Balance:</span> <span className="text-blue-600">{fmtCurrency(bhakt.carry_forward_balance)}</span></div>
                                    <div className="mb-2"><span className="font-semibold">Current Status:</span> <span className="font-bold text-purple-700">{bhakt.payment_status || 'N/A'}</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-6">
                                    
                            <button
                                type="button"
                                onClick={() => handleAction('Print')}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={!!generatedData?.error}
                            >
                                Print PDF
                            </button>
                           
                            <button
                                type="button"
                                onClick={() => handleAction('Share')}
                                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700"
                                disabled={!!generatedData?.error}
                            >
                                Share
                            </button>
                            
                            {bhakt?.phone && (
                                <button
                                    type="button"
                                    onClick={() => handleAction('WhatsApp')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                                >
                                    WhatsApp
                                </button>
                            )}
                            
                            {bhakt?.email && (
                                <button
                                    type="button"
                                    onClick={() => handleAction('Email')}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    Email
                                </button>
                            )}
                            
                        </div>
                        </>
                        )
                    })()}

                        
                  
                </div>
            </SimpleModal>
        )} */}
 
        {showStatus && (
            <SimpleModal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Bhakt Status" maxWidth='max-w-xl'>
                <div className="p-4 rounded-lg"> 
                    {(() => {
                        const bhakt = (bhaktData || []).find(b => {
                            const name = b.name || '';
                            const alias = b.alias_name || '';
                            return name === lastSubmittedName || alias === lastSubmittedName;
                        });
                        // console.log("Checking", bhaktData, lastSubmittedName, bhakt);
                        const fmtDate = (d) => {
                            if (!d) return 'N/A';
                            try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
                        };
                        const fmtCurrency = (v) => {
                            if (v == null || v === '') return 'N/A';
                            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
                        };

                        if (!bhakt) {
                            return <div className="mt-3 text-sm text-gray-600">Could not find bhakt details for "{lastSubmittedName}"</div>;
                        }

                        return (
                            <RecieptPdf
                                name={bhakt.name}
                                monthlyDonation={bhakt.monthly_donation_amount}
                                lastPaymentDate={bhakt.last_payment_date}
                                extraBalance={bhakt.carry_forward_balance}
                                currentStatus={bhakt.payment_status}
                            />
                        );
                    })()}
                </div>
            </SimpleModal>
        )}
        

        {/* Toast Notification */}
        {toast && (
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
                duration={toast.type === 'success' ? 3000 : 5000}
            />
        )}
        </>
    );
};

export default AddBhikshaModal;
