import mongoose from 'mongoose';

const ChatHistorySchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    speciesContext: { 
        type: Object, // Store the initial species data so we don't lose context
        required: true 
    },
    messages: [
        {
            role: { type: String, enum: ['user', 'model'], required: true },
            text: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    lastUpdated: { type: Date, default: Date.now }
});

// --- CRITICAL ADDITION FOR EFFICIENCY ---
// This tells MongoDB to automatically delete this document 24 hours (86400 seconds) 
// after the 'lastUpdated' time.
ChatHistorySchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 86400 });

export const ChatHistory = mongoose.model('ChatHistory', ChatHistorySchema);