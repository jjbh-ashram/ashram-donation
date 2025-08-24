import { useEffect, useState } from 'react';
import { client, PROJECT_CONFIG } from './lib/appwrite';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  useEffect(() => {
    // Test Appwrite connection
    const testConnection = async () => {
      try {
        // Simple way to test if Appwrite is connected
        await client.call('get', '/health');
        setConnectionStatus('✅ Connected to Appwrite');
      } catch (error) {
        console.error('Connection error:', error);
        setConnectionStatus('❌ Failed to connect to Appwrite');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          Ashram Donation
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Project Setup</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Project ID:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {PROJECT_CONFIG.projectId}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Project Name:</span>
              <span className="text-sm font-medium">
                {PROJECT_CONFIG.projectName}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Endpoint:</span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {PROJECT_CONFIG.endpoint}
              </span>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Connection Status:</span>
                <span className="text-sm font-medium">
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
