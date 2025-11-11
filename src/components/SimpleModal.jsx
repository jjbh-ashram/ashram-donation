import { useEffect } from 'react';

const SimpleModal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Background overlay - blurred and white tint */}
            <div 
                className="absolute inset-0 bg-white/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal content */}
            <div className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default SimpleModal;
