import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as GDrive from '../lib/googleDrive';

const ExpenseTracker = ({ navigate }) => {
    // Expense Data State
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

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        file: null
    });
    
    // File Rename State
    const [fileName, setFileName] = useState('');

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        // Initialize GDrive and fetch expenses
        const init = async () => {
            await GDrive.initGoogleDrive();
            fetchExpenses();
        };
        init();
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

    const fetchAllFilteredExpenses = async () => {
        let query = supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

        // Apply filters
        if (filters.fromDate && filters.toDate) {
            query = query.gte('date', filters.fromDate).lte('date', filters.toDate);
        } else if (filters.fromDate) {
            query = query.gte('date', filters.fromDate);
        } else if (filters.toDate) {
            query = query.lte('date', filters.toDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, file }));
            setFileName(file.name); // Set initial file name for renaming
        }
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
            
            // Handle File Upload to Google Drive
            if (formData.file) {
                // Ensure the file name has the correct extension
                let finalName = fileName;
                const originalExt = formData.file.name.split('.').pop();
                if (!finalName.toLowerCase().endsWith(`.${originalExt.toLowerCase()}`)) {
                    finalName = `${finalName}.${originalExt}`;
                }

                const uploadedFile = await GDrive.uploadFile(
                    formData.file, 
                    'EXPENSE-FILES', 
                    null, 
                    finalName
                );

                const uploadedFileId = uploadedFile.id;

                // Use the webViewLink returned from Google Drive
                fileUrl = uploadedFile.webViewLink;
                
                // Make it public so it's accessible via the link
                await GDrive.setFilePublic(uploadedFileId);
            } else if (view === 'edit' && selectedExpense?.file_url) {
                // Keep existing file URL if no new file uploaded
                fileUrl = selectedExpense.file_url;
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
        setFileName('');
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
        setFileName(''); // Reset file name as we don't download/rename existing file on edit
        setView('edit');
    };

    const handleDelete = async (expense) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            setLoading(true);
            
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
            setLoading(true);
            const data = await fetchAllFilteredExpenses();

            if (!data || data.length === 0) {
                alert('No expenses found to export for the selected period.');
                return;
            }

            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `Expenses_Export_${timestamp}`;

            if (format === 'PDF') {
                const { jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');

                const doc = new jsPDF();

                // Title
                doc.setFontSize(18);
                doc.text('Expense Report', 14, 22);
                
                // Date Range Info
                doc.setFontSize(11);
                doc.setTextColor(100);
                let dateInfo = `Generated on: ${new Date().toLocaleDateString('en-IN')}`;
                if (filters.fromDate || filters.toDate) {
                    dateInfo += ` | Period: ${filters.fromDate || 'Start'} to ${filters.toDate || 'End'}`;
                }
                doc.text(dateInfo, 14, 30);

                // Table
                const tableColumn = ["Date", "Name", "Amount", "Description", "Note", "Attachment"];
                const tableRows = [];

                data.forEach(expense => {
                    const expenseData = [
                        new Date(expense.date).toLocaleDateString('en-IN'),
                        expense.name,
                        `Rs. ${expense.amount.toLocaleString()}`,
                        expense.description,
                        expense.note || '-',
                        expense.file_url ? 'Link' : '-'
                    ];
                    tableRows.push(expenseData);
                });

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 40,
                    theme: 'plain', // Use plain theme for B&W look
                    styles: { 
                        fontSize: 9, 
                        cellPadding: 3,
                        lineColor: [0, 0, 0], // Black borders
                        lineWidth: 0.1,
                        textColor: [0, 0, 0] // Black text
                    },
                    headStyles: { 
                        fillColor: [220, 220, 220], // Light gray header
                        textColor: [0, 0, 0], // Black text
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: [0, 0, 0]
                    },
                    columnStyles: {
                        5: { // Attachment column
                            textColor: [0, 0, 255], // Blue text for link
                            fontStyle: 'italic'
                        }
                    },
                    didDrawCell: (data) => {
                        // Add link to the "Link" text in Attachment column
                        if (data.section === 'body' && data.column.index === 5) {
                            const expense = data.row.raw; // This gives the array row, not original object
                            // We need to access the original data. 
                            // Let's rely on the index since we iterate in order
                            const originalExpense = data.row.index < data.table.body.length ? 
                                                    data.table.body[data.row.index].raw : null;
                            
                            // Actually, autoTable doesn't pass the original object easily in 'raw' if we passed an array of arrays.
                            // But we can use the cell text.
                            if (data.cell.text[0] === 'Link') {
                                // We need the URL. 
                                // Let's re-map the data passed to autoTable to include the URL in the cell data
                            }
                        }
                    }
                });
                
                // Re-doing the table generation to properly support links
                // We need to pass the URL to the cell so we can add the link
                const body = data.map(expense => [
                    new Date(expense.date).toLocaleDateString('en-IN'),
                    expense.name,
                    `Rs. ${expense.amount.toLocaleString()}`,
                    expense.description,
                    expense.note || '-',
                    { content: expense.file_url ? 'Link' : '-', url: expense.file_url }
                ]);

                autoTable(doc, {
                    head: [tableColumn],
                    body: body,
                    startY: 40,
                    theme: 'plain',
                    styles: { 
                        fontSize: 9, 
                        cellPadding: 3,
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [0, 0, 0]
                    },
                    headStyles: { 
                        fillColor: [220, 220, 220],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        lineWidth: 0.1,
                        lineColor: [0, 0, 0]
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 5 && data.cell.raw && data.cell.raw.url) {
                            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: data.cell.raw.url });
                            doc.setTextColor(0, 0, 255); // Make it look like a link (visual only, actual link is added above)
                            // Note: didDrawCell is called after text is drawn, so changing color here might not affect current cell text unless we redraw it.
                            // But we can set columnStyles for text color.
                        }
                    },
                    columnStyles: {
                         5: { textColor: [0, 0, 255] }
                    }
                });

                doc.save(`${fileName}.pdf`);

            } else if (format === 'EXCEL') {
                const { utils, writeFile } = await import('xlsx');

                // Format data for Excel
                const excelData = data.map(expense => ({
                    Date: new Date(expense.date).toLocaleDateString('en-IN'),
                    Name: expense.name,
                    Amount: expense.amount,
                    Description: expense.description,
                    Note: expense.note || '',
                    Attachment: expense.file_url || ''
                }));

                const worksheet = utils.json_to_sheet(excelData);
                const workbook = utils.book_new();
                utils.book_append_sheet(workbook, worksheet, "Expenses");

                // Adjust column widths
                const wscols = [
                    {wch: 12}, // Date
                    {wch: 25}, // Name
                    {wch: 15}, // Amount
                    {wch: 40}, // Description
                    {wch: 30}, // Note
                    {wch: 50}  // Attachment
                ];
                worksheet['!cols'] = wscols;

                writeFile(workbook, `${fileName}.xlsx`);
            }
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error exporting: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                                श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम
                            </h1>
                            <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
                            <h1 className="hidden sm:block text-xl font-semibold text-gray-600">
                                Expense Tracker
                            </h1>
                        </div>
                        <button
                            onClick={() => navigate && navigate('dashboard')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Side - Form */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {view === 'view' ? 'Expense Details' : view === 'edit' ? 'Edit Expense' : 'Add New Expense'}
                                </h2>
                            </div>
                            
                            <div className="p-4">
                                {view === 'view' && selectedExpense ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{selectedExpense.name}</h3>
                                            <p className="text-sm text-gray-500">{new Date(selectedExpense.date).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        
                                        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</label>
                                            <p className="text-2xl font-bold text-green-600">₹{selectedExpense.amount.toLocaleString()}</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                                            <p className="text-gray-700 text-sm">{selectedExpense.description}</p>
                                        </div>

                                        {selectedExpense.note && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Note</label>
                                                <p className="text-gray-700 text-sm italic">{selectedExpense.note}</p>
                                            </div>
                                        )}

                                        {selectedExpense.file_url && (
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attachment</label>
                                                <a
                                                    href={selectedExpense.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100 border border-blue-200 transition"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View Attachment
                                                </a>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-gray-100 flex space-x-3">
                                            <button
                                                onClick={resetForm}
                                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={() => handleEdit(selectedExpense)}
                                                className="flex-1 px-4 py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-md hover:bg-amber-200 transition"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="e.g., Office Supplies"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Brief description..."
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                                <input
                                                    type="number"
                                                    name="amount"
                                                    value={formData.amount}
                                                    onChange={handleInputChange}
                                                    step="0.01"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                                <input
                                                    type="date"
                                                    name="date"
                                                    value={formData.date}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                                            <textarea
                                                name="note"
                                                value={formData.note}
                                                onChange={handleInputChange}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Additional notes..."
                                            />
                                        </div>

                                        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            
                                            {formData.file && (
                                                <div className="mt-3">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rename File</label>
                                                    <input
                                                        type="text"
                                                        value={fileName}
                                                        onChange={(e) => setFileName(e.target.value)}
                                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Enter file name"
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">File will be saved to Google Drive as: {fileName}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex space-x-3 pt-2">
                                            {view === 'edit' && (
                                                <button
                                                    type="button"
                                                    onClick={resetForm}
                                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                {loading ? 'Processing...' : view === 'edit' ? 'Update Expense' : 'Add Expense'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side - List */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={filters.fromDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={filters.toDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleExport('PDF')}
                                        className="inline-flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-100 transition shadow-sm"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export PDF
                                    </button>
                                    <button
                                        onClick={() => handleExport('EXCEL')}
                                        className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-md hover:bg-green-100 transition shadow-sm"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Export Excel
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expense List */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h2 className="text-sm font-semibold text-gray-900">Expense History</h2>
                                <span className="text-xs text-gray-500">{expenses.length} records found</span>
                            </div>
                            
                            <div className="divide-y divide-gray-200">
                                {loading && page === 1 ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                        <p className="text-sm text-gray-500">Loading expenses...</p>
                                    </div>
                                ) : expenses.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 font-medium">No expenses found</p>
                                        <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[600px] overflow-y-auto">
                                        {expenses.map((expense) => (
                                            <div key={expense.id} className="p-4 hover:bg-gray-50 transition">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{expense.name}</h3>
                                                            <span className="text-sm font-bold text-green-600">₹{expense.amount.toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{expense.description}</p>
                                                        <div className="flex items-center space-x-4">
                                                            <span className="flex items-center text-xs text-gray-400">
                                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {new Date(expense.date).toLocaleDateString('en-IN')}
                                                            </span>
                                                            {expense.file_url && (
                                                                <span className="flex items-center text-xs text-blue-500">
                                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                    </svg>
                                                                    Attachment
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleView(expense)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                                            title="View"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(expense)}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(expense)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                            title="Delete"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {hasMore && !loading && expenses.length > 0 && (
                                    <div className="p-4 border-t border-gray-200">
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-md transition"
                                        >
                                            Load More
                                        </button>
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
