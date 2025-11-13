import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FileStorage = ({ navigate }) => {
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [folderName, setFolderName] = useState('');
    const [previewFiles, setPreviewFiles] = useState([]);

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

                // Update progress
                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: 0
                }));

                const { data, error } = await supabase.storage
                    .from('files')
                    .upload(fileName, file, {
                        onUploadProgress: (progress) => {
                            const percent = (progress.loaded / progress.total) * 100;
                            setUploadProgress(prev => ({
                                ...prev,
                                [file.name]: percent
                            }));
                        }
                    });

                if (error) throw error;

                // Save metadata to database
                await supabase.from('file_storage').insert([{
                    folder: folder,
                    file_name: file.name,
                    file_path: data.path,
                    file_size: file.size,
                    file_type: file.type
                }]);
            }

            alert('Files uploaded successfully!');
            setSelectedFiles([]);
            setPreviewFiles([]);
            setFolderName('');
            setUploadProgress({});
            fetchFiles();
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const fetchFiles = async () => {
        try {
            const { data, error } = await supabase
                .from('file_storage')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFiles(data || []);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
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

    const handleDeleteFile = async (file) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('files')
                .remove([file.file_path]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('file_storage')
                .delete()
                .eq('id', file.id);

            if (dbError) throw dbError;

            alert('File deleted successfully!');
            fetchFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + error.message);
        }
    };

    const getFileUrl = (filePath) => {
        return supabase.storage.from('files').getPublicUrl(filePath).data.publicUrl;
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
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

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
<h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            File Storage
                        </h1>
                    {/* Upload Area */}
                    <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8">
                        <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <h3 className="mt-2 text-lg font-medium text-gray-900">Upload Files</h3>
                            <p className="mt-1 text-sm text-gray-500">Select multiple files to upload</p>
                            
                            <div className="mt-4">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <span className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Choose Files
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* File Previews */}
                        {previewFiles.length > 0 && (
                            <div className="mt-6 space-y-3">
                                <h4 className="font-medium text-gray-900">Selected Files:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {previewFiles.map((file, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            {file.url ? (
                                                <img src={file.url} alt={file.name} className="w-full h-32 object-cover rounded mb-2" />
                                            ) : (
                                                <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                            
                                            {/* Progress Bar */}
                                            {uploading && uploadProgress[file.name] !== undefined && (
                                                <div className="mt-2">
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${uploadProgress[file.name]}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress[file.name])}%</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Folder Name and Upload Button */}
                                <div className="flex items-end space-x-3 mt-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Folder Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={folderName}
                                            onChange={(e) => setFolderName(e.target.value)}
                                            placeholder="e.g., Documents, Images, etc."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Files List */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Uploaded Files</h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {files.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No files uploaded yet
                                </div>
                            ) : (
                                files.map((file) => (
                                    <div key={file.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center space-x-4 flex-1">
                                            <div className="flex-shrink-0">
                                                {file.file_type.startsWith('image/') ? (
                                                    <img
                                                        src={getFileUrl(file.file_path)}
                                                        alt={file.file_name}
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{file.file_name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {file.folder} • {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <a
                                                href={getFileUrl(file.file_path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200"
                                            >
                                                View
                                            </a>
                                            <a
                                                href={getFileUrl(file.file_path)}
                                                download={file.file_name}
                                                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200"
                                            >
                                                Download
                                            </a>
                                            <button
                                                onClick={() => handleDeleteFile(file)}
                                                className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileStorage;
