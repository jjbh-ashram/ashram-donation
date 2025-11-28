import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ExpenseTracker = ({ navigate }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('form'); // 'form', 'view', 'edit'
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: ''
    });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        file: null
    });

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchExpenses();
    }, [page, filters]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('expenses')
                .select('*', { count: 'exact' })
                .order('date', { ascending: false })
                .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

            // Apply filters
            if (filters.fromDate && filters.toDate) {
                query = query.gte('date', filters.fromDate).lte('date', filters.toDate);
            } else if (filters.fromDate) {
                query = query.gte('date', filters.fromDate);
            } else if (filters.toDate) {
                query = query.lte('date', filters.toDate);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            if (page === 1) {
                setExpenses(data || []);
            } else {
                setExpenses(prev => [...prev, ...(data || [])]);
            }

            setHasMore(expenses.length + (data?.length || 0) < count);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            alert('Error loading expenses: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData(prev => ({ ...prev, file }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            
            let fileUrl = null;
            if (formData.file) {
                const fileExt = formData.file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('expense-files')
                    .upload(fileName, formData.file);

                if (uploadError) throw uploadError;
                fileUrl = uploadData.path;
            }

            const expenseData = {
                name: formData.name,
                description: formData.description,
                amount: parseFloat(formData.amount),
                date: formData.date,
                note: formData.note,
                file_url: fileUrl
            };

            if (view === 'edit' && selectedExpense) {
                const { error } = await supabase
                    .from('expenses')
                    .update(expenseData)
                    .eq('id', selectedExpense.id);

                if (error) throw error;
                alert('Expense updated successfully!');
            } else {
                const { error } = await supabase
                    .from('expenses')
                    .insert([expenseData]);

                if (error) throw error;
                alert('Expense added successfully!');
            }

            resetForm();
            setPage(1);
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Error saving expense: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            note: '',
            file: null
        });
        setView('form');
        setSelectedExpense(null);
    };

    const handleView = (expense) => {
        setSelectedExpense(expense);
        setView('view');
    };

    const handleEdit = (expense) => {
        setSelectedExpense(expense);
        setFormData({
            name: expense.name,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            note: expense.note || '',
            file: null
        });
        setView('edit');
    };

    const handleDelete = async (expense) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            setLoading(true);
            
            // Delete file from storage if exists
            if (expense.file_url) {
                await supabase.storage.from('expense-files').remove([expense.file_url]);
            }

            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expense.id);

            if (error) throw error;

            alert('Expense deleted successfully!');
            setPage(1);
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error deleting expense: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            if (format === 'PDF') {
                // TODO: Implement PDF export using jsPDF
                alert('PDF export coming soon!');
            } else if (format === 'EXCEL') {
                // TODO: Implement Excel export using xlsx
                alert('Excel export coming soon!');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error exporting: ' + error.message);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 max-w-screen-2xl mx-auto w-full">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="relative text-base sm:text-2xl font-black text-gray-900">
                                <span className="absolute inset-0 blur-sm bg-gradient-to-r from-blue-200 via-sky-300 to-blue-200 opacity-40"></span>
                                <span className="relative">श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम</span>
                                {/* Shri Shri Prabhu JagatBandhu Sundar Ashram */}
                        </h1>
                        <button
                            onClick={() => navigate && navigate('dashboard')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition duration-200"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - Split Screen */}
            <div className="flex-1 overflow-hidden bg-gray-100">
                <div className="h-full max-w-screen-2xl mx-auto">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0 shadow-lg">
                    
                        {/* Left Side - Form (Fixed) - Smaller width */}
                        <div className="bg-white border-r border-gray-200 overflow-y-auto col-span-1 lg:col-span-4">
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h2 className="text-lg font-bold text-gray-900">Expense Tracker</h2>
                            <p className="text-xs text-gray-600 mt-1">Manage your expenses efficiently</p>
                        </div>
                        <div className="p-4">
                        {view === 'view' && selectedExpense ? (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Expense Details</h3>
                                    <button
                                        onClick={resetForm}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md shadow-sm"
                                    >
                                        + Add New
                                    </button>
                                </div>
                                
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedExpense.name}</h2>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600">Description</label>
                                        <p className="mt-0.5 text-sm text-gray-900">{selectedExpense.description}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600">Amount</label>
                                        <p className="mt-0.5 text-xl font-bold text-green-600">₹{selectedExpense.amount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600">Date</label>
                                        <p className="mt-0.5 text-sm text-gray-900">{new Date(selectedExpense.date).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    {selectedExpense.note && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600">Note</label>
                                            <p className="mt-0.5 text-sm text-gray-700">{selectedExpense.note}</p>
                                        </div>
                                    )}
                                    {selectedExpense.file_url && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Attachment</label>
                                            <a
                                                href={`${supabase.storage.from('expense-files').getPublicUrl(selectedExpense.file_url).data.publicUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200"
                                            >
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View File
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        {view === 'edit' ? 'Edit Expense' : 'Add New Expense'}
                                    </h3>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Expense Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="e.g., Office Supplies"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Description *
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="Brief description..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                            Amount (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleInputChange}
                                            step="0.01"
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Note (Optional)
                                    </label>
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="Additional notes..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                        Attachment (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="w-full text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white file:mr-4 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>

                                <div className="flex space-x-2 pt-3 border-t border-gray-200">
                                    {view === 'edit' && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            view === 'edit' ? 'Update Expense' : 'Add Expense'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                        </div>
                    </div>

                    {/* Right Side - List (Scrollable) - Wider */}
                    <div className="bg-gray-50 flex flex-col col-span-1 lg:col-span-8">
                        {/* Filters */}
                        <div className="bg-white px-4 py-3 border-b border-gray-200">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={filters.fromDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={filters.toDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleExport('PDF')}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm flex items-center"
                                    >
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                        </svg>
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => handleExport('EXCEL')}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md shadow-sm flex items-center"
                                    >
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                        </svg>
                                        Excel
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expense List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loading && page === 1 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                                    <p className="text-sm text-gray-500">Loading expenses...</p>
                                </div>
                            ) : expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-500 font-medium">No expenses found</p>
                                    <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
                                </div>
                            ) : (
                                expenses.map((expense) => (
                                    <div key={expense.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <h3 className="font-semibold text-gray-900 text-sm truncate">{expense.name}</h3>
                                                    <span className="text-base font-bold text-green-600 ml-2 flex-shrink-0">₹{expense.amount.toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{expense.description}</p>
                                                <div className="flex items-center space-x-3 mt-2">
                                                    <span className="text-xs text-gray-500 flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {new Date(expense.date).toLocaleDateString('en-IN')}
                                                    </span>
                                                    {expense.file_url && (
                                                        <span className="text-xs text-blue-600 flex items-center">
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                            Attachment
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col space-y-1 flex-shrink-0">
                                                <button
                                                    onClick={() => handleView(expense)}
                                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                                    title="View Details"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded hover:bg-amber-200 transition-colors"
                                                    title="Edit Expense"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense)}
                                                    className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                                                    title="Delete Expense"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {hasMore && !loading && (
                                <button
                                    onClick={() => setPage(prev => prev + 1)}
                                    className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg border border-blue-200 transition-colors"
                                >
                                    Load More
                                </button>
                            )}
                            {loading && page > 1 && (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseTracker;
