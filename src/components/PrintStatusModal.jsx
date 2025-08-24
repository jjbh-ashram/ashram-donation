import { useState } from 'react';
import Modal from './Modal';

const PrintStatusModal = ({ isOpen, onClose }) => {
    const [printOptions, setPrintOptions] = useState({
        format: 'summary',
        year: '2025',
        includeDetails: false,
        orientation: 'portrait'
    });

    const handlePrint = () => {
        // Handle print logic
        console.log('Print with options:', printOptions);
        // Open print dialog or generate PDF
        window.print();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Print Bhakt Status">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Print Format
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="summary"
                                checked={printOptions.format === 'summary'}
                                onChange={(e) => setPrintOptions({ ...printOptions, format: e.target.value })}
                                className="mr-2"
                            />
                            Summary Report
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="detailed"
                                checked={printOptions.format === 'detailed'}
                                onChange={(e) => setPrintOptions({ ...printOptions, format: e.target.value })}
                                className="mr-2"
                            />
                            Detailed Report
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="monthly"
                                checked={printOptions.format === 'monthly'}
                                onChange={(e) => setPrintOptions({ ...printOptions, format: e.target.value })}
                                className="mr-2"
                            />
                            Monthly Breakdown
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                    </label>
                    <select
                        value={printOptions.year}
                        onChange={(e) => setPrintOptions({ ...printOptions, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="both">Both Years</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Page Orientation
                    </label>
                    <select
                        value={printOptions.orientation}
                        onChange={(e) => setPrintOptions({ ...printOptions, orientation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>

                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={printOptions.includeDetails}
                            onChange={(e) => setPrintOptions({ ...printOptions, includeDetails: e.target.checked })}
                            className="mr-2"
                        />
                        Include contact details
                    </label>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Preview:</strong> {printOptions.format} format for {printOptions.year}, 
                        {printOptions.orientation} orientation
                        {printOptions.includeDetails && ', with contact details'}
                    </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Print / Save PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PrintStatusModal;
