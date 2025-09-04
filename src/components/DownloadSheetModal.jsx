import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import SimpleModal from './SimpleModal';
import { useYearConfig } from '../hooks/useYearConfig';

const DownloadSheetModal = ({ isOpen, onClose }) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const { fetchYears } = useYearConfig();

    const [formData, setFormData] = useState({
        fromMonth: currentMonth,
        fromYear: currentYear,
        toMonth: currentMonth,
        toYear: currentYear,
        format: 'PDF'
    });

    // Load available years from database and use them in dropdowns
    const [availableYears, setAvailableYears] = useState([]);
    useEffect(() => {
        const loadYears = async () => {
            try {
                const years = await fetchYears();
                const activeYears = years
                    .filter(year => year.is_active)
                    .map(year => year.year);
                setAvailableYears(activeYears);
            } catch (error) {
                console.error('Error fetching years:', error);
                setAvailableYears([]);
            }
        };
        loadYears();
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

    // Use availableYears from DB instead of hardcoded years
    const years = availableYears.length > 0 ? availableYears : [currentYear];
    const formats = ['PDF', 'EXCEL'];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Month') ? parseInt(value) : value
        }));
    };

    const handlePrint = async (e) => {
        e.preventDefault();
        // Validate date range
        const fromDate = new Date(formData.fromYear, formData.fromMonth - 1);
        const toDate = new Date(formData.toYear, formData.toMonth - 1);
        if (fromDate > toDate) {
            alert('From date cannot be later than To date');
            return;
        }

        // Fetch all bhakt rows and print name, last_payment_date, and payment_status
        let { data, error } = await supabase
            .from('bhakt')
            .select('name,last_payment_date,payment_status')
            .order('name', { ascending: true });

        if (error) {
            alert('Error fetching data: ' + error.message);
            return;
        }

        if (!data || data.length === 0) {
            alert('No bhakt data found.');
            return;
        }

    if (formData.format === 'PDF') {
            // Generate PDF using jsPDF and jspdf-autotable
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Bhakt Status Report', 14, 18);
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

            // Prepare table data
            const tableData = data.map((row, idx) => [
                idx + 1,
                row.name || '',
                row.last_payment_date || 'N/A',
                row.payment_status || 'N/A'
            ]);

            autoTable(doc, {
                head: [['Sr No', 'Name', 'Last Payment', 'Status']],
                body: tableData,
                startY: 35,
                theme: 'striped',
                styles: {
                    fontSize: 11,
                    cellPadding: 4,
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: [41, 128, 185], // blue
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [230, 240, 255], // light blue
                },
                rowStyles: {
                    minCellHeight: 12,
                },
                columnStyles: {
                    0: { cellWidth: 18 }, // Sr No
                    1: { cellWidth: 60 }, // Name
                    2: { cellWidth: 40 }, // Last Payment
                    3: { cellWidth: 60 }, // Status
                },
                didDrawPage: function (data) {
                    // Add footer or watermark if needed
                }
            });

            doc.save(`BhaktStatus_${new Date().toISOString().slice(0,10)}.pdf`);
    } else if (formData.format && formData.format.toUpperCase() === 'EXCEL') {
            // Generate Excel using SheetJS (simple list)
            const wsData = [
                ['Sr No', 'Name', 'Last Payment', 'Status'],
                ...data.map((row, idx) => [
                    idx + 1,
                    row.name || '',
                    row.last_payment_date || 'N/A',
                    row.payment_status || 'N/A'
                ])
            ];
            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bhakt Status');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BhaktStatus_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert('Only PDF and EXCEL download are implemented for now.');
        }

        onClose();
    };

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title="Download Status Sheet - All Bhakts">
            <form onSubmit={handlePrint} className="space-y-6">
                {/* From Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        From Date
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
                            <select
                                name="fromMonth"
                                value={formData.fromMonth}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
                            <select
                                name="fromYear"
                                value={formData.fromYear}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* To Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        To Date
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
                            <select
                                name="toMonth"
                                value={formData.toMonth}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
                            <select
                                name="toYear"
                                value={formData.toYear}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                
                

                {/* Format Selection */}
                <div>
                    
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Format
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {formats.map(format => (
                            <label key={format} className="relative">
                                <input
                                    type="radio"
                                    name="format"
                                    value={format}
                                    checked={formData.format === format}
                                    onChange={handleInputChange}
                                    className="sr-only"
                                />
                                <div className={`cursor-pointer px-4 py-3 text-center border rounded-md transition-all ${
                                    formData.format === format
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}>
                                    <div className="font-medium">{format}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Print Sheet
                    </button>
                </div>
            </form>
        </SimpleModal>
    );
};

export default DownloadSheetModal;
