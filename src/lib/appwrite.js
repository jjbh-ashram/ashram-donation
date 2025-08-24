import { Client, Functions } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // Your Appwrite Endpoint
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // Your project ID

// Initialize Functions service for cloud function calls
export const functions = new Functions(client);

// Project configuration
export const PROJECT_CONFIG = {
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    projectName: import.meta.env.VITE_APPWRITE_PROJECT_NAME,
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
};

// Auth functions
export const authService = {
    // Verify password with cloud function
    async verifyPassword(password) {
        try {
            const response = await functions.createExecution(
                import.meta.env.VITE_APPWRITE_FUNCTION_VERIFY_PASSWORD, // Function ID from env
                JSON.stringify({ password }),
                false
            );
            
            const result = JSON.parse(response.responseBody);
            if (result.success) {
                // Store session token securely
                sessionStorage.setItem('auth_token', result.token);
                sessionStorage.setItem('auth_timestamp', Date.now().toString());
                return { success: true, token: result.token };
            }
            return { success: false, error: result.error };
        } catch (error) {
            console.error('Password verification error:', error);
            return { success: false, error: 'Verification failed' };
        }
    },

    // Check if user is authenticated
    isAuthenticated() {
        const token = sessionStorage.getItem('auth_token');
        const timestamp = sessionStorage.getItem('auth_timestamp');
        
        if (!token || !timestamp) return false;
        
        // Check if token is expired (24 hours)
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxAge) {
            this.logout();
            return false;
        }
        
        return true;
    },

    // Get current token
    getToken() {
        return sessionStorage.getItem('auth_token');
    },

    // Logout
    logout() {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_timestamp');
    }
};
