import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FileStorage = ({ navigate }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [folderName, setFolderName] = useState('');
    const [previewFiles, setPreviewFiles] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Tab and bucket management
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'files'
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [filesInFolder, setFilesInFolder] = useState([]);
    // When in 'all' mode we aggregate per-bucket listings here
    const [bucketsData, setBucketsData] = useState([]); // [{ bucket, folders, files }]
    const [viewingBucket, setViewingBucket] = useState(null); // bucket id when drilling into a bucket from 'all'
    
    // Tabs shown in UI (keep only All and Uploaded Files)
    const tabs = [
        { id: 'all', label: 'All Files' },
        { id: 'files', label: 'Uploaded Files', bucket: 'files' }
    ];

    // Full list of buckets we want to include in the "All Files" view.
    // Update this array if you add more buckets in Supabase.
    const bucketList = ['files', 'expense-files', 'backups'];

    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        setSelectedFiles(newFiles);
        
        // Generate previews
        const previews = newFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }));
        setPreviewFiles(previews);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select files to upload');
            return;
        }

        if (!folderName.trim()) {
            alert('Please enter a folder name');
            return;
        }

        try {
            setUploading(true);
            const folder = folderName.trim();

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileName = `${folder}/${Date.now()}_${file.name}`;

                // Set initial progress to show upload started
                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: 10
                }));

                // Simulate progress since Supabase doesn't support real-time progress
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        const currentProgress = prev[file.name] || 10;
                        if (currentProgress < 90) {
                            return {
                                ...prev,
                                [file.name]: currentProgress + 10
                            };
                        }
                        return prev;
                    });
                }, 200);

                try {
                    // Upload ONLY to the 'files' bucket (not expense-files)
                    const { data, error } = await supabase.storage
                        .from('files')
                        .upload(fileName, file);

                    clearInterval(progressInterval);

                    if (error) {
                        console.error('Storage upload error:', error);
                        throw error;
                    }

                    // Complete progress after storage upload
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: 100
                    }));

                    // Try to save metadata to database (optional - won't block if fails)
                    try {
                        const { error: dbError } = await supabase.from('file_storage').insert([{
                            folder: folder,
                            file_name: file.name,
                            file_path: data.path,
                            file_size: file.size,
                            file_type: file.type
                        }]);

                        if (dbError) {
                            console.error('Database insert error (continuing anyway):', dbError);
                            // Don't throw - file is uploaded to storage successfully
                        }
                    } catch (dbError) {
                        console.error('Database error (file uploaded to storage):', dbError);
                        // Continue - storage upload was successful
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    console.error('Upload error for file:', file.name, error);
                    throw error;
                }
            }

            // Fetch files immediately after successful upload
            await fetchFoldersAndFiles();
            
            alert('Files uploaded successfully to "files" bucket!');
            
            // Clear form
            setSelectedFiles([]);
            setPreviewFiles([]);
            setFolderName('');
            
            // Delay clearing progress to show 100% briefly
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

    // Fetch folders and files from current bucket
    const fetchFoldersAndFiles = async () => {
        // Helper to detect folders robustly across Supabase responses
        const isFolderItem = (item) => {
            if (!item) return false;
            // Supabase sometimes returns folders with id === null
            if (item.id === null) return true;
            // Files usually include metadata (size, mimeType)
            if (!item.metadata) return true;
            // Some responses include a `type` or name ending with '/'
            if (item.type === 'folder') return true;
            if (typeof item.name === 'string' && item.name.endsWith('/')) return true;
            return false;
        };

        try {
            setLoading(true);

            
// const {data, error} = await supabase.storage.listBuckets();
//             console.log('Buckets available:', {data,error});
            
            const { data, error } = await supabase.storage.getBucket('backups');
            console.log('Bucket info for "files":', { data, error });

            


            const currentBucket = tabs.find(t => t.id === activeTab)?.bucket || 'files';

            console.log('fetchFoldersAndFiles - bucket:', currentBucket, 'currentFolder:', currentFolder);

            // Common list options
            const listOptions = { limit: 200, offset: 0, sortBy: { column: 'name', order: 'asc' } };

            if (activeTab === 'all' && !viewingBucket) {
                // Aggregate root listings for all buckets in `bucketList` (parallel)
                console.log('Aggregating root listings for buckets:', bucketList);
                const results = await Promise.all(bucketList.map(async (bucketName) => {
                    try {
                        const { data, error } = await supabase.storage.from(bucketName).list('', listOptions);
                        console.log('list response for bucket:', bucketName, { data, error });
                        if (error) return { bucket: bucketName, error, folders: [], files: [] };
                        const foldersList = (data || []).filter(isFolderItem).map(f => ({ ...f }));
                        const filesList = (data || []).filter(item => !isFolderItem(item)).map(f => ({ ...f }));
                        return { bucket: bucketName, folders: foldersList, files: filesList };
                    } catch (err) {
                        console.error('Error listing bucket:', bucketName, err);
                        return { bucket: bucketName, error: err, folders: [], files: [] };
                    }
                }));
                console.log('Aggregated buckets data:', results);
                setBucketsData(results);
                // Represent buckets as folder-like entries for the root UI
                const bucketFolders = results.map(r => ({
                    name: r.bucket,
                    _isBucket: true,
                    foldersCount: r.folders?.length || 0,
                    filesCount: r.files?.length || 0
                }));
                setFolders(bucketFolders);
                setFilesInFolder([]);
                setLoading(false);
                return;
            }

            

            if (currentFolder || viewingBucket) {
                // Fetch files and subfolders in the current folder
                // determine which bucket to use when drilling
                const bucketToUse = viewingBucket || currentBucket;
                const pathToList = currentFolder || '';
                const { data, error } = await supabase.storage.from(bucketToUse).list(pathToList, listOptions);

                console.log('list response for folder:', { bucket: bucketToUse, path: pathToList, data, error });

                if (error) {
                    console.error('Error fetching files in folder:', error);
                    alert(`Error accessing folder: ${error.message}\n\nPlease check bucket policies in Supabase Dashboard.`);
                    setFilesInFolder([]);
                    setFolders([]);
                    setLoading(false);
                    return;
                }

                // Separate subfolders and files returned when listing a folder
                const subfolders = (data || []).filter(isFolderItem).map(f => ({ ...f }));
                const files = (data || []).filter(item => !isFolderItem(item)).map(f => ({ ...f }));

                console.log('Subfolders in current folder:', subfolders);
                console.log('Files in current folder:', files);

                setFolders(subfolders);
                setFilesInFolder(files);
            } else {
                // Fetch top-level folders and root files
                const { data, error } = await supabase.storage.from(currentBucket).list('', listOptions);

                console.log('list response for root:', { bucket: currentBucket, data, error });

                if (error) {
                    console.error('Error fetching root:', error);
                    alert(`Error accessing bucket "${currentBucket}": ${error.message}\n\nPlease ensure:\n1. Bucket exists in Supabase\n2. Bucket has appropriate policies`);
                    setFolders([]);
                    setFilesInFolder([]);
                    setLoading(false);
                    return;
                }

                console.log('Raw root items:', data);

                let foldersList = (data || []).filter(isFolderItem).map(f => ({ ...f }));
                const filesList = (data || []).filter(item => !isFolderItem(item)).map(f => ({ ...f }));

                // Enrich each folder with counts (number of files and subfolders inside)
                try {
                    const enriched = await Promise.all(foldersList.map(async (f) => {
                        try {
                            const { data: inner } = await supabase.storage.from(currentBucket).list(f.name, { limit: 200 });
                            const innerFiles = (inner || []).filter(item => !isFolderItem(item)).length;
                            const innerFolders = (inner || []).filter(item => isFolderItem(item)).length;
                            return { ...f, filesCount: innerFiles, foldersCount: innerFolders };
                        } catch (e) {
                            console.error('Error listing inside folder for count:', f.name, e);
                            return { ...f, filesCount: 0, foldersCount: 0 };
                        }
                    }));
                    foldersList = enriched;
                } catch (e) {
                    console.error('Error enriching folder counts:', e);
                }

                // Log per-item details for easier debugging
                console.log('Parsed root folders:');
                foldersList.forEach((it, idx) => console.log(idx, Object.keys(it), it));
                console.log('Parsed root files:');
                filesList.forEach((it, idx) => console.log(idx, Object.keys(it), it));

                setFolders(foldersList);
                setFilesInFolder(filesList);
            }
        } catch (error) {
            console.error('Error fetching folders/files:', error);
            setFolders([]);
            setFilesInFolder([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch when tab changes, folder changes, or viewingBucket changes
    useEffect(() => {
        fetchFoldersAndFiles();
    }, [activeTab, currentFolder, viewingBucket]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setCurrentFolder(null); // Reset to root when changing tabs
        setViewingBucket(null);
        if (tabId === 'all') {
            // clear per-bucket view
            setBucketsData([]);
        }
    };

    const handleFolderClick = (folderName) => {
        setCurrentFolder(folderName);
    };

    const handleBackToFolders = () => {
        setCurrentFolder(null);
        // when in 'all' mode, go back to bucket list
        setViewingBucket(null);
    };

    const openBucket = (bucketName) => {
        const entry = bucketsData.find(b => b.bucket === bucketName);
        setViewingBucket(bucketName);
        setCurrentFolder(null);
        // enrich entry folders with counts if available
        (async () => {
            try {
                const enriched = await Promise.all((entry?.folders || []).map(async (f) => {
                    try {
                        const { data: inner } = await supabase.storage.from(bucketName).list(f.name || f.path || f.name, { limit: 200 });
                        const innerFiles = (inner || []).filter(item => !((item && item.id === null) || !item.metadata)).length;
                        const innerFolders = (inner || []).filter(item => ((item && item.id === null) || !item.metadata)).length;
                        return { ...f, filesCount: innerFiles, foldersCount: innerFolders };
                    } catch (e) {
                        return { ...f, filesCount: 0, foldersCount: 0 };
                    }
                }));
                setFolders(enriched);
            } catch (e) {
                setFolders(entry?.folders || []);
            }
            setFilesInFolder(entry?.files || []);
        })();
    };

    const fetchFiles = async () => {
        // Deprecated - using fetchFoldersAndFiles instead
        await fetchFoldersAndFiles();
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        try {
            const currentBucket = viewingBucket || tabs.find(t => t.id === activeTab)?.bucket || 'files';
            // build path robustly to avoid double-prefixing
            const buildFilePath = (fileOrName) => {
                let name = typeof fileOrName === 'string' ? fileOrName : (fileOrName?.name || fileOrName?.path || fileOrName?.file_name || '');
                if (!name) return name;
                if (currentFolder) {
                    if (!name.startsWith(currentFolder + '/')) {
                        return `${currentFolder}/${name}`;
                    }
                    return name;
                }
                return name;
            };

            const filePath = buildFilePath(deleteConfirm);

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(currentBucket)
                .remove([filePath]);

            if (storageError) throw storageError;

            // Refresh list
            await fetchFoldersAndFiles();
            
            alert('File deleted successfully!');
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + error.message);
            setDeleteConfirm(null);
        }
    };

    // Build a public URL for a file. Accepts either a string filename or a file object from list().
    const getFileUrl = (fileOrName) => {
        const currentBucket = viewingBucket || tabs.find(t => t.id === activeTab)?.bucket || 'files';
        // Resolve name/path from different shapes
        let name = typeof fileOrName === 'string' ? fileOrName : (fileOrName?.name || fileOrName?.path || fileOrName?.file_name || '');
        if (!name) return '';
        // Avoid duplicating folder prefix
        let filePath = name;
        if (currentFolder) {
            if (!name.startsWith(currentFolder + '/')) {
                filePath = `${currentFolder}/${name}`;
            } else {
                filePath = name;
            }
        }

        const { data } = supabase.storage.from(currentBucket).getPublicUrl(filePath);
        const url = data?.publicUrl || '';
        console.log('getFileUrl - Bucket:', currentBucket, 'Path:', filePath, 'URL:', url);
        return url;
    };

    const handleShare = async (fileOrName) => {
        // Handle both file objects and plain filenames
        const url = getFileUrl(fileOrName);
        try {
            await navigator.clipboard.writeText(url);
            alert('File link copied to clipboard!');
        } catch (error) {
            prompt('Copy this link:', url);
        }
    };

    const handleDeleteFile = (file) => {
        setDeleteConfirm(file);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 max-w-screen-2xl mx-auto w-full">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="relative text-base sm:text-2xl font-black text-gray-900">
                                <span className="absolute inset-0 blur-sm bg-gradient-to-r from-blue-200 via-sky-300 to-blue-200 opacity-40"></span>
                                <span className="relative">श्री श्री प्रभु जगद्बन्धु सुंदर आश्रम</span>
                                {/* Shri Shri Prabhu JagatBandhu Sundar Ashram */}
                        </h1>
                        <button
                            onClick={() => navigate && navigate('dashboard')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition duration-200"
                        >
                            Back to Dashboard
                        </button>
                        
                        
                        
                    </div>
                </div>
            </header>

            {/* Main Content - Split Screen */}
            <div className="flex-1 overflow-hidden bg-gray-100">
                <div className="h-full max-w-screen-2xl mx-auto">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0 shadow-lg">
                    
                        {/* Left Side - Upload Area - Smaller width */}
                        <div className="bg-white border-r border-gray-200 overflow-y-auto col-span-1 lg:col-span-4">
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50">
                            <h2 className="text-lg font-bold text-gray-900">File Storage</h2>
                            <p className="text-xs text-gray-600 mt-1">Upload and manage your files</p>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Upload Zone */}
                            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
                                <div className="text-center">
                                    <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Upload Files</h3>
                                    <p className="mt-1 text-xs text-gray-500">Select multiple files</p>
                                    
                                    <div className="mt-3">
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <span className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Choose Files
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* File Previews */}
                            {previewFiles.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Selected Files ({previewFiles.length})</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {previewFiles.map((file, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-2 bg-white">
                                                <div className="flex items-center space-x-2">
                                                    {file.url ? (
                                                        <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                {uploading && uploadProgress[file.name] !== undefined && (
                                                    <div className="mt-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div
                                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                                                style={{ width: `${uploadProgress[file.name]}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">{Math.round(uploadProgress[file.name])}%</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Folder Name Input */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                            Folder Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={folderName}
                                            onChange={(e) => setFolderName(e.target.value)}
                                            placeholder="e.g., Documents, Images"
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>

                                    {/* Upload Button */}
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading...
                                            </span>
                                        ) : (
                                            'Upload Files'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Files Browser with Tabs - Wider */}
                    <div className="bg-gray-50 flex flex-col col-span-1 lg:col-span-8">
                        {/* Tab Switcher */}
                        <div className="bg-white border-b border-gray-200">
                            <div className="flex space-x-1 px-4 pt-3">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Breadcrumb / Bucket path navigation */}
                        {(viewingBucket || activeTab === 'files' || currentFolder) && (
                            <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center space-x-4 text-sm font-medium text-gray-800">
                                <div className="flex items-center space-x-3 w-full">
                                    <div className="flex items-center space-x-2">
                                        {(viewingBucket || activeTab === 'files') && (
                                            <button
                                                onClick={() => {
                                                    // if we were viewing a bucket from All, Back goes to All buckets
                                                    if (viewingBucket) {
                                                        setViewingBucket(null);
                                                        // repopulate root bucket cards
                                                        fetchFoldersAndFiles();
                                                        return;
                                                    }
                                                    // otherwise just reset folder
                                                    setCurrentFolder(null);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                ← Back
                                            </button>
                                        )}
                                    </div>

                                    <nav className="flex items-center flex-wrap text-sm text-gray-600">
                                        {(() => {
                                            const bucketName = viewingBucket || (activeTab === 'files' ? 'files' : null);
                                            if (!bucketName) return null;
                                            const segments = currentFolder ? currentFolder.split('/').filter(Boolean) : [];
                                            return (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => { setCurrentFolder(null); }}
                                                        className="text-blue-600 font-medium"
                                                    >
                                                        {bucketName}
                                                    </button>
                                                    {segments.map((seg, idx) => (
                                                        <span key={idx} className="flex items-center space-x-2">
                                                            <span className="text-gray-400">/</span>
                                                            <button
                                                                onClick={() => {
                                                                    const newPath = segments.slice(0, idx + 1).join('/');
                                                                    setCurrentFolder(newPath);
                                                                }}
                                                                className="text-gray-700 hover:underline"
                                                            >
                                                                {seg}
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </nav>
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                                    <p className="text-sm text-gray-500">Loading...</p>
                                </div>
                            ) : !currentFolder ? (
                                /* Show Folders */
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        Folders {folders.length > 0 && `(${folders.length})`}
                                    </h3>
                                    {folders.length === 0 && filesInFolder.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                            <p className="text-gray-500 font-medium">No folders yet</p>
                                            <p className="text-sm text-gray-400 mt-1">Upload files to create folders</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                                {folders.map((folder) => (
                                                    <button
                                                        key={folder.name}
                                                        onClick={() => (activeTab === 'all' && !viewingBucket) ? openBucket(folder.name) : setCurrentFolder(folder.name)}
                                                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all group"
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <svg className="w-12 h-12 text-blue-500 group-hover:text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                            </svg>
                                                            <p className="text-sm font-medium text-gray-900 text-center truncate w-full">
                                                                {folder.name}
                                                            </p>
                                                            {folder._isBucket && (
                                                                <p className="text-xs text-gray-500 mt-1">{folder.foldersCount} folders • {folder.filesCount} files</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Root Files */}
                                            {filesInFolder.length > 0 && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                                        Files ({filesInFolder.length})
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {filesInFolder.map((file) => (
                                                            <div key={file.name} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-shrink-0">
                                                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                                        <p className="text-xs text-gray-500">{formatFileSize(file.metadata?.size || 0)}</p>
                                                                    </div>
                                                                    <div className="flex space-x-1 flex-shrink-0">
                                                                        <a
                                                                            href={getFileUrl(file)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                                                        >
                                                                            View
                                                                        </a>
                                                                        <button
                                                                            onClick={() => handleDeleteFile({ name: file.name, id: file.id })}
                                                                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
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
                                        </>
                                    )}
                                </div>
                            ) : (
                                /* Show Files in Folder */
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                        Files in {currentFolder} ({filesInFolder.length})
                                    </h3>
                                    {filesInFolder.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-gray-500 font-medium">No files in this folder</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filesInFolder.map((file) => (
                                                <div key={file.name} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <span className="text-xs text-gray-500">{formatFileSize(file.metadata?.size || 0)}</span>
                                                                {file.created_at && (
                                                                    <>
                                                                        <span className="text-xs text-gray-500">•</span>
                                                                        <span className="text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString('en-IN')}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col space-y-1 flex-shrink-0">
                                                            <a
                                                                href={getFileUrl(file)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors text-center"
                                                            >
                                                                View
                                                            </a>
                                                            <button
                                                                onClick={() => handleShare(file)}
                                                                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded hover:bg-purple-200 transition-colors"
                                                            >
                                                                Share
                                                            </button>
                                                            <a
                                                                href={getFileUrl(file)}
                                                                download={file.name}
                                                                className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors text-center"
                                                            >
                                                                Download
                                                            </a>
                                                            <button
                                                                onClick={() => handleDeleteFile({ name: file.name, id: file.id })}
                                                                className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
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

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete File?</h3>
                        <p className="text-sm text-gray-600 text-center mb-6">
                            Are you sure you want to delete "<strong>{deleteConfirm.name}</strong>"? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md"
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

export default FileStorage;
