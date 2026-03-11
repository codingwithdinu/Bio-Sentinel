import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'biosentinel-secret-key';

// Helper to generate token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.status(201).json({
            user: userWithoutPassword,
            token,
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// Signin
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user._id);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.json({
            user: userWithoutPassword,
            token,
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Signin failed' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update profile
router.put('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        const {
            role,
            country,
            bio,
            photo,
            college,
            course,
            year,
            interests,
            organization,
            expertise,
            experience,
            orcid,
            localArea,
            occupation,
            onGroundAccess,
        } = req.body;

        // Build update object
        const updateData = {
            profileComplete: true,
        };

        if (role) updateData.role = role;
        if (country) updateData.country = country;
        if (bio !== undefined) updateData.bio = bio;
        if (photo !== undefined) updateData.photo = photo;
        if (college) updateData.college = college;
        if (course) updateData.course = course;
        if (year) updateData.year = year;
        if (interests) updateData.interests = interests;
        if (organization) updateData.organization = organization;
        if (expertise) updateData.expertise = expertise;
        if (experience !== null) updateData.experience = experience;
        if (orcid !== undefined) updateData.orcid = orcid;
        if (localArea) updateData.localArea = localArea;
        if (occupation) updateData.occupation = occupation;
        if (onGroundAccess !== undefined) updateData.onGroundAccess = onGroundAccess;

        const user = await User.findByIdAndUpdate(
            decoded.userId,
            updateData,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Logout (client-side token removal, but we can add token blacklisting if needed)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;
