import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const Login = () => {
    // Added signInWithGoogle to the destructured context
    const { user, profileComplete, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            if (!profileComplete) {
                navigate('/profile-setup');
            } else {
                // Redirect to appropriate dashboard based on role
                const dashboardPath = user.role 
                    ? `/dashboard/${user.role}`
                    : '/dashboard';
                navigate(dashboardPath);
            }
        }
    }, [user, profileComplete, navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await signUpWithEmail(formData.name, formData.email, formData.password);
                // After signup, redirect to profile setup
                navigate('/profile-setup');
            } else {
                await signInWithEmail(formData.email, formData.password);
                // After login, check if profile is complete (useAuth will handle redirect)
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Implemented Google Sign In
    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithGoogle();
            // Navigation is handled automatically by the useEffect watching the 'user' object
        } catch (err) {
            setError(err.message || 'Google Sign-In failed. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return <Navigate to={profileComplete ? (user.role ? `/dashboard/${user.role}` : '/dashboard') : '/profile-setup'} replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark">
            <div className="glass-panel p-8 rounded-3xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Bio Sentinel</h1>
                    <p className="text-white/50 text-sm">{isSignUp ? 'Create your account' : 'Sign in to access the platform'}</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {isSignUp && (
                        <div className="mb-4">
                            <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                                placeholder="Enter your name"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                {/* Divider and Google Sign In (Uncommented and connected) */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-white/30 text-xs">OR</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    type="button" 
                    className="w-full bg-white/5 border border-white/10 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>

                {/* Toggle Sign In/Sign Up */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }}
                        className="text-white/50 hover:text-white text-sm transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;