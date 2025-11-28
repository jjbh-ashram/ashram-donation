import { useState, useEffect } from 'react';
import * as GDrive from '../lib/googleDrive';

const FileStorageGDrive = ({ navigate }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [folderName, setFolderName] = useState('');
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [previewFiles, setPreviewFiles] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [isAutoAuthenticated, setIsAutoAuthenticated] = useState(false);
    
    // Folder and file management
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [filesInFolder, setFilesInFolder] = useState([]);
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    useEffect(() => {
        const init = async () => {
            try {
                setInitializing(true);
                await GDrive.initGoogleDrive();
                
                const autoAuthSuccess = await GDrive.autoAuthenticate();
                
                if (autoAuthSuccess) {
                    console.log('✅ Automatically signed in with refresh token');
                    setIsSignedIn(true);
                    setIsAutoAuthenticated(true);
                    await fetchFoldersAndFiles();
                } else {
                    const signedIn = GDrive.isSignedIn();
                    setIsSignedIn(signedIn);
                    setIsAutoAuthenticated(false);
                    
                    if (signedIn) {
                        await fetchFoldersAndFiles();
                    }
                }
            } catch (error) {
                console.error('Failed to initialize Google Drive:', error);
                alert('Failed to initialize Google Drive. Please check your configuration.');
            } finally {
                setInitializing(false);
            }
        };

        init();
    }, []);

    const handleSignIn = async () => {
        try {
            await GDrive.signIn();
            setIsSignedIn(true);
            await fetchFoldersAndFiles();
        } catch (error) {
            console.error('Sign in failed:', error);
            alert('Failed to sign in to Google Drive. Please try again.');
        }
    };

    const handleSignOut = () => {
        GDrive.signOut();
        setIsSignedIn(false);
        setFolders([]);
        setFilesInFolder([]);
        setCurrentFolder(null);
        setCurrentFolderId(null);
        setBreadcrumbs([]);
    };

    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        setSelectedFiles(newFiles);
        
        const previews = newFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }));
        setPreviewFiles(previews);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            alert('Please enter a folder name');
            return;
        }

        try {
            await GDrive.createFolder(newFolderName.trim());
            setNewFolderName('');
            setShowCreateFolder(false);
            await fetchFoldersAndFiles();
            alert(`Folder "${newFolderName.trim()}" created successfully!`);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Error creating folder: ' + error.message);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select files to upload');
            return;
        }

        try {
            setUploading(true);
            const folder = folderName.trim();

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];

                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: 0
                }));

                try {
                    await GDrive.uploadFile(file, folder, (progress) => {
                        setUploadProgress(prev => ({
                            ...prev,
                            [file.name]: Math.round(progress)
                        }));
                    });

                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: 100
                    }));
                } catch (error) {
                    console.error('Upload error for file:', file.name, error);
                    throw error;
                }
            }

            await fetchFoldersAndFiles();
            
            const location = folder ? `folder "${folder}"` : 'ashramapp root';
            alert(`Files uploaded successfully to ${location}!`);
            
            setSelectedFiles([]);
            setPreviewFiles([]);
            setFolderName('');
            
            setTimeout(() => {
                setUploadProgress({});
            }, 1000);
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const fetchFoldersAndFiles = async () => {
        try {
            setLoading(true);

            if (currentFolderId) {
                // Inside a folder - show subfolders and files
                const [subfolders, files] = await Promise.all([
                    GDrive.listFolders(currentFolderId),
                    GDrive.listFiles(currentFolderId)
                ]);

                const subfoldersWithCounts = await Promise.all(
                    subfolders.map(async (folder) => {
                        const [folderFiles, folderSubfolders] = await Promise.all([
                            GDrive.listFiles(folder.id),
                            GDrive.listFolders(folder.id)
                        ]);
                        return {
                            ...folder,
                            filesCount: folderFiles.length,
                            foldersCount: folderSubfolders.length
                        };
                    })
                );

                setFolders(subfoldersWithCounts);
                setFilesInFolder(files);
            } else {
                // At root level - show folders AND root files
                const rootFolderId = await GDrive.ensureRootFolder();
                const [rootFolders, rootFiles] = await Promise.all([
                    GDrive.getFoldersWithCounts(),
                    GDrive.listFiles(rootFolderId)
                ]);
                setFolders(rootFolders);
                setFilesInFolder(rootFiles); // Show files at root level
            }
        } catch (error) {
            console.error('Error fetching folders/files:', error);
            alert('Error loading files: ' + error.message);
            setFolders([]);
            setFilesInFolder([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSignedIn) {
            fetchFoldersAndFiles();
        }
    }, [currentFolderId, isSignedIn]);

    const handleFolderClick = (folder) => {
        setBreadcrumbs([...breadcrumbs, { name: folder.name, id: folder.id }]);
        setCurrentFolder(folder.name);
        setCurrentFolderId(folder.id);
    };

    const handleBackToFolders = () => {
        setCurrentFolder(null);
        setCurrentFolderId(null);
        setBreadcrumbs([]);
    };

    const handleBreadcrumbClick = (index) => {
        if (index === -1) {
            handleBackToFolders();
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            const targetFolder = newBreadcrumbs[newBreadcrumbs.length - 1];
            setBreadcrumbs(newBreadcrumbs);
            setCurrentFolder(targetFolder.name);
            setCurrentFolderId(targetFolder.id);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        try {
            await GDrive.deleteFile(deleteConfirm.id);
            await fetchFoldersAndFiles();
            alert('File deleted successfully!');
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + error.message);
            setDeleteConfirm(null);
        }
    };

    const handleDownload = async (file) => {
        try {
            // Show loading state if needed (optional, but good UX)
            // For now just call the download function
            await GDrive.downloadFile(file);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file. Please try again.');
        }
    };

    const handleShare = async (file) => {
        try {
            // 1. Make file public
            await GDrive.setFilePublic(file.id);
            
            // 2. Get and copy link
            const url = GDrive.getFileUrl(file);
            await navigator.clipboard.writeText(url);
            
            alert('File permission updated to "Anyone with link" and link copied to clipboard!');
        } catch (error) {
            console.error('Error sharing file:', error);
            // Fallback if permission update fails
            const url = GDrive.getFileUrl(file);
            prompt('Could not update permissions automatically. Copy this link:', url);
        }
    };

    const handleDeleteFile = (file) => {
        setDeleteConfirm(file);
    };

    if (initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
                    <p className="text-sm text-gray-600">Initializing Google Drive...</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <header className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                                श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम
                            </h1>
                            <button
                                onClick={() => navigate && navigate('dashboard')}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition cursor-pointer"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">File Storage</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Sign in with Google to access your files
                        </p>
                        <button
                            onClick={handleSignIn}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition cursor-pointer"
                        >
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                            श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम
                        </h1>
                        <h1 className="sm:block hidden text-xl sm:text-2xl font-bold text-gray-900">
                            File Storage
                        </h1>
                        <div className="flex items-center space-x-3">
                            {!isAutoAuthenticated && (
                                <button
                                    onClick={handleSignOut}
                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition cursor-pointer"
                                >
                                    Sign Out
                                </button>
                            )}
                            <button
                                onClick={() => navigate && navigate('dashboard')}
                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition cursor-pointer"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        
                        {/* Upload Section */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow border border-gray-200">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Upload Files</h2>
                                </div>
                                
                                <div className="p-4 space-y-4">
                                    {/* File Selection */}
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                                        <label className="cursor-pointer block">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-medium text-gray-700">Choose Files</span>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Click to select files</p>
                                        </label>
                                    </div>

                                    {/* Selected Files */}
                                    {previewFiles.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-sm sm:text-base font-medium text-gray-700">
                                                Selected Files ({previewFiles.length})
                                            </p>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {previewFiles.map((file, index) => (
                                                    <div key={index} className="border border-gray-200 rounded p-2 bg-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            {file.url ? (
                                                                <img src={file.url} alt={file.name} className="w-10 h-10 object-cover rounded" />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                                <p className="text-xs sm:text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {uploading && uploadProgress[file.name] !== undefined && (
                                                            <div className="mt-2">
                                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                    <div
                                                                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                                        style={{ width: `${uploadProgress[file.name]}%` }}
                                                                    ></div>
                                                                </div>
                                                                <p className="text-xs sm:text-sm text-blue-600 mt-1">{Math.round(uploadProgress[file.name])}%</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Folder Selection */}
                                            <div>
                                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                                                    Select Folder (Optional)
                                                </label>
                                                <select
                                                    value={folderName}
                                                    onChange={(e) => setFolderName(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Root (ashramapp)</option>
                                                    {folders.map((folder) => (
                                                        <option key={folder.id} value={folder.name}>
                                                            {folder.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                
                                                <button
                                                    onClick={() => setShowCreateFolder(!showCreateFolder)}
                                                    className="mt-2 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm sm:text-base font-medium rounded-md transition border border-gray-300"
                                                >
                                                    {showCreateFolder ? 'Cancel' : '+ Create New Folder'}
                                                </button>

                                                {showCreateFolder && (
                                                    <div className="mt-2 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={newFolderName}
                                                            onChange={(e) => setNewFolderName(e.target.value)}
                                                            placeholder="Enter folder name"
                                                            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <button
                                                            onClick={handleCreateFolder}
                                                            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base font-medium rounded-md transition"
                                                        >
                                                            Create Folder
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Upload Button */}
                                            <button
                                                onClick={handleUpload}
                                                disabled={uploading}
                                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                {uploading ? 'Uploading...' : 'Upload to Google Drive'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Files Browser */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow border border-gray-200">
                                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center mb-3">
                                    <h2 className="text-sm font-semibold text-gray-900">Your Files</h2>
                                    <a
                                                            href="https://drive.google.com/drive/folders/1nh--1wnAxADMTT5QQT3_u4TQVkpEXqnl?usp=drive_link"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                        >
                                                            Open in Drive
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </a>
                                </div>

                                {/* Breadcrumbs */}
                                {breadcrumbs.length > 0 && (
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center gap-2 flex-wrap text-sm sm:text-base">
                                            <button
                                                onClick={handleBackToFolders}
                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded transition"
                                            >
                                                ← Back
                                            </button>
                                            <button
                                                onClick={() => handleBreadcrumbClick(-1)}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                ashramapp
                                            </button>
                                            {breadcrumbs.map((crumb, index) => (
                                                <span key={crumb.id} className="flex items-center">
                                                    <span className="mx-1 text-gray-400">/</span>
                                                    <button
                                                        onClick={() => handleBreadcrumbClick(index)}
                                                        className="text-gray-700 hover:underline"
                                                    >
                                                        {crumb.name}
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-4">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                            <p className="text-sm sm:text-base text-gray-600">Loading...</p>
                                        </div>
                                    ) : !currentFolder ? (
                                        /* Root View - Show Folders and Files */
                                        <div className="space-y-6">
                                            {/* Folders Section */}
                                            <div>
                                                <p className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                                                    Folders ({folders.length})
                                                </p>
                                                {folders.length === 0 ? (
                                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                        </svg>
                                                        <p className="text-sm sm:text-base text-gray-600">No folders yet</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {folders.map((folder) => (
                                                            <button
                                                                key={folder.id}
                                                                onClick={() => handleFolderClick(folder)}
                                                                className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition text-left"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <svg className="w-10 h-10 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                                    </svg>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                                                            {folder.name}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-500">
                                                                            <span>{folder.filesCount || 0} files</span>
                                                                            {folder.foldersCount > 0 && (
                                                                                <span>• {folder.foldersCount} folders</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Files Section */}
                                            {filesInFolder.length > 0 && (
                                                <div>
                                                    
                                                        <p className="text-sm sm:text-base font-medium text-gray-700">
                                                            Files in Root ({filesInFolder.length})
                                                        </p>
                                                        
                                                    
                                                    <div className="space-y-2">
                                                        {filesInFolder.map((file) => (
                                                            <div key={file.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition">
                                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                                    <div className="flex-shrink-0">
                                                                        {file.thumbnailLink ? (
                                                                            <img src={file.thumbnailLink} alt={file.name} className="w-10 h-10 object-cover rounded" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm   sm:text-base font-medium text-gray-900 truncate">{file.name}</p>
                                                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                                                                            <span>{formatFileSize(file.size)}</span>
                                                                            {file.createdTime && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span>{new Date(file.createdTime).toLocaleDateString('en-IN')}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                                                        <a
                                                                            href={file.webViewLink}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md transition text-center"
                                                                        >
                                                                            View
                                                                        </a>
                                                                        <button
                                                                            onClick={() => handleShare(file)}
                                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium rounded-md transition"
                                                                        >
                                                                            Share
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDownload(file)}
                                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-md transition text-center"
                                                                        >
                                                                            Download
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteFile(file)}
                                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium rounded-md transition"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Files View */
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-sm sm:text-base font-medium text-gray-700">
                                                    Files in {currentFolder} ({filesInFolder.length})
                                                </p>
                                                <a
                                                    href="https://drive.google.com/drive/folders/1nh--1wnAxADMTT5QQT3_u4TQVkpEXqnl?usp=drive_link"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                >
                                                    Open in Drive
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </div>
                                            {filesInFolder.length === 0 ? (
                                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                                                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-sm sm:text-base text-gray-600">No files in this folder</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {filesInFolder.map((file) => (
                                                        <div key={file.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition">
                                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                                <div className="flex-shrink-0">
                                                                    {file.thumbnailLink ? (
                                                                        <img src={file.thumbnailLink} alt={file.name} className="w-10 h-10 object-cover rounded" />
                                                                    ) : (
                                                                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                            </svg>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{file.name}</p>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                        <span>{formatFileSize(file.size)}</span>
                                                                        {file.createdTime && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>{new Date(file.createdTime).toLocaleDateString('en-IN')}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                                                    <a
                                                                        href={file.webViewLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition text-center"
                                                                    >
                                                                        View
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleShare(file)}
                                                                        className="flex-1 sm:flex-none px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium rounded-md transition"
                                                                    >
                                                                        Share
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownload(file)}
                                                                        className="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-md transition text-center"
                                                                    >
                                                                        Download
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteFile(file)}
                                                                        className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium rounded-md transition"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Delete File?</h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-6">
                            Are you sure you want to delete "<strong>{deleteConfirm.name}</strong>"? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm sm:text-base font-medium rounded-md transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-medium rounded-md transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileStorageGDrive;
