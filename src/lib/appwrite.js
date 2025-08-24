import { Client } from 'appwrite';

export const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // Your Appwrite Endpoint
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // Your project ID

// Project configuration
export const PROJECT_CONFIG = {
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    projectName: import.meta.env.VITE_APPWRITE_PROJECT_NAME,
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
};
