import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, User, Bot, IndianRupee, Loader2, 
  CheckCircle2, Plus, History, Search, Menu, ChevronLeft, X, MessageCircle
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { compareRegimes } from '../utils/taxCalculator';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi there☺️, I'm your AI Tax Assistant. I can analyze your income and suggest the best tax regime for you. How can I help you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    setMobileSidebarOpen(false);

    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured in .env file.");
      }

      // 1. Extract Info using Gemini
      const extractionPrompt = `
        Extract tax-related information from this Indian user message: "${input}"
        Return ONLY a JSON object with these keys: 
        - income (number, default 0, assume yearly if not specified. If they say 15L, it's 1500000)
        - deductions (number, default 0, check for mentions of 80C, 80D, HRA etc)
        - fy (string, '2024-25' or '2025-26', default '2025-26')
        - queryType (string, 'calculate' or 'general')

        Example: "I earn 15 LPA and have 1.5L in 80C"
        Output: {"income": 1500000, "deductions": 150000, "fy": "2025-26", "queryType": "calculate"}
      `;

      const result = await model.generateContent(extractionPrompt);
      const responseText = result.response.text();
      
      // Clean JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      let extraction = { queryType: 'general' };
      
      if (jsonMatch) {
        try {
          extraction = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn("Failed to parse Gemini JSON:", e);
        }
      }

      let aiResponse = "";
      let comparison = null;

      if (extraction.queryType === 'calculate' && extraction.income > 0) {
        // 2. Perform Calculation using local utility
        comparison = compareRegimes(extraction.income, extraction.deductions, extraction.fy);
        
        // 3. Generate Natural Language Analysis using Gemini
        const analysisPrompt = `
          You are an Indian Tax Expert. Analyze these results for the user:
          Financial Year: ${comparison.fy}
          Total Income: ₹${comparison.income.toLocaleString('en-IN')}
          Deductions: ₹${(extraction.deductions || 0).toLocaleString('en-IN')}
          
          New Regime Tax: ₹${comparison.newRegime.totalTax.toLocaleString('en-IN')}
          Old Regime Tax: ₹${comparison.oldRegime.totalTax.toLocaleString('en-IN')}
          Recommended: ${comparison.better} regime
          Total Savings: ₹${comparison.savings.toLocaleString('en-IN')}

          Provide a very concise, professional analysis. Explain why the ${comparison.better} regime is better. 
          Mention any common deductions they might be missing if they are using the Old regime.
          Be friendly and helpful.
        `;

        const analysisResult = await model.generateContent(analysisPrompt);
        aiResponse = analysisResult.response.text();
      } else {
        // General Tax Query
        const chatPrompt = `You are an Indian Tax Expert assistant. Briefly and accurately answer this user query: "${input}"`;
        const chatResult = await model.generateContent(chatPrompt);
        aiResponse = chatResult.response.text();
      }

      const botMessage = { 
        id: Date.now() + 1, 
        text: aiResponse, 
        sender: 'bot',
        comparison: comparison 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.message || "Could not reach the AI service.";
      const botMessage = { id: Date.now() + 1, text: `Error: ${errorMessage}`, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToMessage = (id) => {
    const element = messageRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (window.innerWidth <= 768) setMobileSidebarOpen(false);
  };

  const startNewChat = () => {
    setMessages([{ id: 1, text: "Hi there☺️, I'm your AI Tax Assistant. I can analyze your income and suggest the best tax regime for you. How can I help you today?", sender: 'bot' }]);
    if (window.innerWidth <= 768) setMobileSidebarOpen(false);
  };

  const navItems = [
    { icon: <Plus size={20} />, label: "New Chat", onClick: startNewChat },
    { icon: <History size={20} />, label: "History" },
    { icon: <Search size={20} />, label: "Search" },
  ];

  // Derive history from user messages
  const sessionHistory = messages.filter(m => m.sender === 'user');

  return (
    <div className="flex h-[100dvh] w-full bg-window-bg overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <div className={`
        hidden lg:flex flex-col bg-[#000000] transition-all duration-300 border-r border-white/5 overflow-hidden
        ${desktopCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="p-4 flex flex-col h-full">
          <div className={`mb-8 flex items-center ${desktopCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
            {!desktopCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="p-1 bg-indigo-500 rounded-md">
                  <IndianRupee size={14} className="text-white" />
                </div>
                <span className="font-bold text-xs uppercase tracking-tight text-gray-200">Tax Assistant</span>
              </motion.div>
            )}
            <button 
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-gray-400"
            >
              {desktopCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>

          <div className="space-y-2 mb-8">
            {navItems.map((item, index) => (
              <button 
                key={index} 
                onClick={item.onClick}
                className={`flex items-center gap-4 w-full p-3 rounded-xl transition-all ${index === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/5 text-gray-400'} ${desktopCollapsed ? 'justify-center' : 'px-4'}`}
              >
                <div className="shrink-0">{item.icon}</div>
                {!desktopCollapsed && <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>}
              </button>
            ))}
          </div>

          {!desktopCollapsed && sessionHistory.length > 0 && (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Recent Queries</p>
              <div className="space-y-1">
                {sessionHistory.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => scrollToMessage(item.id)}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all group"
                  >
                    <MessageCircle size={14} className="shrink-0 text-gray-600 group-hover:text-indigo-400" />
                    <span className="truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#000000] transition-transform duration-300 transform lg:hidden
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 px-2">
            <span className="font-bold text-xs uppercase tracking-widest text-gray-400">Menu</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="p-2 text-gray-500 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4 mb-8">
            {navItems.map((item, index) => (
              <button 
                key={index} 
                onClick={item.onClick}
                className={`flex items-center gap-4 w-full p-4 rounded-xl ${index === 0 ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400'}`}
              >
                {item.icon}
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>

          {sessionHistory.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Recent Queries</p>
              <div className="space-y-1">
                {sessionHistory.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => scrollToMessage(item.id)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm text-gray-400 hover:bg-white/5 transition-all"
                  >
                    <MessageCircle size={16} className="shrink-0" />
                    <span className="truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full bg-zinc-950 overflow-hidden">
        
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-6 sm:pt-4 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md lg:hidden z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500 rounded-lg">
                <IndianRupee size={16} className="text-white" />
              </div>
              <h1 className="font-bold text-xs tracking-tight text-gray-200 uppercase">Tax Assistant</h1>
            </div>
          </div>
        </header>

        {/* Message List */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                ref={el => messageRefs.current[msg.id] = el}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex gap-3 sm:gap-4 w-full ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                    msg.sender === 'user' ? 'bg-indigo-600' : 'bg-[#2f2f2f]'
                  }`}>
                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} className="text-indigo-400" />}
                  </div>
                  
                  <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[80%]`}>
                    <div className={msg.sender === 'user' 
                      ? 'bg-user-bubble rounded-bubble rounded-tr-none px-4 py-3 text-gray-200 shadow-md border border-white/5' 
                      : 'bg-transparent py-2 text-gray-200'
                    }>
                      <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      {msg.comparison && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border transition-all ${msg.comparison.better === 'new' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">New Regime</p>
                              <p className="text-lg font-bold">₹{msg.comparison.newRegime.totalTax.toLocaleString()}</p>
                              {msg.comparison.better === 'new' && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Recommended</span>}
                            </div>
                            <div className={`p-4 rounded-xl border transition-all ${msg.comparison.better === 'old' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
                              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Old Regime</p>
                              <p className="text-lg font-bold">₹{msg.comparison.oldRegime.totalTax.toLocaleString()}</p>
                              {msg.comparison.better === 'old' && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Recommended</span>}
                            </div>
                          </div>
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <p className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase truncate">Save ₹{msg.comparison.savings.toLocaleString()} annually</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-[#2f2f2f] flex items-center justify-center">
                  <Bot size={16} className="text-indigo-400" />
                </div>
                <div className="w-8 h-2 bg-gray-600 rounded-full"></div>
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <div className="p-4 sm:p-8 bg-transparent w-full">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 bg-transparent transition-all w-full">
              <textarea
                rows="1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Ask anything..."
                className="flex-1 bg-gray-800 px-4 py-3 rounded-xl border-none text-white focus:ring-0 outline-none resize-none text-sm placeholder:text-gray-400 w-full min-w-0"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl shadow-lg transition-all transform active:scale-95 shrink-0 flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-center text-gray-600 mt-5 font-medium uppercase tracking-widest">
              AI Powered Tax Assistant v1.2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
