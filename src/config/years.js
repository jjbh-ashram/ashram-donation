// Centralized year configuration for the application
// This is the single source of truth for all available years

export const AVAILABLE_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export const DEFAULT_SELECTED_YEARS = [...AVAILABLE_YEARS];

// Helper functions
export const getMinYear = () => Math.min(...AVAILABLE_YEARS);
export const getMaxYear = () => Math.max(...AVAILABLE_YEARS);

export const getNextYear = () => getMaxYear() + 1;

export const addYear = (year) => {
    if (!AVAILABLE_YEARS.includes(year)) {
        AVAILABLE_YEARS.push(year);
        AVAILABLE_YEARS.sort();
        return true;
    }
    return false;
};

export const removeYear = (year) => {
    const index = AVAILABLE_YEARS.indexOf(year);
    if (index > -1) {
        AVAILABLE_YEARS.splice(index, 1);
        return true;
    }
    return false;
};

export const formatYearRange = (years) => {
    if (years.length === 0) return 'None selected';
    if (years.length === 1) return years[0].toString();
    return `${Math.min(...years)}-${Math.max(...years)}`;
};
