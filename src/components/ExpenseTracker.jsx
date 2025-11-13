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
            <header className="bg-white shadow-sm border-b border-gray-200">
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
            <div className="flex-1 overflow-hidden">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 py-2 px-4">
                            Expense Tracker
                        </h1>
                <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0 px-4" >
                    
                    {/* Left Side - Form (Fixed) */}
                    <div className="bg-white border-r border-gray-200 p-6 overflow-y-auto col-span-1">
                        {view === 'view' && selectedExpense ? (
                            <div>
                                <button
                                    onClick={resetForm}
                                    className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                                >
                                    Add New Expense
                                </button>
                                
                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedExpense.name}</h2>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <p className="mt-1 text-gray-900">{selectedExpense.description}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Amount</label>
                                        <p className="mt-1 text-2xl font-bold text-green-600">₹{selectedExpense.amount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date</label>
                                        <p className="mt-1 text-gray-900">{new Date(selectedExpense.date).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    {selectedExpense.note && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Note</label>
                                            <p className="mt-1 text-gray-600">{selectedExpense.note}</p>
                                        </div>
                                    )}
                                    {selectedExpense.file_url && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Attachment</label>
                                            <a
                                                href={`${supabase.storage.from('expense-files').getPublicUrl(selectedExpense.file_url).data.publicUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 text-blue-600 hover:underline"
                                            >
                                                View File
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">
                                    {view === 'edit' ? 'Edit Expense' : 'Add New Expense'}
                                </h2>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name of Expense *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description *
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Note (Optional)
                                    </label>
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Upload File (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    {view === 'edit' && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : (view === 'edit' ? 'Update' : 'Add Expense')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Right Side - List (Scrollable) */}
                    <div className="bg-gray-50 flex flex-col col-span-2">
                        {/* Filters */}
                        <div className="bg-white p-4 border-b border-gray-200 space-y-3">
                            <div className="flex items-center space-x-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={filters.fromDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={filters.toDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Export</label>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleExport('PDF')}
                                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md"
                                        >
                                            PDF
                                        </button>
                                        <button
                                            onClick={() => handleExport('EXCEL')}
                                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                                        >
                                            Excel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expense List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading && page === 1 ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : expenses.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No expenses found
                                </div>
                            ) : (
                                expenses.map((expense) => (
                                    <div key={expense.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{expense.name}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                                                <div className="flex items-center space-x-4 mt-2">
                                                    <span className="text-lg font-bold text-green-600">₹{expense.amount.toLocaleString()}</span>
                                                    <span className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString('en-IN')}</span>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 ml-4">
                                                <button
                                                    onClick={() => handleView(expense)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-md hover:bg-yellow-200"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense)}
                                                    className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {hasMore && (
                                <button
                                    onClick={() => setPage(prev => prev + 1)}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
                                >
                                    {loading ? 'Loading...' : 'Load More'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseTracker;
