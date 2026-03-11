import Groq from "groq-sdk";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ChatHistory } from '../models/ChatHistory.js';

dotenv.config();

// --- 2. Initialize Groq Client ---
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'gsk_your_api_key_here') {
        console.warn("⚠️ GROQ_API_KEY not set. AI features will return mock responses.");
        return null;
    }
    return new Groq({ apiKey });
};

const client = getGroqClient();

// --- 1. DB Connection Helper ---
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return true;
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || mongoUri.includes('localhost')) {
        console.warn("⚠️ MongoDB not available. Chat history will not be saved.");
        return false;
    }
    try {
        await mongoose.connect(mongoUri);
        console.log("MongoDB Connected Successfully");
        return true;
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        return false;
    }
};

export const askGemini = async (req, res) => {
    try {
        const dbConnected = await connectDB();

        const { sessionId, question, species } = req.body;

        // 1. Validation
        if (!question || !sessionId) {
            return res.status(400).json({ error: "Required fields (sessionId, question) are missing." });
        }

        // Check if Groq client is available
        if (!client) {
            return res.status(503).json({ 
                error: "AI service not configured. Please set GROQ_API_KEY in .env file." 
            });
        }

        // 2. Fetch or Create Chat Session (only if DB connected)
        let chatSession = null;
        let newSession = false;
        if (dbConnected) {
            chatSession = await ChatHistory.findOne({ sessionId });

            // Create session without requiring species data
            if (!chatSession) {
                newSession = true;
                chatSession = new ChatHistory({
                    sessionId,
                    speciesContext: species ? JSON.stringify(species) : "General Biodiversity Chat",
                    messages: []
                });
            }
        } else {
            // When DB is not connected, allow chat without species requirement
            console.log("MongoDB not connected - enabling general Kaya chat mode");
        }

        // 3. Construct System Instruction
        const speciesContextStr = species ? JSON.stringify(species, null, 2) : '{"name": "Unknown Species", "description": "General biodiversity inquiry"}';
        
        const systemInstruction = `
        ROLE: You are Kaya, an experienced biodiversity expert.
        
        CONTEXT DATA (Use this ONLY to identify the species we are discussing): 
        ${speciesContextStr}

        INSTRUCTIONS:
        1. **ANSWER DIRECTLY**: Answer the user's question using your expert general knowledge about this species.
        2. **FILL GAPS**: If the CONTEXT DATA is missing details, use your internal knowledge.
        3. **TONE**: Professional, educational, and natural.
        4. **FORMAT**: Keep it short, concise, scannable.
        `;

        // 4. Format History for Groq (OpenAI Compatible Format)
        const apiMessages = [
            { role: "system", content: systemInstruction },
            ...(chatSession?.messages?.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.text
            })) || []),
            { role: "user", content: question }
        ];

        // 5. Call Groq API
        const completion = await client.chat.completions.create({
            messages: apiMessages,
            model: "moonshotai/kimi-k2-instruct-0905",
            temperature: 0.6,
            max_completion_tokens: 4096,
            top_p: 1,
            stream: true,
            stop: null
        });

        // 6. Handle Stream Collection
        let aiReply = "";
        for await (const chunk of completion) {
            aiReply += chunk.choices[0]?.delta?.content || "";
        }

        // 7. Save to MongoDB (only if connected)
        if (chatSession && dbConnected) {
            chatSession.messages.push({ role: 'user', text: question });
            chatSession.messages.push({ role: 'model', text: aiReply });
            chatSession.lastUpdated = new Date();
            await chatSession.save();
        }

        // 8. Send Response
        res.status(200).json({ 
            reply: aiReply,
            sessionId: sessionId 
        });

    } catch (error) {
        console.error("Groq AI Controller Error:", error);
        res.status(500).json({ reply: "Something went wrong on my end. Try asking again!" });
    }
};