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

const Dashboard = ({ navigate }) => {
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
        <div className="h-screen flex flex-col bg-gray-50 transition-colors">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <h1 className="relative text-xl sm:text-2xl font-black text-gray-900">
                                <span className="absolute inset-0 blur-sm bg-gradient-to-r from-blue-200 via-sky-300 to-blue-200 opacity-40"></span>
                                <span className="relative">श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम</span>
                                {/* Shri Shri Prabhu JagatBandhu Sundar Ashram */}
                            </h1>
                            {/* <span className="hidden sm:inline px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Auth: {authMode}
                            </span> */}
                            
                            {/* Year Filter */}
                            <div className="relative" id="yearFilterContainer">
                                <button
                                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    <span>Years ({selectedYears.length})</span>
                                    <svg className={`w-4 h-4 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showYearDropdown && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                        <div className="p-2">
                                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                                                <span className="text-sm font-medium text-gray-700">Select Years</span>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedYears(availableYears);
                                                            localStorage.setItem('selectedYears', JSON.stringify(availableYears));
                                                        }}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedYears([]);
                                                            localStorage.setItem('selectedYears', JSON.stringify([]));
                                                        }}
                                                        className="text-xs text-red-600 hover:underline"
                                                    >
                                                        None
                                                    </button>
                                                </div>
                                            </div>
                                            {availableYears.map(year => (
                                                <label key={year} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedYears.includes(year)}
                                                        onChange={() => toggleYear(year)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                    />
                                                    <span className="text-sm text-gray-700">{year}</span>
                                                </label>
                                            ))}
                                            
                                            {/* Add New Year Button */}
                                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                                <button
                                                    onClick={handleAddNewYear}
                                                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
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
                                                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                            <div className="hidden lg:flex items-center space-x-6 ml-4">
                                {/* Group 1: Main Actions */}
                                <div className="flex items-center space-x-4 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <button
                                        onClick={handleAddBhiksha}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Add Bhiksha
                                    </button>
                                    
                                    <button
                                        onClick={handlePrintStatus}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Bhakt Status
                                    </button>
                                    <button
                                        onClick={handleDownloadSheet}
                                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Status (All)
                                    </button>
                                    <button
                                        onClick={() => setShowViewDonationsModal(true)}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Bhiksha Records
                                    </button>
                                    <div className="h-8 w-px bg-gray-300"></div>
                                    <button
                                        onClick={handleAddBhakt}
                                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        New Bhakt
                                    </button>
                                    
                                    
                                    <div className="h-8 w-px bg-gray-300"></div>
                                    <button
                                        onClick={() => setShowBackupsModal(true)}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Backups
                                    </button>
                                </div>
                                
                                {/* Group 2: System & Navigation */}
                                <div className="flex items-center space-x-3 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    
                                    <button
                                        onClick={() => navigate && navigate('expense')}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Expenses
                                    </button>
                                    <div className="h-8 w-px bg-gray-300"></div>
                                    <button
                                        onClick={() => navigate && navigate('files')}
                                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-md transition duration-200 cursor-pointer shadow-sm"
                                    >
                                        Files
                                    </button>
                                </div>
                            </div>
                       
                    </div>
                </div>
            </header>

            {/* Mobile Action Buttons - Show below header on mobile only */}
            <div className="lg:hidden bg-white border-b border-gray-200">
                <div className="px-4 py-3">
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                        <button
                            onClick={handleAddBhiksha}
                            className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-green-200"
                        >
                            Add Bhiksha
                        </button>
                        <button
                            onClick={() => setShowBackupsModal(true)}
                            className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-red-200"
                        >
                            Backups
                        </button>
                        <button
                            onClick={handlePrintStatus}
                            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-blue-200"
                        >
                            Bhakt Status
                        </button>
                        <button
                            onClick={handleDownloadSheet}
                            className="flex-shrink-0 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-orange-200"
                        >
                            Status (All)
                        </button>
                        <button
                            onClick={handleAddBhakt}
                            className="flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-teal-200"
                        >
                            New Bhakt
                        </button>
                        <button
                            onClick={() => setShowViewDonationsModal(true)}
                            className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-purple-200"
                        >
                            View Donations
                        </button>
                        <button
                            onClick={() => navigate && navigate('expense')}
                            className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-indigo-200"
                        >
                            Expenses
                        </button>
                        <button
                            onClick={() => navigate && navigate('files')}
                            className="flex-shrink-0 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg whitespace-nowrap border-2 border-pink-200"
                        >
                            Files
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content - Excel-like fixed viewport */}
            <main className="flex-1 overflow-hidden">
                {/* Container for fixed height table */}
                <div className="h-full px-2 py-2">
                    {/* Activity Summary */}
                    {/* <ActivitySummary /> */}
                    
                    <div className="h-full max-h-[calc(100vh-10px)] overflow-hidden">
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
