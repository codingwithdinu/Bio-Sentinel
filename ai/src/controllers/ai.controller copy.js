import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ChatHistory } from '../models/ChatHistory.js'; // Adjust path as needed

dotenv.config();

// Connect to MongoDB (You might already have this in your server.js)
if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log("Connected to MongoDB for Chat History"))
        .catch(err => console.error("MongoDB Connection Error:", err));
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }); // 1.5 Flash is currently best for speed/cost

export const askGemini = async (req, res) => {
    try {
        const { sessionId, question, species } = req.body;

        // 1. Validation
        if (!question || !sessionId) {
            return res.status(400).json({ error: "Required fields (sessionId, question) are missing." });
        }

        // 2. Fetch or Create Chat Session
        let chatSession = await ChatHistory.findOne({ sessionId });

        // If new session, we require the species data to initialize context
        if (!chatSession) {
            if (!species) {
                return res.status(400).json({ error: "Species data is required to start a new chat session." });
            }
            chatSession = new ChatHistory({
                sessionId,
                speciesContext: species || "Generic Biodiversity", // Fallback if species is somehow null
                messages: []
            });
        }

        // 3. Construct System Instruction based on stored context
        const speciesContextStr = JSON.stringify(chatSession.speciesContext, null, 2);
        
        const systemInstruction = `
        ROLE: You are Kaya, an experienced biodiversity expert.
        
        CONTEXT DATA (Use this ONLY to identify the species we are discussing): 
        ${speciesContextStr}

        INSTRUCTIONS:
        1. **ANSWER DIRECTLY**: Answer the user's question using your expert general knowledge about this species.
        2. **FILL GAPS**: If the CONTEXT DATA is missing details, use your internal knowledge.
        3. **TONE**: Professional, educational, and natural.
        4. **FORMAT**: Keep it short, concise, scannable.
        5. **DIAGRAMS**: If a biological concept, anatomy, or process is difficult to explain with text alone, trigger a diagram by inserting the tag 

[Image of X]
 where X is a specific query. Examples: 

[Image of tiger anatomy]
, 

[Image of photosynthesis cycle]
. Use this sparingly and only when it adds educational value.
        `;

        // 4. Format MongoDB history for Gemini API
        // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }
        const historyForGemini = chatSession.messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // 5. Start Chat with History
        const chat = model.startChat({
            history: [
                // Pre-load the persona and context as the first interaction
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "model", parts: [{ text: "I have loaded the species data. How can I help you today?" }] },
                ...historyForGemini
            ],
        });

        // 6. Send Message to AI
        const result = await chat.sendMessage(question);
        const response = await result.response;
        const aiReply = response.text();

        // 7. Save the new interaction to MongoDB
        chatSession.messages.push({ role: 'user', text: question });
        chatSession.messages.push({ role: 'model', text: aiReply });
        chatSession.lastUpdated = new Date();
        
        await chatSession.save();

        // 8. Send response to Frontend
        res.status(200).json({ 
            reply: aiReply,
            sessionId: sessionId // Echo back session ID
        });

    } catch (error) {
        console.error("Gemini AI Controller Error:", error);

        if (error.message && error.message.includes("429")) {
            return res.status(429).json({ 
                reply: "I'm a bit overwhelmed with requests right now. Please try again in a minute!" 
            });
        }

        res.status(500).json({ reply: "Something went wrong on my end. Try asking again!" });
    }
};