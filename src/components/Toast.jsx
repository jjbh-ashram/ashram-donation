import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform";
    
    if (!isVisible) {
      return `${baseStyles} opacity-0 translate-x-full`;
    }

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-100 border border-green-400 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-200`;
      case 'error':
        return `${baseStyles} bg-red-100 border border-red-400 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 border border-yellow-400 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200`;
      default:
        return `${baseStyles} bg-blue-100 border border-blue-400 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start">
        <span className="text-lg mr-2">{getIcon()}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">
            {message}
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
