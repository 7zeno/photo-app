// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Helper to set Auth Token ---
const setAuthToken = (token) => {
    if (token) {
        axios.defaults.headers.common['x-auth-token'] = token;
    } else {
        delete axios.defaults.headers.common['x-auth-token'];
    }
};

// --- API URL ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- Main App Component ---
function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [view, setView] = useState('public'); // 'public', 'login', 'dashboard'

    useEffect(() => {
        if (token) {
            setAuthToken(token);
            setIsAuthenticated(true);
            setView('dashboard'); // If logged in, show dashboard first
        } else {
            setIsAuthenticated(false);
            setView('public'); // If not logged in, show public gallery
        }
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard />;
            case 'login':
                return <LoginView setToken={setToken} setView={setView} />;
            case 'public':
            default:
                return <PublicGallery />;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8 max-w-6xl">
                <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <h1 className="text-3xl font-bold text-white">PhotoCloud</h1>
                    <nav className="flex items-center gap-4">
                        <button onClick={() => setView('public')} className={`font-bold py-2 px-4 rounded-lg transition-colors ${view === 'public' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            Public Gallery
                        </button>
                        {isAuthenticated ? (
                            <>
                                <button onClick={() => setView('dashboard')} className={`font-bold py-2 px-4 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    My Dashboard
                                </button>
                                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setView('login')} className={`font-bold py-2 px-4 rounded-lg transition-colors ${view === 'login' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                Login / Register
                            </button>
                        )}
                    </nav>
                </header>

                <main>
                    {renderView()}
                </main>
            </div>
        </div>
    );
}

// --- Login/Register View ---
const LoginView = ({ setToken, setView }) => {
    const [isLogin, setIsLogin] = useState(true);
    return (
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <AuthForm isLogin={isLogin} setToken={setToken} />
            <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-cyan-400 hover:text-cyan-300 w-full text-center">
                {isLogin ? "Need an account? Register" : "Have an account? Login"}
            </button>
        </div>
    );
};

// --- Auth Form Component ---
const AuthForm = ({ isLogin, setToken }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">{isLogin ? 'Login' : 'Register'}</h2>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
            <div>
                <label className="block text-sm font-medium text-gray-400">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-lg shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" required />
            </div>
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                {isLogin ? 'Login' : 'Register'}
            </button>
        </form>
    );
};

// --- User's Private Dashboard Component ---
const Dashboard = () => {
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');

    const fetchPhotos = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/photos`);
            setPhotos(res.data);
        } catch (err) {
            setError('Could not fetch your photos.');
        }
    };

    useEffect(() => { fetchPhotos(); }, []);

    const handleUploadSuccess = (newPhoto) => { setPhotos([newPhoto, ...photos]); };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this photo?')) {
            try {
                await axios.delete(`${API_URL}/api/photos/${id}`);
                setPhotos(photos.filter(p => p._id !== id));
            } catch (err) {
                setError('Failed to delete photo.');
            }
        }
    };

    return (
        <div>
            <UploadForm onUploadSuccess={handleUploadSuccess} />
            {error && <p className="text-red-400 my-4">{error}</p>}
            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4 text-white">Your Private Gallery</h2>
                {photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map(photo => (
                            <div key={photo._id} className="relative group bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                                <img src={photo.imageUrl} alt={photo.title} className="w-full h-60 object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                                    <p className="text-white font-bold">{photo.title}</p>
                                    <div>
                                       <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer" download className="text-sm bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md mr-2">Download</a>
                                       <button onClick={() => handleDelete(photo._id)} className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-10">Your gallery is empty. Upload your first photo!</p>
                )}
            </div>
        </div>
    );
};

// --- Upload Form Component ---
const UploadForm = ({ onUploadSuccess }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !title) { setError('Please provide a title and select a file.'); return; }
        setError('');
        setIsUploading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('image', file);

        try {
            const res = await axios.post(`${API_URL}/api/photos/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUploadSuccess(res.data);
            setTitle('');
            setFile(null);
            e.target.reset();
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
            <h3 className="text-xl font-bold mb-4 text-white">Upload a New Photo</h3>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Photo Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" required />
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700" required />
                <button type="submit" disabled={isUploading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500">
                    {isUploading ? 'Uploading...' : 'Upload'}
                </button>
            </form>
        </div>
    );
};

// --- NEW Public Gallery Component ---
const PublicGallery = () => {
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPublicPhotos = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/photos/public`);
                setPhotos(res.data);
            } catch (err) {
                setError('Could not load the public gallery. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPublicPhotos();
    }, []);

    if (isLoading) {
        return <p className="text-center text-gray-400 py-10">Loading Gallery...</p>;
    }

    if (error) {
        return <p className="text-center text-red-400 py-10">{error}</p>;
    }

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Public Gallery</h2>
            {photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map(photo => (
                        <div key={photo._id} className="relative group bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                            <img src={photo.imageUrl} alt={photo.title} className="w-full h-60 object-cover" />
                             <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white font-bold truncate">{photo.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-10">The gallery is empty. Be the first to upload a photo!</p>
            )}
        </div>
    );
};

export default App;
