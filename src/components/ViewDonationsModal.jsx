import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import SimpleModal from './SimpleModal';

export default function ViewDonationsModal({ isOpen, onClose }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('payment_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Date filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Bhakt filter states (simplified for dropdown only)
  const [showBhaktFilter, setShowBhaktFilter] = useState(false);
  const [availableBhakts, setAvailableBhakts] = useState([]);
  const filterDropdownRef = useRef(null);
  const filterSearchRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchDonations();
    }
  }, [isOpen]);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('monthly_donations')
        .select('*')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      setDonations(data || []);
      
      // Extract unique bhakts for filter dropdown
      if (data && data.length > 0) {
        const uniqueBhakts = [...new Set(data.map(d => d.bhakt_name))]
          .map(name => ({ name, id: name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableBhakts(uniqueBhakts);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      alert('Error fetching donation history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowBhaktFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setShowBhaktFilter(false);
  };

  // Filter bhakts based on search term for dropdown
  const filteredBhakts = availableBhakts.filter(bhakt => {
    const search = searchTerm.toLowerCase();
    return bhakt.name.toLowerCase().includes(search);
  });

  const filteredDonations = donations.filter(donation => {
    // Text search filter
    const matchesText = donation.bhakt_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.remarks?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date range filter
    const donationDate = new Date(donation.payment_date);
    let matchesDateRange = true;
    
    if (fromDate && toDate) {
      // Both dates selected - filter by range
      const from = new Date(fromDate);
      const to = new Date(toDate);
      matchesDateRange = donationDate >= from && donationDate <= to;
    } else if (fromDate) {
      // Only from date selected - show donations on or after this date
      const from = new Date(fromDate);
      matchesDateRange = donationDate >= from;
    } else if (toDate) {
      // Only to date selected - show donations on or before this date
      const to = new Date(toDate);
      matchesDateRange = donationDate <= to;
    }
    
    return matchesText && matchesDateRange;
  });

  const sortedDonations = [...filteredDonations].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortBy === 'payment_date') {
      const comparison = new Date(aValue) - new Date(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    }
    
    if (sortBy === 'amount_paid') {
      const comparison = parseFloat(aValue) - parseFloat(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedDonations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDonations = sortedDonations.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalAmount = filteredDonations.reduce((sum, donation) => sum + parseFloat(donation.amount_paid), 0);

  // PDF download logic
  const handleDownloadPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    doc.setFontSize(22);
    doc.text('Donation History', 40, 40);
    // Table headers
    const headers = [
      [
        { content: 'Bhakt Name', styles: { halign: 'left', fontStyle: 'bold' } },
        { content: 'Payment Date', styles: { halign: 'left', fontStyle: 'bold' } },
        { content: 'Amount', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: 'Notes', styles: { halign: 'left', fontStyle: 'bold' } },
        { content: 'Remarks', styles: { halign: 'left', fontStyle: 'bold' } }
      ]
    ];
    // Table rows
    const rows = sortedDonations.map(donation => [
      donation.bhakt_name,
      formatDate(donation.payment_date),
      donation.amount_paid,
      (donation.notes || '').replace(/\s+/g, ' ').trim(),
      (donation.remarks || '').replace(/\s+/g, ' ').trim()
    ]);
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 60,
      margin: { left: 40, right: 40 },
      theme: 'striped',
      styles: {
        fontSize: 12,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [44, 62, 80],
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 13,
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 110 }, // Bhakt Name
        1: { cellWidth: 80 },  // Payment Date
        2: { cellWidth: 70, halign: 'right' }, // Amount
        3: { cellWidth: 320, overflow: 'linebreak' }, // Notes (wider, wrap)
        4: { cellWidth: 120, overflow: 'linebreak' }, // Remarks (wrap)
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawCell: function(data) {
        // Optionally, you can add custom logic for cell rendering here
      }
    });
    doc.save('donation-history.pdf');
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Donation History"
      maxWidth="max-w-7xl"
      
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600">Total Donations</div>
            <div className="text-2xl font-bold text-blue-800">
              {filteredDonations.length}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600">Total Amount</div>
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(totalAmount)}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600">Unique Bhakts</div>
            <div className="text-2xl font-bold text-purple-800">
              {new Set(filteredDonations.map(d => d.bhakt_name)).size}
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search with Bhakt Dropdown */}
          <div className="flex-1 relative" ref={filterDropdownRef}>
            <input
              ref={filterSearchRef}
              type="text"
              placeholder="Search by bhakt name, notes, or remarks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowBhaktFilter(e.target.value.length > 0);
              }}
              onFocus={() => searchTerm.length > 0 && setShowBhaktFilter(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            
            {/* Bhakt Dropdown */}
            {showBhaktFilter && searchTerm.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredBhakts
                  .filter(bhakt => bhakt.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice(0, 10) // Limit to 10 results
                  .map((bhakt) => (
                    <div
                      key={bhakt.name}
                      onClick={() => {
                        setSearchTerm(bhakt.name);
                        setShowBhaktFilter(false);
                      }}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {bhakt.name}
                      </div>
                    </div>
                  ))}
                {filteredBhakts.filter(bhakt => bhakt.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    No bhakts found
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Date Range Filters */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchDonations}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            {/* <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
          title="Download PDF"
        >
          Download PDF
        </button> */}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bhakt_name')}
                >
                  <div className="flex items-center">
                    Bhakt Name
                    {sortBy === 'bhakt_name' && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('payment_date')}
                >
                  <div className="flex items-center">
                    Payment Date
                    {sortBy === 'payment_date' && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount_paid')}
                >
                  <div className="flex items-center">
                    Amount
                    {sortBy === 'amount_paid' && (
                      <svg className={`w-4 h-4 ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="w-6 h-6 mr-3 -ml-1 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading donations...
                    </div>
                  </td>
                </tr>
              ) : paginatedDonations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No donations found matching your search.' : 'No donations found.'}
                  </td>
                </tr>
              ) : (
                paginatedDonations.map((donation, index) => (
                  <tr key={`${donation.bhakt_id}-${donation.payment_date}-${index}`} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {donation.bhakt_name}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(donation.payment_date)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-600">
                      {formatCurrency(donation.amount_paid)}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      {donation.notes && (
                        <div className="text-sm text-gray-600">
                          <div className="font-medium text-xs text-gray-500 mb-1">System Notes:</div>
                          <div className="bg-gray-50 p-2 rounded text-xs leading-relaxed overflow-hidden">
                            {donation.notes}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      {donation.remarks ? (
                        <div className="text-sm text-blue-600">
                          <div className="font-medium text-xs text-blue-500 mb-1">User Remarks:</div>
                          <div className="bg-blue-50 p-2 rounded text-xs leading-relaxed overflow-hidden">
                            {donation.remarks}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No remarks</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedDonations.length)} of {sortedDonations.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
    </SimpleModal>
  );
}
