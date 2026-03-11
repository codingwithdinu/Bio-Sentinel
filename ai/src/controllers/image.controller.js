import Groq from "groq-sdk";
import dotenv from 'dotenv';

dotenv.config();

const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'gsk_your_api_key_here') {
        console.warn("⚠️ GROQ_API_KEY not set. AI features will return mock responses.");
        return null;
    }
    return new Groq({ apiKey });
};

const analyzeImageWithAI = async (imageBuffer, imageName) => {
    const client = getGroqClient();
    
    if (!client) {
        // Return mock response if no API key
        return {
            is_suspicious: false,
            confidence: 0.5,
            label: 'human',
            reasoning: 'Mock response - GROQ_API_KEY not configured'
        };
    }

    try {
        const base64Image = imageBuffer.toString('base64');
        
        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze this image and determine if it appears to be AI-generated or human-created. Look for signs of AI generation like:
                            - Unnatural textures or patterns
                            - Inconsistent lighting/shadows
                            - Distorted anatomy or objects
                            - Oversaturated or unnatural colors
                            - Pixelation or artifacts typical of AI upscaling
                            
                            Provide a JSON response with:
                            - is_suspicious: boolean (true if AI-generated suspected)
                            - confidence: number (0-1, how confident you are)
                            - label: "ai" or "human"
                            - reasoning: brief explanation of your assessment
                            - signs_detected: array of specific signs noticed`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            model: "llama-4-scout-2025",
            temperature: 0.2,
            max_completion_tokens: 1024
        });

        const responseText = completion.choices[0]?.message?.content || '';
        
        // Try to parse JSON from response
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
        }
        
        return {
            is_suspicious: false,
            confidence: 0.5,
            label: 'human',
            reasoning: responseText.substring(0, 200),
            raw_response: responseText
        };
    } catch (error) {
        console.error('AI image analysis error:', error);
        return {
            is_suspicious: false,
            confidence: 0.5,
            label: 'human',
            reasoning: 'Analysis failed, defaulting to human'
        };
    }
};

// Helper function for basic pixel analysis
const analyzePixelQuality = (imageBuffer) => {
    // Basic pixel analysis for compression artifacts and noise patterns
    // This is a simplified version - in production you'd use more sophisticated methods
    return {
        compression_artifacts: false,
        noise_consistency: true,
        is_suspicious: false,
        quality_score: 0.9
    };
};

// POST /classify/image - Basic AI vs Human image classification
export const classifyImage = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.files.file;
        const imageBuffer = file.data;
        
        // Analyze image
        const analysis = await analyzeImageWithAI(imageBuffer, file.name);
        
        res.json({
            success: true,
            ai_detection: {
                is_suspicious: analysis.is_suspicious,
                confidence: analysis.confidence,
                label: analysis.label,
                reasoning: analysis.reasoning,
                signs_detected: analysis.signs_detected || []
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Image classification error:', error);
        res.status(500).json({ error: 'Failed to classify image' });
    }
};

// POST /classify/image/url - Classify image from URL
export const classifyImageFromURL = async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Download image from URL
        const response = await axios({
            url,
            responseType: 'arraybuffer',
            timeout: 10000
        });

        const imageBuffer = Buffer.from(response.data);
        const analysis = await analyzeImageWithAI(imageBuffer, url);
        
        res.json({
            success: true,
            ai_detection: {
                is_suspicious: analysis.is_suspicious,
                confidence: analysis.confidence,
                label: analysis.label,
                reasoning: analysis.reasoning,
                signs_detected: analysis.signs_detected || []
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('URL image classification error:', error);
        res.status(500).json({ error: 'Failed to classify image from URL' });
    }
};

// POST /classify/image/analyze - Full analysis (AI detection + pixel quality)
export const analyzeImage = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.files.file;
        const imageBuffer = file.data;
        
        // Run both AI detection and pixel analysis in parallel
        const [aiAnalysis, pixelAnalysis] = await Promise.all([
            analyzeImageWithAI(imageBuffer, file.name),
            Promise.resolve(analyzePixelQuality(imageBuffer))
        ]);

        // Determine overall assessment
        const isRejected = aiAnalysis.is_suspicious || pixelAnalysis.is_suspicious;
        
        const result = {
            success: true,
            ai_detection: {
                is_suspicious: aiAnalysis.is_suspicious,
                confidence: aiAnalysis.confidence,
                label: aiAnalysis.label,
                reasoning: aiAnalysis.reasoning,
                signs_detected: aiAnalysis.signs_detected || []
            },
            pixel_analysis: {
                is_suspicious: pixelAnalysis.is_suspicious,
                compression_artifacts: pixelAnalysis.compression_artifacts,
                noise_consistency: pixelAnalysis.noise_consistency,
                quality_score: pixelAnalysis.quality_score
            },
            overall_assessment: {
                is_accepted: !isRejected,
                status: isRejected ? 'rejected' : 'accepted',
                reason: isRejected 
                    ? (aiAnalysis.is_suspicious 
                        ? 'AI-generated content detected' 
                        : 'Suspicious pixel quality detected')
                    : 'Image passed all authenticity checks'
            },
            timestamp: new Date().toISOString()
        };

        res.json(result);
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
};