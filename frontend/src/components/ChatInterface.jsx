import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// --- SUB-COMPONENT: CHAT BUBBLE ---
const ChatBubble = ({ text, sender, timestamp }) => {
  const isUser = sender === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
      <div
        className={`max-w-[85%] px-4 py-3 text-sm font-medium relative ${isUser
            ? 'bg-primary-green/10 border border-primary-green/30 text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm shadow-[0_0_15px_rgba(57,255,20,0.1)]'
            : 'glass-panel border-white/10 text-white/90 rounded-t-2xl rounded-br-2xl rounded-bl-sm bg-white/5'
          }`}
      >
        {isUser && <div className="absolute inset-0 bg-primary-green/5 blur-md -z-10 rounded-2xl"></div>}
        <div className="markdown-content leading-relaxed">
          <ReactMarkdown
            components={{
              strong: ({ node, ...props }) => <span className="font-bold text-primary-green" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="marker:text-primary-green/70" {...props} />,
              p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
      <span className="text-[9px] font-mono mt-1 uppercase tracking-wider text-white/40">
        {sender === 'model' ? 'KAYA' : 'YOU'} • {timestamp}
      </span>
    </div>
  );
};

// --- MAIN COMPONENT ---
const ChatInterface = ({ onClose, species = null }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Ref to track session ID without re-renders
  const sessionRef = useRef(null);
  const hasInitializedBackEnd = useRef(false);

  // 1. LIFECYCLE: Start Fresh Session
  useEffect(() => {
    // Generate a fresh ID every time this component opens or species changes
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionRef.current = newId;
    hasInitializedBackEnd.current = false; // Reset backend sync status

    // --- LOGIC: Determine Mode (Specific vs General) ---
    const isSpeciesMode = !!species;

    const welcomeMsg = "**Kaya AI Online.**";

    // Set Initial Welcome Message
    setMessages([{
      id: 'init',
      text: welcomeMsg,
      sender: 'model',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

  }, [species]); // Dependency ensures we reset if user clicks a different marker

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // 2. Handle Send Logic
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic UI Update
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user', timestamp }]);
    setInput('');
    setIsTyping(true);

    try {
      // 3. Construct Payload
      const payload = {
        sessionId: sessionRef.current,
        question: userText,
      };

      // 4. Conditional Context Injection (The Magic Part)
      // Only attach species data if backend hasn't been initialized for this session yet
      if (!hasInitializedBackEnd.current) {

        if (species) {
          // Case A: Specific Species Selected -> Send Real Data
          payload.species = species;
          console.log("Initializing Mode: SPECIES", species.name);
        } else {
          // Case B: General Chat -> Send "Virtual" Context
          // This satisfies the backend requirement for a 'species' object
          // while telling the AI to act generally.
          payload.species = {
            name: "Global Biodiversity Database",
            scientificName: "Global Context",
            description: "You are acting as a general biology and conservation expert. The user has not selected a specific species, so answer questions broadly based on your knowledge base.",
            status: "Active"
          };
          console.log("Initializing Mode: GLOBAL");
        }
        // NOTE: We do NOT set hasInitializedBackEnd.current = true here.
        // We wait for success first.
      }

      // 5. API Call
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/chat`, payload);

      // --- CRITICAL FIX: Only lock initialization if request succeeded ---
      if (!hasInitializedBackEnd.current) {
        hasInitializedBackEnd.current = true;
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: response.data.reply,
        sender: 'model',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (error) {
      console.error("Backend Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "⚠️ **Signal Interrupted.** Connection to Sentinel Core failed.",
        sender: 'model',
        timestamp: timestamp
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-150 flex flex-col glass-panel overflow-hidden border border-white/10 relative shadow-2xl bg-black/80 backdrop-blur-xl">

      {/* Header */}
      <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isTyping ? 'bg-yellow-400' : 'bg-primary-green'} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-[0.2em] uppercase leading-none mb-0.5">Kaya AI</h2>
            <p className="text-[10px] font-mono tracking-wide truncate max-w-[150px] text-white/50">
              CTX: {species ? (species.name || 'TARGET') : 'GLOBAL'}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full border bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 hover:cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 scroll-smooth no-scrollbar relative">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} text={msg.text} sender={msg.sender} timestamp={msg.timestamp} />
        ))}

        {isTyping && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="glass-panel px-4 py-3 rounded-t-2xl rounded-br-2xl rounded-bl-sm border-white/5 bg-white/2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary-green/50 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-primary-green/50 rounded-full animate-bounce delay-150"></div>
                <div className="w-1.5 h-1.5 bg-primary-green/50 rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
            <span className="text-[9px] font-mono mt-1 uppercase tracking-wider ml-1">PROCESSING...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/40 border-t border-white/10 z-10">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={species ? "Ask about this species..." : "Ask global questions..."}
            disabled={isTyping}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-green/50 focus:bg-white/10 transition-all font-mono disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 p-2 rounded-lg text-primary-green hover:bg-primary-green/10 disabled:text-white/10 transition-all">
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;