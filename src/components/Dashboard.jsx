import { useState, useEffect } from 'react';
import BhikshaTable from './BhikshaTable';
import AddBhaktModal from './AddBhaktModal';
import AddBhikshaModal from './AddBhikshaModal';
import PrintStatusModal from './PrintStatusModal';
import DownloadSheetModal from './DownloadSheetModal';
import BackupsModal from './BackupsModal';
import AddYearModal from './AddYearModal';
import ViewDonationsModal from './ViewDonationsModal';
import ActivitySummary from './ActivitySummary';
import { useBhaktData } from '../hooks/useBhaktData';
import { useYearConfig } from '../hooks/useYearConfig';

const Dashboard = () => {
    const { fetchAvailableYears } = useBhaktData();
    const { fetchYears, populateMonthlySync } = useYearConfig();
    const [showAddBhaktModal, setShowAddBhaktModal] = useState(false);
    const [showAddBhikshaModal, setShowAddBhikshaModal] = useState(false);
    const [showPrintStatusModal, setShowPrintStatusModal] = useState(false);
    const [showDownloadSheetModal, setShowDownloadSheetModal] = useState(false);
    const [showBackupsModal, setShowBackupsModal] = useState(false);
    const [showAddYearModal, setShowAddYearModal] = useState(false);
    const [showViewDonationsModal, setShowViewDonationsModal] = useState(false);
    const [selectedYears, setSelectedYears] = useState([]);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [availableYears, setAvailableYears] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [syncLoading, setSyncLoading] = useState(false);

    // Load available years on component mount
    useEffect(() => {
        const loadYears = async () => {
            const years = await fetchYears();
            // Filter only active years for the display
            const activeYears = years
                .filter(year => year.is_active)
                .map(year => year.year);
            setAvailableYears(activeYears);
            
            // Load selected years from localStorage or default to all active years
            const savedSelectedYears = localStorage.getItem('selectedYears');
            if (savedSelectedYears) {
                try {
                    const parsedYears = JSON.parse(savedSelectedYears);
                    // Filter to only include years that are still available and active
                    const validYears = parsedYears.filter(year => activeYears.includes(year));
                    setSelectedYears(validYears.length > 0 ? validYears : activeYears);
                } catch (error) {
                    console.error('Error parsing saved years:', error);
                    setSelectedYears(activeYears);
                }
            } else {
                setSelectedYears(activeYears); // Select all available years by default
            }
        };
        loadYears();
    }, []); // Remove fetchYears dependency to avoid infinite loops

    const handleRefreshYears = async () => {
        const years = await fetchYears();
        const activeYears = years
            .filter(year => year.is_active)
            .map(year => year.year);
        setAvailableYears(activeYears);
        setSelectedYears(activeYears);
        setRefreshKey(prev => prev + 1); // Trigger refresh of other components
    };

    const toggleYear = (year) => {
        setSelectedYears(prev => {
            const newSelection = prev.includes(year) 
                ? prev.filter(y => y !== year)
                : [...prev, year].sort();
            
            // Save to localStorage
            localStorage.setItem('selectedYears', JSON.stringify(newSelection));
            return newSelection;
        });
    };

    const handleAddNewYear = () => {
        setShowAddYearModal(true);
        setShowYearDropdown(false);
    };

    const handleSyncMonthlyData = async () => {
        try {
            setSyncLoading(true);
            await populateMonthlySync();
            await handleRefreshYears(); // Refresh the UI after sync
            alert('Monthly sync data has been populated successfully!');
        } catch (error) {
            console.error('Error syncing monthly data:', error);
            alert('Error syncing monthly data: ' + error.message);
        } finally {
            setSyncLoading(false);
        }
    };

    const handleAddBhiksha = () => {
        setShowAddBhikshaModal(true);
    };

    const handleAddBhakt = () => {
        setShowAddBhaktModal(true);
    };

    const handlePrintStatus = () => {
        setShowPrintStatusModal(true);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('#yearFilterContainer')) {
                setShowYearDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownloadSheet = () => {
        setShowDownloadSheetModal(true);
    };

    const handleBhaktAdded = () => {
        // Force refresh of BhikshaTable by changing the key
        setRefreshKey(prev => prev + 1);
    };

    const handleBhikshaAdded = () => {
        // Force refresh of BhikshaTable by changing the key after bhiksha entry
        setRefreshKey(prev => prev + 1);
    };

    const authMode = sessionStorage.getItem('auth_mode') || 'unknown';

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                BHIKSHA DASHBOARD
                            </h1>
                            <span className="hidden sm:inline px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                Auth: {authMode}
                            </span>
                            
                            {/* Year Filter */}
                            <div className="relative" id="yearFilterContainer">
                                <button
                                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                >
                                    <span>Years ({selectedYears.length})</span>
                                    <svg className={`w-4 h-4 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showYearDropdown && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                                        <div className="p-2">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Years</span>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedYears(availableYears);
                                                            localStorage.setItem('selectedYears', JSON.stringify(availableYears));
                                                        }}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedYears([]);
                                                            localStorage.setItem('selectedYears', JSON.stringify([]));
                                                        }}
                                                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                                    >
                                                        None
                                                    </button>
                                                </div>
                                            </div>
                                            {availableYears.map(year => (
                                                <label key={year} className="flex items-center space-x-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedYears.includes(year)}
                                                        onChange={() => toggleYear(year)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{year}</span>
                                                </label>
                                            ))}
                                            
                                            {/* Add New Year Button */}
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-2">
                                                <button
                                                    onClick={handleAddNewYear}
                                                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span>Add New Year</span>
                                                </button>
                                                
                                                {/* Sync Monthly Data Button */}
                                                <button
                                                    onClick={handleSyncMonthlyData}
                                                    disabled={syncLoading}
                                                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span>{syncLoading ? 'Syncing...' : 'Sync Monthly Data'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        
                            {/* Action Buttons - Desktop */}
                            <div className="hidden lg:flex items-center space-x-3">
                                <button
                                    onClick={handleAddBhiksha}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    Add Bhiksha
                                </button>
                                
                                <button
                                    onClick={handlePrintStatus}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    Print Bhakt Status
                                </button>
                                <button
                                    onClick={handleDownloadSheet}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    Download Status (All)
                                </button>
                                <button
                                    onClick={handleAddBhakt}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    Add New Bhakt
                                </button>
                                
                                {/* View Donations Button */}
                                <button
                                    onClick={() => setShowViewDonationsModal(true)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    View Donations
                                </button>
                                <button
                                    onClick={() => setShowBackupsModal(true)}
                                    className="ml-8 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition duration-200 cursor-pointer"
                                >
                                    Backups
                                </button>
                            </div>
                       
                    </div>
                </div>
            </header>

            {/* Mobile Action Buttons - Show below header on mobile only */}
            <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3">
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                        <button
                            onClick={handleAddBhiksha}
                            className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            Add Bhiksha
                        </button>
                        <button
                            onClick={() => setShowBackupsModal(true)}
                            className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            Backups
                        </button>
                        <button
                            onClick={handlePrintStatus}
                            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            Print Status
                        </button>
                        <button
                            onClick={handleDownloadSheet}
                            className="flex-shrink-0 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            Download
                        </button>
                        <button
                            onClick={handleAddBhakt}
                            className="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            Add Bhakt
                        </button>
                        <button
                            onClick={() => setShowViewDonationsModal(true)}
                            className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                        >
                            View Donations
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Excel-like fixed viewport */}
            <main className="flex-1 overflow-hidden">
                {/* Container for fixed height table */}
                <div className="h-full px-2 sm:px-4 py-6">
                    {/* Activity Summary */}
                    {/* <ActivitySummary /> */}
                    
                    <div className="h-full max-h-[calc(100vh-180px)] overflow-hidden">
                        <BhikshaTable 
                            key={refreshKey} 
                            selectedYears={selectedYears} 
                        />
                    </div>
                </div>
            </main>

            {/* Modals */}
            <AddBhaktModal 
                isOpen={showAddBhaktModal} 
                onClose={() => setShowAddBhaktModal(false)} 
                onBhaktAdded={handleBhaktAdded}
            />
            
            <AddBhikshaModal 
                isOpen={showAddBhikshaModal} 
                onClose={() => setShowAddBhikshaModal(false)}
                onSuccess={handleBhikshaAdded}
            />
            
            <PrintStatusModal 
                isOpen={showPrintStatusModal} 
                onClose={() => setShowPrintStatusModal(false)} 
            />

            <DownloadSheetModal 
                isOpen={showDownloadSheetModal} 
                onClose={() => setShowDownloadSheetModal(false)} 
            />

            <BackupsModal
                isOpen={showBackupsModal}
                onClose={() => setShowBackupsModal(false)}
            />

            <AddYearModal 
                isOpen={showAddYearModal} 
                onClose={() => setShowAddYearModal(false)}
                onRefreshYears={handleRefreshYears}
                existingYears={availableYears}
            />

            <ViewDonationsModal 
                isOpen={showViewDonationsModal} 
                onClose={() => setShowViewDonationsModal(false)} 
            />
        </div>
    );
};

export default Dashboard;
