import React from 'react';
import '../css/dashboard.css';
import Nav from '../components/Nav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';

const CommunityDashboard = () => {
    const { user, getRoleEmoji } = useAuth();
    const navigate = useNavigate();
    
    const userName = user?.name || 'Community Member';
    const userRole = user?.role || 'community';
    const localArea = user?.localArea || '';
    const occupation = user?.occupation || '';
    const onGroundAccess = user?.onGroundAccess || false;

    // Stats
    const stats = [
        { label: 'My Reports', value: '5', icon: '📝' },
        { label: 'Verified', value: '3', icon: '✓' },
        { label: 'Local Alerts', value: '2', icon: '🔔' },
        { label: 'Points', value: '150', icon: '⭐' },
    ];

    // Local alerts
    const localAlerts = [
        { id: 1, title: 'Rare Species Spotted', location: 'Near your area', severity: 'high', time: '2h ago' },
        { id: 2, title: 'Conservation Meeting', location: 'Community Center', severity: 'low', time: '5h ago' },
    ];

    // Quick actions
    const quickActions = [
        { id: 1, title: 'Report Sighting', icon: '📷', action: () => navigate('/report') },
        { id: 2, title: 'View Map', icon: '🗺️', action: () => navigate('/map') },
        { id: 3, title: 'Alerts', icon: '🔔', action: () => navigate('/alert') },
        { id: 4, title: 'Community', icon: '👥', action: () => navigate('/team') },
    ];

    // Recent reports
    const recentReports = [
        { id: 1, species: 'Indian Peacock', status: 'Verified', date: 'Feb 8', location: 'Local Park' },
        { id: 2, species: 'Monitor Lizard', status: 'Pending', date: 'Feb 5', location: 'River Bank' },
    ];

    return (
        <div className="min-h-screen pb-28 font-sans selection:bg-primary/30">
            {/* Header */}
            <div className="flex items-center pt-6 justify-between">
                <div className="flex-1 flex flex-col items-center">
                    <h2 className="frosted-text text-lg font-bold tracking-tight">Community Dashboard</h2>
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
                                <span className="material-symbols-outlined text-white text-4xl">groups</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-black w-6 h-6 flex items-center justify-center rounded-lg shadow-[0_0_10px_rgba(57,255,20,0.5)]">
                                <span className="material-symbols-outlined text-[14px] font-bold">{getRoleEmoji(userRole)}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{userName}</h2>
                            <p className="text-white/50 text-xs font-medium tracking-wide">{getRoleEmoji(userRole)} Guardian</p>
                            {localArea && (
                                <p className="text-white/40 text-xs mt-1">📍 {localArea}</p>
                            )}
                            {occupation && (
                                <p className="text-white/40 text-xs">{occupation}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* On-ground access badge */}
                    {onGroundAccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-400/10 rounded-xl border border-green-400/20 mb-4">
                            <span className="text-green-400">✓</span>
                            <span className="text-green-400 text-xs font-bold">On-ground Access Verified</span>
                        </div>
                    )}
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {stats.map((stat, index) => (
                            <div key={index} className="glass-pill flex flex-col items-center justify-center py-3">
                                <p className="text-lg font-bold text-white leading-none mb-1">{stat.value}</p>
                                <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter text-center">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Local Alerts */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Local Alerts</h3>
                        <button 
                            onClick={() => navigate('/alert')}
                            className="text-primary text-[10px] uppercase tracking-wider hover:underline"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {localAlerts.map(alert => (
                            <div key={alert.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-red-400/20">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    alert.severity === 'high' ? 'bg-red-400/10' : 'bg-yellow-400/10'
                                }`}>
                                    <span className={alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}>🔔</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white text-xs font-bold">{alert.title}</h4>
                                    <p className="text-white/40 text-[10px]">{alert.location} • {alert.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Quick Actions</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {quickActions.map(action => (
                            <button
                                key={action.id}
                                onClick={action.action}
                                className="glass-panel p-3 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-2xl">{action.icon}</span>
                                <span className="text-white text-[10px] font-bold">{action.title}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Recent Reports */}
                <section>
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">My Reports</h3>
                        <button 
                            onClick={() => navigate('/report')}
                            className="text-primary text-[10px] uppercase tracking-wider hover:underline"
                        >
                            New Report →
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        {recentReports.map(report => (
                            <div key={report.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary text-lg">📝</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white text-xs font-bold">{report.species}</h4>
                                    <p className="text-white/40 text-[10px]">{report.location} • {report.date}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded-full ${
                                    report.status === 'Verified' 
                                        ? 'bg-green-400/20 text-green-400' 
                                        : 'bg-yellow-400/20 text-yellow-400'
                                }`}>
                                    {report.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Community Feed */}
                <section className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 px-1">Community Activity</h3>
                    <div className="glass-panel bg-white/[0.03] border-white/5 p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary text-xs">👤</span>
                            </div>
                            <div>
                                <p className="text-white text-xs font-bold">New sighting reported nearby</p>
                                <p className="text-white/40 text-[10px]">2 hours ago in your area</p>
                            </div>
                        </div>
                        <p className="text-white/60 text-sm text-center py-4">
                            Join your local community to stay connected!
                        </p>
                        <button 
                            onClick={() => navigate('/team')}
                            className="w-full bg-primary/20 text-primary text-xs px-4 py-2 rounded-xl border border-primary/30 hover:bg-primary/30 transition-colors"
                        >
                            Visit Community
                        </button>
                    </div>
                </section>
                <LogoutButton />
            </main>

            <Nav />
        </div>
    );
};

export default CommunityDashboard;
