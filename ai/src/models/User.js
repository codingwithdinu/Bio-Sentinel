import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['student', 'researcher', 'community'],
        default: null,
    },
    profileComplete: {
        type: Boolean,
        default: false,
    },
    // Common fields
    country: {
        type: String,
        default: null,
    },
    bio: {
        type: String,
        default: '',
    },
    photo: {
        type: String,
        default: null,
    },
    // Student-specific
    college: {
        type: String,
        default: null,
    },
    course: {
        type: String,
        default: null,
    },
    year: {
        type: String,
        default: null,
    },
    interests: {
        type: [String],
        default: [],
    },
    // Researcher-specific
    organization: {
        type: String,
        default: null,
    },
    expertise: {
        type: String,
        default: null,
    },
    experience: {
        type: Number,
        default: null,
    },
    orcid: {
        type: String,
        default: null,
    },
    // Community-specific
    localArea: {
        type: String,
        default: null,
    },
    occupation: {
        type: String,
        default: null,
    },
    onGroundAccess: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('User', userSchema);
