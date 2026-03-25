import express from 'express';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Groq from "groq-sdk";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

import alertService from './src/services/alertService.js';

// Import Routes
import aiRoutes from './src/routes/ai.routes.js';
import alertRoutes from './src/routes/alert.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import satelliteRoutes from './src/routes/satellite.routes.js';
import riparianRoutes from './src/routes/riparian.routes.js';
import imageRoutes from './src/routes/image.routes.js';

dotenv.config();

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);


// ============================
// SOCKET.IO SETUP
// ============================

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.locals.io = io;

io.on('connection', (socket) => {

    console.log('🟢 Client connected:', socket.id);

    socket.on('join-alerts', async () => {

        socket.join('alerts-room');
        console.log(`Client ${socket.id} joined alerts room`);

        // send current alerts immediately
        const alerts = await alertService.fetchAlertsFromDatabase();
        socket.emit('alerts-update', alerts);

    });

    socket.on('disconnect', () => {
        console.log('🔴 Client disconnected:', socket.id);
    });

});


// ============================
// MIDDLEWARE
// ============================

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Upload middleware
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'), false);
        }

    }
});

app.locals.upload = upload;


// Rate limiter
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 100
});

app.use(limiter);


// ============================
// GROQ AI CLIENT
// ============================

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const parseModelJson = (rawText) => {
    const text = String(rawText || '').replace(/```json|```/g, '').trim();
    return JSON.parse(text);
};

const coalesceText = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }
    return fallback;
};

const coalesceArray = (value, fallback) => {
    if (Array.isArray(value) && value.length > 0) {
        return value;
    }
    return fallback;
};

const isHindiUnavailableText = (value) => {
    const text = String(value || '').toLowerCase();
    return text.includes('उपलब्ध नहीं') || text.includes('unavailable');
};

const fetchWikipediaSummary = async (title, lang = 'en') => {
    try {
        const safeTitle = encodeURIComponent(String(title || '').trim());
        if (!safeTitle) return null;

        const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${safeTitle}`);
        if (!response.ok) return null;

        const data = await response.json();
        return {
            title: data?.title || null,
            extract: data?.extract || null,
            description: data?.description || null,
            url: data?.content_urls?.desktop?.page || null
        };
    } catch {
        return null;
    }
};


// ============================
// ROUTES
// ============================

app.get('/', (req, res) => {
    res.send('Welcome to BioSentinel API!');
});

app.get('/health', (req, res) => {
    res.send('BioSentinel AI API Running');
});

app.use('/api/auth', authRoutes);
app.use('/api', aiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/riparian', riparianRoutes);
app.use('/api/images', imageRoutes);


// ============================
// SPECIES AI ENDPOINT
// ============================

app.post("/api/species", async (req, res) => {

    const { speciesName } = req.body;

    if (!speciesName) {
        return res.status(400).json({
            error: "speciesName is required"
        });
    }

    const canonicalName = String(speciesName).split('(')[0].trim();

    const [wikiEn, wikiHi] = await Promise.all([
        fetchWikipediaSummary(canonicalName, 'en'),
        fetchWikipediaSummary(canonicalName, 'hi')
    ]);

    const fallbackPayload = {
        favourable_climate: "Data currently unavailable via BioSentinel Uplink.",
        dos_and_donts: ["Do not disturb habitat", "Avoid hunting or trade", "Report sightings to local forest authorities"],
        conservation_methods: ["Protect habitat corridors", "Community awareness", "Field monitoring and anti-poaching patrols"],
        wiki_summary_en: wikiEn?.extract || "English Wikipedia summary unavailable.",
        wiki_summary_hi: wikiHi?.extract || "हिंदी विकिपीडिया सारांश उपलब्ध नहीं है।",
        key_facts_en: wikiEn?.description ? [wikiEn.description] : [],
        key_facts_hi: wikiHi?.description ? [wikiHi.description] : [],
        wiki_source_en: wikiEn?.url || null,
        wiki_source_hi: wikiHi?.url || null
    };

    const prompt = `
You are a biodiversity analyst. Build response ONLY as valid JSON.

Species: ${canonicalName}

English Wikipedia extract:
${wikiEn?.extract || 'Not available'}

Hindi Wikipedia extract:
${wikiHi?.extract || 'Not available'}

Important: If Hindi extract is not available, create wiki_summary_hi by translating/adapting the English summary into natural Hindi.

Return strict JSON with keys:
favourable_climate (string),
dos_and_donts (array of short strings),
conservation_methods (array of short strings),
wiki_summary_en (string),
wiki_summary_hi (string),
key_facts_en (array),
key_facts_hi (array)

Keep outputs practical and concise. No markdown, no extra keys.
`;

    try {

        if (!process.env.GROQ_API_KEY) {
            return res.json(fallbackPayload);
        }

        const completion = await client.chat.completions.create({

            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.5,
            max_completion_tokens: 1200

        });

        const rawText = completion.choices[0]?.message?.content;
        const parsed = parseModelJson(rawText);

        const finalEnglishSummary = coalesceText(parsed?.wiki_summary_en, fallbackPayload.wiki_summary_en);
        let finalHindiSummary = coalesceText(parsed?.wiki_summary_hi, fallbackPayload.wiki_summary_hi);

        if (!wikiHi?.extract && isHindiUnavailableText(finalHindiSummary) && finalEnglishSummary) {
            try {
                const translationPrompt = `Translate the following biodiversity summary into natural Hindi (2-4 lines). Return plain text only.\n\n${finalEnglishSummary}`;
                const translationCompletion = await client.chat.completions.create({
                    messages: [{ role: "user", content: translationPrompt }],
                    model: "llama-3.1-8b-instant",
                    temperature: 0.3,
                    max_completion_tokens: 300
                });

                const translated = String(translationCompletion.choices[0]?.message?.content || '').replace(/```/g, '').trim();
                if (translated) {
                    finalHindiSummary = translated;
                }
            } catch (translationErr) {
                // Keep fallback Hindi message if translation call fails.
            }
        }

        res.json({
            favourable_climate: coalesceText(parsed?.favourable_climate, fallbackPayload.favourable_climate),
            dos_and_donts: coalesceArray(parsed?.dos_and_donts, fallbackPayload.dos_and_donts),
            conservation_methods: coalesceArray(parsed?.conservation_methods, fallbackPayload.conservation_methods),
            wiki_summary_en: finalEnglishSummary,
            wiki_summary_hi: finalHindiSummary,
            key_facts_en: coalesceArray(parsed?.key_facts_en, fallbackPayload.key_facts_en),
            key_facts_hi: coalesceArray(parsed?.key_facts_hi, fallbackPayload.key_facts_hi),
            wiki_source_en: wikiEn?.url || null,
            wiki_source_hi: wikiHi?.url || null
        });

    } catch (err) {

        console.error("AI Error:", err);

        res.json(fallbackPayload);

    }

});


// ============================
// ALERT AUTO PROCESSING
// ============================

const runScheduledAlertScan = async () => {

    try {

        console.log("⏳ Running biodiversity alert scan...");

        const species = "Platanista gangetica"; // Dolphin
        const lat = 25.5941;
        const lon = 85.1376;

        await alertService.processGBIFAlerts(
            species,
            lat,
            lon
        );

        const alerts = await alertService.fetchAlertsFromDatabase();

        io.to('alerts-room').emit('alerts-update', alerts);

        console.log(`📡 Alerts updated and broadcast (${alerts.length} alerts)`);

    } catch (error) {

        console.error("Alert scheduler error:", error);

    }

};

runScheduledAlertScan();
setInterval(runScheduledAlertScan, 5 * 60 * 1000); // every 5 minutes



// ============================
// 404 HANDLER
// ============================

app.use((req, res) => {

    console.log(`❌ 404 - ${req.method} ${req.path}`);

    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });

});


// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {

    console.log(`🚀 BioSentinel API running on port ${PORT}`);

});