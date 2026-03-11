import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileSetup = () => {
    const { user, updateProfile, ROLES } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Initialize form data, potentially falling back to existing custom data if present
    const [formData, setFormData] = useState({
        // Common fields
        role: user?.prefs?.role || '',
        country: user?.prefs?.country || '',
        bio: user?.prefs?.bio || '',
        photo: user?.prefs?.photo || '',
        
        // Student-specific
        college: user?.prefs?.college || '',
        course: user?.prefs?.course || '',
        year: user?.prefs?.year || '',
        interests: user?.prefs?.interests || [],
        
        // Researcher-specific
        organization: user?.prefs?.organization || '',
        expertise: user?.prefs?.expertise || '',
        experience: user?.prefs?.experience || '',
        orcid: user?.prefs?.orcid || '',
        
        // Community-specific
        localArea: user?.prefs?.localArea || '',
        occupation: user?.prefs?.occupation || '',
        onGroundAccess: user?.prefs?.onGroundAccess || false,
    });

    const [newInterest, setNewInterest] = useState('');

    const countries = [
        'United States', 'United Kingdom', 'Canada', 'Australia', 'India',
        'Germany', 'France', 'Japan', 'China', 'Brazil', 'Mexico', 'South Africa',
        'Kenya', 'Indonesia', 'Malaysia', 'Singapore', 'Other'
    ];

    const interestOptions = [
        'Marine Biology', 'Ecology', 'Conservation', 'Climate Change',
        'Species Identification', 'Wildlife Photography', 'Research',
        'Environmental Policy', 'Education', 'Citizen Science'
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleRoleSelect = (role) => {
        setFormData({ ...formData, role });
        setStep(2);
    };

    const addInterest = (e) => {
        e.preventDefault(); // Prevent form submission if they press enter
        if (newInterest && !formData.interests.includes(newInterest)) {
            setFormData({
                ...formData,
                interests: [...formData.interests, newInterest]
            });
            setNewInterest('');
        }
    };

    const removeInterest = (interest, e) => {
        e.preventDefault();
        setFormData({
            ...formData,
            interests: formData.interests.filter(i => i !== interest)
        });
    };

    const validateStep = (currentStep) => {
        if (currentStep === 1 && !formData.role) {
            setError('Please select a role');
            return false;
        }
        if (currentStep === 2 && (!formData.country || !formData.bio)) {
            setError('Please fill in all required fields');
            return false;
        }
        if (currentStep === 3) {
            if (formData.role === ROLES.STUDENT && (!formData.college || !formData.course)) {
                setError('Please fill in all required fields');
                return false;
            }
            if (formData.role === ROLES.RESEARCHER && (!formData.organization || !formData.expertise)) {
                setError('Please fill in all required fields');
                return false;
            }
            if (formData.role === ROLES.COMMUNITY && !formData.localArea) {
                setError('Please fill in all required fields');
                return false;
            }
        }
        setError('');
        return true;
    };

    // Separate function to handle moving to the next step
    const handleNextStep = (e) => {
        e.preventDefault();
        if (validateStep(step)) {
            setStep(step + 1);
        }
    };

    // This handles the final API call
    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setLoading(true);
        setError('');

        try {
            await updateProfile(formData);
            navigate(formData.role ? `/dashboard/${formData.role}` : '/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const renderRoleSelection = () => (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Bio Sentinel!</h2>
                <p className="text-white/50">Tell us a bit about yourself so we can personalize your experience</p>
            </div>

            <div className="grid gap-4">
                <button
                    type="button"
                    onClick={() => handleRoleSelect(ROLES.STUDENT)}
                    className="glass-panel p-6 rounded-2xl border-2 border-transparent hover:border-primary transition-all text-left group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Student</h3>
                            <p className="text-white/50 text-sm">Learn, explore, and contribute to citizen science</p>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleRoleSelect(ROLES.RESEARCHER)}
                    className="glass-panel p-6 rounded-2xl border-2 border-transparent hover:border-primary transition-all text-left group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            🔬
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Researcher/Scientist</h3>
                            <p className="text-white/50 text-sm">Access data, validate findings, and advance research</p>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleRoleSelect(ROLES.COMMUNITY)}
                    className="glass-panel p-6 rounded-2xl border-2 border-transparent hover:border-primary transition-all text-left group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            🌱
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Local Community</h3>
                            <p className="text-white/50 text-sm">Report sightings and protect local ecosystems</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );

    const renderCommonFields = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Basic Information</h2>
                <p className="text-white/50 text-sm">Help others know more about you</p>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Country <span className="text-primary">*</span>
                </label>
                <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                >
                    <option value="">Select your country</option>
                    {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Bio <span className="text-primary">*</span>
                </label>
                <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Tell us about yourself and your interest in biodiversity..."
                />
            </div>
        </div>
    );

    const renderStudentFields = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Student Information</h2>
                <p className="text-white/50 text-sm">Help us connect you with relevant opportunities</p>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    College/University <span className="text-primary">*</span>
                </label>
                <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your college name"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Course/Major <span className="text-primary">*</span>
                </label>
                <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., Marine Biology, Environmental Science"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Year of Study
                </label>
                <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                >
                    <option value="">Select year</option>
                    <option value="1">First Year</option>
                    <option value="2">Second Year</option>
                    <option value="3">Third Year</option>
                    <option value="4">Fourth Year</option>
                    <option value="5">Graduate</option>
                    <option value="phd">PhD</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Areas of Interest
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {formData.interests.map(interest => (
                        <span
                            key={interest}
                            className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-primary/30"
                        >
                            {interest}
                            <button
                                type="button"
                                onClick={(e) => removeInterest(interest, e)}
                                className="hover:text-white transition-colors"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <select
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    >
                        <option value="">Select to add an interest...</option>
                        {interestOptions.filter(i => !formData.interests.includes(i)).map(interest => (
                            <option key={interest} value={interest}>{interest}</option>
                        ))}
                    </select>
                    {newInterest && (
                        <button
                            type="button"
                            onClick={addInterest}
                            className="bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/30 transition-colors"
                        >
                            Add
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderResearcherFields = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Researcher Information</h2>
                <p className="text-white/50 text-sm">Help us verify your credentials</p>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Organization/Institution <span className="text-primary">*</span>
                </label>
                <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your organization name"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Area of Expertise <span className="text-primary">*</span>
                </label>
                <input
                    type="text"
                    name="expertise"
                    value={formData.expertise}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., Marine Ecology, Species Conservation"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Years of Experience
                </label>
                <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., 10"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    ORCID ID
                </label>
                <input
                    type="text"
                    name="orcid"
                    value={formData.orcid}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="https://orcid.org/xxxx-xxxx-xxxx-xxxx"
                />
                <p className="text-white/30 text-xs mt-1">Optional: Your ORCID helps verify your research credentials</p>
            </div>
        </div>
    );

    const renderCommunityFields = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Community Information</h2>
                <p className="text-white/50 text-sm">Help us connect you with local initiatives</p>
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Local Area/Region <span className="text-primary">*</span>
                </label>
                <input
                    type="text"
                    name="localArea"
                    value={formData.localArea}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your local area or region"
                />
            </div>

            <div className="mb-4">
                <label className="block text-white/60 text-xs font-bold uppercase tracking-wider mb-2">
                    Occupation
                </label>
                <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., Fisherman, Forest Ranger, Teacher"
                />
            </div>

            <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        name="onGroundAccess"
                        checked={formData.onGroundAccess}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                    />
                    <span className="text-white text-sm">I have on-ground access to natural areas</span>
                </label>
                <p className="text-white/30 text-xs mt-1 ml-8">
                    This means you can physically access forests, beaches, wetlands, etc. for data collection
                </p>
            </div>
        </div>
    );

    const renderRoleSpecificFields = () => {
        switch (formData.role) {
            case ROLES.STUDENT:
                return renderStudentFields();
            case ROLES.RESEARCHER:
                return renderResearcherFields();
            case ROLES.COMMUNITY:
                return renderCommunityFields();
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark py-8">
            <div className="glass-panel p-8 rounded-3xl max-w-lg w-full mx-4">
                {/* Progress indicator */}
                {step > 1 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(s => (
                                    <div
                                        key={s}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            s <= step ? 'bg-primary' : 'bg-white/20'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Form content */}
                <form onSubmit={step === 3 ? handleFinalSubmit : handleNextStep}>
                    {step === 1 && renderRoleSelection()}
                    {step === 2 && renderCommonFields()}
                    {step === 3 && renderRoleSpecificFields()}

                    {/* Navigation buttons */}
                    {step === 2 && (
                        <div className="mt-8 flex gap-4">
                             <button
                                type="submit"
                                className="w-full bg-primary text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center hover:bg-primary/80 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="mt-8 flex gap-4">
                             <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;