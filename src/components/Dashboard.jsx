import { logout } from '../lib/supabase';

const Dashboard = ({ onLogout }) => {
    const handleLogout = () => {
        logout();
        onLogout();
    };

    const authMode = sessionStorage.getItem('auth_mode') || 'unknown';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Ashram Donation Dashboard
                            </h1>
                            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Auth: {authMode}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Welcome to Dashboard
                    </h2>
                    <p className="text-gray-600">
                        Dashboard content will be implemented here based on your requirements.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
