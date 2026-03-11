import React from 'react';
import '../css/dashboard.css';
import Nav from '../components/Nav';
import LogoutButton from '../components/LogoutButton';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ResearcherDashboard = () => {
    const { user, getRoleEmoji } = useAuth();
    const navigate = useNavigate();
    
    const userName = user?.name || 'Researcher';
    const userRole = user?.role || 'researcher';
    const organization = user?.organization || '';
    const expertise = user?.expertise || '';

    // Analytics data
    const stats = [
        { label: 'Pending Validations', value: '12', icon: '✓', color: 'text-yellow-400' },
        { label: 'Data Points', value: '1,234', icon: '📊', color: 'text-primary' },
        { label: 'Publications', value: '5', icon: '📄', color: 'text-blue-400' },
        { label: 'Collaborations', value: '8', icon: '🤝', color: 'text-purple-400' },
    ];

    // Pending validations
    const pendingValidations = [
        { id: 1, species: 'Coral Reef Assessment', location: 'Great Barrier Reef', date: 'Feb 8', type: 'Data' },
        { id: 2, species: 'Migratory Bird Count', location: 'Coastal Region', date: 'Feb 7', type: 'Observation' },
        { id: 3, species: 'Water Quality Analysis', location: 'Amazon Delta', date: 'Feb 6', type: 'Sample' },
    ];

    // Recent data submissions
    const recentSubmissions = [
        { id: 1, title: 'Biodiversity Index Report', status: 'Analyzed', date: 'Feb 5' },
        { id: 2, title: 'Species Distribution Map', status: 'Verified', date: 'Feb 3' },
    ];

    return (
        <div className="min-h-screen pb-28 font-sans selection:bg-primary/30">
            {/* Header */}
            <div className="flex items-center pt-6 justify-between">
                <div className="flex-1 flex flex-col items-center">
                    <h2 className="frosted-text text-lg font-bold tracking-tight">Researcher Dashboard</h2>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-neon-green font-bold">Bio Sentinel</span>
                </div>
                <div className="text-2xl mr-4">
                    {getRoleEmoji(userRole)}
                </div>
            </div>
            
            <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-8">
                {/* Profile Card */}
                <section className="glass-panel rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="relative">
                            <div 
                                className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center neon-outline border-primary"
                            >
                                <span className="material-symbols-outlined text-white text-4xl">science</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-black w-6 h-6 flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                                <span className="material-symbols-outlined text-[14px] font-bold">{getRoleEmoji(userRole)}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{userName}</h2>
                            <p className="text-white/50 text-xs font-medium tracking-wide">{getRoleEmoji(userRole)} Researcher</p>
                            {organization && (
                                <p className="text-white/40 text-xs mt-1">{organization}</p>
                            )}
                            {expertise && (
                                <p className="text-white/40 text-xs">{expertise}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {stats.map((stat, index) => (
                            <div key={index} className="glass-pill flex flex-col items-center justify-center py-4">
                                <p className={`text-xl font-bold ${stat.color} leading-none mb-1`}>{stat.value}</p>
                                <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter text-center">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pending Validations */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">Pending Validations</h3>
                        <span className="bg-yellow-400/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full">
                            {pendingValidations.length}
                        </span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {pendingValidations.map(item => (
                            <div key={item.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-yellow-400/20">
                                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                                    <span className="text-yellow-400 text-lg">✓</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white text-xs font-bold">{item.species}</h4>
                                    <p className="text-white/40 text-[10px]">{item.location} • {item.date}</p>
                                </div>
                                <button className="bg-yellow-400/20 text-yellow-400 text-xs px-3 py-1 rounded-lg border border-yellow-400/30 hover:bg-yellow-400/30 transition-colors">
                                    Review
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Analytics Quick Access */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Analytics</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => navigate('/map')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">📊</span>
                            <span className="text-white text-xs font-bold">Data Explorer</span>
                        </button>
                        <button 
                            onClick={() => navigate('/report')}
                            className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                        >
                            <span className="text-2xl">📈</span>
                            <span className="text-white text-xs font-bold">Reports</span>
                        </button>
                        <button className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors">
                            <span className="text-2xl">🗺️</span>
                            <span className="text-white text-xs font-bold">Spatial Data</span>
                        </button>
                        <button className="glass-panel p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors">
                            <span className="text-2xl">🤝</span>
                            <span className="text-white text-xs font-bold">Collaborations</span>
                        </button>
                    </div>
                </section>

                {/* Recent Submissions */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Recent Submissions</h3>
                        <button className="text-primary text-[10px] uppercase tracking-wider hover:underline">
                            View All →
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {recentSubmissions.map(item => (
                            <div key={item.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary text-lg">📄</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white text-xs font-bold">{item.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-white/40 text-[10px]">{item.date}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            item.status === 'Verified' ? 'bg-green-400/20 text-green-400' : 'bg-blue-400/20 text-blue-400'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Alerts Section */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Alerts</h3>
                    <button 
                        onClick={() => navigate('/alert')}
                        className="glass-panel bg-white/[0.03] border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                            <span className="text-red-400 text-lg">🔔</span>
                        </div>
                        <div className="flex-1 text-left">
                            <h4 className="text-white text-xs font-bold">System Alerts</h4>
                            <p className="text-white/40 text-[10px]">3 new critical alerts</p>
                        </div>
                        <span className="text-white/30">→</span>
                    </button>
                </section>
                <LogoutButton />
            </main>

            <Nav />
        </div>
    );
};

export default ResearcherDashboard;
