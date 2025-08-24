import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import BhikshaTable from './BhikshaTable';
import AddBhaktModal from './AddBhaktModal';
import AddBhikshaModal from './AddBhikshaModal';
import PrintStatusModal from './PrintStatusModal';
import AddYearModal from './AddYearModal';
import { AVAILABLE_YEARS, DEFAULT_SELECTED_YEARS, addYear } from '../config/years';

const Dashboard = ({ onLogout }) => {
    const [isEditMode, setIsEditMode] = useState(false); // Default to locked mode
    const [showAddBhaktModal, setShowAddBhaktModal] = useState(false);
    const [showAddBhikshaModal, setShowAddBhikshaModal] = useState(false);
    const [showPrintStatusModal, setShowPrintStatusModal] = useState(false);
    const [showAddYearModal, setShowAddYearModal] = useState(false);
    const [selectedYears, setSelectedYears] = useState(DEFAULT_SELECTED_YEARS);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [availableYears, setAvailableYears] = useState([...AVAILABLE_YEARS]);
    const { isDark, toggleTheme } = useTheme();

    const toggleYear = (year) => {
        setSelectedYears(prev => 
            prev.includes(year) 
                ? prev.filter(y => y !== year)
                : [...prev, year].sort()
        );
    };

    const handleAddNewYear = () => {
        setShowAddYearModal(true);
        setShowYearDropdown(false);
    };

    const handleAddYear = (year) => {
        const success = addYear(year);
        if (success) {
            setAvailableYears([...AVAILABLE_YEARS]);
            setSelectedYears(prev => [...prev, year].sort());
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
        // Will implement CSV/Excel download
        console.log('Download sheet');
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
                                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                                                        onClick={() => setSelectedYears(availableYears)}
                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedYears([])}
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
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <button
                                                    onClick={handleAddNewYear}
                                                    className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span>Add New Year</span>
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
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition duration-200"
                                >
                                    Add New Bhiksha
                                </button>
                                <button
                                    onClick={handlePrintStatus}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition duration-200"
                                >
                                    Print Bhakt Status
                                </button>
                                <button
                                    onClick={handleDownloadSheet}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition duration-200"
                                >
                                    Download Sheet
                                </button>
                                <button
                                    onClick={handleAddBhakt}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition duration-200"
                                >
                                    Add New Bhakt
                                </button>
                            </div>
                            
                            {/* Edit/Lock Toggle */}
                            <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${isEditMode ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
                                    Locked
                                </span>
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        isEditMode 
                                            ? 'bg-green-600' 
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                    title={isEditMode ? 'Switch to Locked Mode' : 'Switch to Edit Mode'}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            isEditMode ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className={`text-sm font-medium ${isEditMode ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Edit
                                </span>
                            </div>
                            
                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {isDark ? (
                                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>

                            {/* Logout Button */}
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                                title="Logout"
                            >
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                       
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
                    </div>
                </div>
            </div>

            {/* Main Content - Excel-like fixed viewport */}
            <main className="flex-1 overflow-hidden">
                {/* Container for fixed height table */}
                <div className="h-full px-2 sm:px-4 py-6">
                    <div className="h-full max-h-[calc(100vh-180px)] overflow-hidden">
                        <BhikshaTable isEditMode={isEditMode} selectedYears={selectedYears} />
                    </div>
                </div>
            </main>

            {/* Modals */}
            <AddBhaktModal 
                isOpen={showAddBhaktModal} 
                onClose={() => setShowAddBhaktModal(false)} 
            />
            
            <AddBhikshaModal 
                isOpen={showAddBhikshaModal} 
                onClose={() => setShowAddBhikshaModal(false)} 
            />
            
            <PrintStatusModal 
                isOpen={showPrintStatusModal} 
                onClose={() => setShowPrintStatusModal(false)} 
            />

            <AddYearModal 
                isOpen={showAddYearModal} 
                onClose={() => setShowAddYearModal(false)}
                onAddYear={handleAddYear}
                existingYears={availableYears}
            />
        </div>
    );
};

export default Dashboard;
