// Google Drive API Integration for File Storage
// This replaces Supabase storage with Google Drive

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Google API configuration
// Support both VITE_ prefixed (local dev) and non-prefixed (Vercel production)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.GOOGLE_API_KEY;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN || import.meta.env.GOOGLE_REFRESH_TOKEN;

// Root folder name in Google Drive
const ROOT_FOLDER_NAME = 'ashramapp';

let gapiInited = false;
let gisInited = false;
let tokenClient;
let rootFolderId = null;
let autoAuthAttempted = false;

/**
 * Initialize Google API client
 */
export const initializeGapi = () => {
    return new Promise((resolve, reject) => {
        if (gapiInited) {
            resolve();
            return;
        }

        // Load the Google API client
        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: API_KEY,
                            discoveryDocs: DISCOVERY_DOCS,
                        });
                        gapiInited = true;
                        console.log('✅ Google API client initialized');
                        resolve();
                    } catch (error) {
                        console.error('Error initializing GAPI client:', error);
                        reject(error);
                    }
                });
            };
            script.onerror = reject;
            document.body.appendChild(script);
        } else {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    gapiInited = true;
                    console.log('✅ Google API client initialized');
                    resolve();
                } catch (error) {
                    console.error('Error initializing GAPI client:', error);
                    reject(error);
                }
            });
        }
    });
};

/**
 * Initialize Google Identity Services
 */
export const initializeGis = () => {
    return new Promise((resolve, reject) => {
        if (gisInited) {
            resolve();
            return;
        }

        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // Will be set during sign-in
                });
                gisInited = true;
                console.log('✅ Google Identity Services initialized');
                resolve();
            };
            script.onerror = reject;
            document.body.appendChild(script);
        } else {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // Will be set during sign-in
            });
            gisInited = true;
            console.log('✅ Google Identity Services initialized');
            resolve();
        }
    });
};

/**
 * Automatically authenticate using stored refresh token
 */
export const autoAuthenticate = async () => {
    if (autoAuthAttempted) {
        return isSignedIn();
    }
    
    autoAuthAttempted = true;

    // Check if we have a refresh token
    if (!REFRESH_TOKEN || !CLIENT_SECRET) {
        console.log('⚠️ No refresh token found - manual sign-in required');
        return false;
    }

    try {
        console.log('🔄 Attempting automatic authentication with refresh token...');
        
        // Exchange refresh token for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: REFRESH_TOKEN,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Failed to refresh token:', error);
            return false;
        }

        const data = await response.json();
        
        // Set the access token in gapi client
        window.gapi.client.setToken({
            access_token: data.access_token,
        });

        console.log('✅ Automatically authenticated with refresh token');
        
        // Get or create root folder after auto-auth
        await ensureRootFolder();
        
        return true;
    } catch (error) {
        console.error('❌ Auto-authentication failed:', error);
        return false;
    }
};

/**
 * Sign in to Google and get access token
 */
export const signIn = () => {
    return new Promise((resolve, reject) => {
        try {
            // Check if already signed in
            const token = window.gapi.client.getToken();
            if (token !== null) {
                resolve(token);
                return;
            }

            // Request new token
            tokenClient.callback = async (response) => {
                if (response.error !== undefined) {
                    reject(response);
                    return;
                }
                console.log('✅ Signed in to Google Drive');
                
                // Log the access token info for getting refresh token
                console.log('📋 IMPORTANT: To enable automatic sign-in, you need to get the refresh token.');
                console.log('📋 The current access token will expire. Follow the setup guide to get a refresh token.');
                console.log('📋 Access Token (expires soon):', response.access_token);
                
                // Get or create root folder after sign-in
                await ensureRootFolder();
                resolve(response);
            };

            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
            console.error('Error signing in:', error);
            reject(error);
        }
    });
};

/**
 * Sign out from Google
 */
export const signOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token);
        window.gapi.client.setToken('');
        rootFolderId = null;
        console.log('✅ Signed out from Google Drive');
    }
};

/**
 * Check if user is signed in
 */
export const isSignedIn = () => {
    const token = window.gapi?.client?.getToken();
    return token !== null && token !== undefined;
};

/**
 * Ensure the root "ashramapp" folder exists, create if not
 */
export const ensureRootFolder = async () => {
    if (rootFolderId) return rootFolderId;

    try {
        // Search for existing folder
        const response = await window.gapi.client.drive.files.list({
            q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            rootFolderId = response.result.files[0].id;
            console.log(`✅ Found root folder: ${ROOT_FOLDER_NAME} (${rootFolderId})`);
        } else {
            // Create the folder
            const fileMetadata = {
                name: ROOT_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            };
            const folder = await window.gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });
            rootFolderId = folder.result.id;
            console.log(`✅ Created root folder: ${ROOT_FOLDER_NAME} (${rootFolderId})`);
        }

        return rootFolderId;
    } catch (error) {
        console.error('Error ensuring root folder:', error);
        throw error;
    }
};

/**
 * Create a folder inside the root folder or a parent folder
 */
export const createFolder = async (folderName, parentFolderId = null) => {
    try {
        const parent = parentFolderId || await ensureRootFolder();
        
        // Check if folder already exists
        const existing = await window.gapi.client.drive.files.list({
            q: `name='${folderName}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (existing.result.files && existing.result.files.length > 0) {
            return existing.result.files[0].id;
        }

        // Create new folder
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parent]
        };

        const folder = await window.gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id, name'
        });

        console.log(`✅ Created folder: ${folderName} (${folder.result.id})`);
        return folder.result.id;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};

/**
 * Upload a file to Google Drive
 */
export const uploadFile = async (file, folderName, onProgress = null, customName = null) => {
    try {
        let folderId;
        
        if (folderName && folderName.trim()) {
            // Create/get folder if folder name is provided
            folderId = await createFolder(folderName.trim());
        } else {
            // Upload directly to root ashramapp folder if no folder name
            folderId = await ensureRootFolder();
        }

        // Create file metadata
        const metadata = {
            name: customName || `${Date.now()}_${file.name}`,
            parents: [folderId]
        };

        // Use multipart upload
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const token = window.gapi.client.getToken();
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    console.log(`✅ Uploaded file: ${file.name} (${response.id})`);
                    resolve(response);
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink');
            xhr.setRequestHeader('Authorization', `Bearer ${token.access_token}`);
            xhr.send(form);
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

/**
 * List all folders in root or a specific parent
 */
export const listFolders = async (parentFolderId = null) => {
    try {
        const parent = parentFolderId || await ensureRootFolder();
        
        const response = await window.gapi.client.drive.files.list({
            q: `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, createdTime, modifiedTime)',
            orderBy: 'name',
            pageSize: 1000
        });

        return response.result.files || [];
    } catch (error) {
        console.error('Error listing folders:', error);
        throw error;
    }
};

/**
 * List all files in a folder
 */
export const listFiles = async (folderId) => {
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink)',
            orderBy: 'name',
            pageSize: 1000
        });

        return response.result.files || [];
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
};

/**
 * Get all folders with their file counts
 */
export const getFoldersWithCounts = async (parentFolderId = null) => {
    try {
        const folders = await listFolders(parentFolderId);
        
        // Get file count for each folder
        const foldersWithCounts = await Promise.all(
            folders.map(async (folder) => {
                const files = await listFiles(folder.id);
                const subfolders = await listFolders(folder.id);
                return {
                    ...folder,
                    filesCount: files.length,
                    foldersCount: subfolders.length
                };
            })
        );

        return foldersWithCounts;
    } catch (error) {
        console.error('Error getting folders with counts:', error);
        throw error;
    }
};

/**
 * Delete a file
 */
export const deleteFile = async (fileId) => {
    try {
        await window.gapi.client.drive.files.delete({
            fileId: fileId
        });
        console.log(`✅ Deleted file: ${fileId}`);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

/**
 * Get file download URL
 */
export const getFileUrl = (file) => {
    // Return webContentLink for direct download or webViewLink for preview
    return file.webContentLink || file.webViewLink || '';
};

/**
 * Download file content using API token
 * This avoids 403 errors when the browser is not signed in to the specific Google account
 */
export const downloadFile = async (file) => {
    try {
        const token = window.gapi.client.getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${token.access_token}`
            }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return true;
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
};

/**
 * Get file by ID
 */
export const getFile = async (fileId) => {
    try {
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink'
        });
        return response.result;
    } catch (error) {
        console.error('Error getting file:', error);
        throw error;
    }
};

/**
 * Search files by name
 */
export const searchFiles = async (query, folderId = null) => {
    try {
        const parent = folderId || await ensureRootFolder();
        
        const response = await window.gapi.client.drive.files.list({
            q: `'${parent}' in parents and name contains '${query}' and trashed=false`,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink)',
            orderBy: 'name',
            pageSize: 100
        });

        return response.result.files || [];
    } catch (error) {
        console.error('Error searching files:', error);
        throw error;
    }
};

/**
 * Make file public (anyone with link can view)
 */
export const setFilePublic = async (fileId) => {
    try {
        await window.gapi.client.drive.permissions.create({
            fileId: fileId,
            resource: {
                role: 'reader',
                type: 'anyone'
            }
        });
        console.log(`✅ File ${fileId} is now public`);
        return true;
    } catch (error) {
        console.error('Error setting file public:', error);
        throw error;
    }
};

// Export initialization function
export const initGoogleDrive = async () => {
    try {
        await initializeGapi();
        await initializeGis();
        console.log('✅ Google Drive initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Google Drive:', error);
        throw error;
    }
};
