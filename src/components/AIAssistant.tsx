import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';
import { Send, Bot, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';
import { RichText } from './RichText';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    const history = await supabase.getChatHistory();
    if (history.length === 0) {
      const initialMsg = await supabase.addChatMessage({
        role: 'assistant',
        content: "Hi! I'm your CycleGuard AI assistant. I can help answer questions about your cycle, symptoms, or general reproductive health. How can I help you today?",
      });
      setMessages([initialMsg]);
    } else {
      setMessages(history);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading) return;

    setInput('');
    setLoading(true);

    const savedUserMsg = await supabase.addChatMessage({
      role: 'user',
      content: textToSend.trim(),
    });
    setMessages(prev => [...prev, savedUserMsg]);

    try {
      // Get user context
      const user = await supabase.getUser();
      const cycles = await supabase.getCycles();
      const symptoms = await supabase.getSymptoms();
      
      const context = `
        User Profile: ${JSON.stringify(user)}
        Recent Cycles: ${JSON.stringify(cycles.slice(0, 3))}
        Recent Symptoms: ${JSON.stringify(symptoms.slice(0, 5))}
        Last Logged Symptoms: ${symptoms.length > 0 ? symptoms[0].symptoms.join(', ') : 'None'}
        Last Logged Mood: ${symptoms.length > 0 ? symptoms[0].mood || 'None' : 'None'}
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a helpful, empathetic, and knowledgeable AI assistant for a menstrual cycle tracking app called CycleGuard. Use the provided user context to give personalized advice, but always remind the user that you are an AI and they should consult a doctor for medical advice. Keep responses concise and friendly.\n\nContext:\n" + context,
        },
      });

      const response = await chat.sendMessage({ message: textToSend.trim() });
      
      if (response.text) {
        const savedAiMsg = await supabase.addChatMessage({
          role: 'assistant',
          content: response.text,
        });
        setMessages(prev => [...prev, savedAiMsg]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg = await supabase.addChatMessage({
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
      });
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const predefinedPrompts = [
    "Why am I so tired before my period?",
    "What is a normal cycle length?",
    "How can I reduce bloating?",
    "When is my fertile window?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center">
          <Bot className="w-6 h-6 mr-2 text-rose-500" />
          AI Assistant
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl p-4 shadow-sm",
              msg.role === 'user' 
                ? "bg-rose-500 text-white rounded-br-none" 
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none"
            )}>
              {msg.role === 'assistant' ? (
                <RichText content={msg.content} />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 shadow-sm">
              <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe space-y-3">
        {/* Predefined Prompts */}
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 space-x-2 scrollbar-hide">
          {predefinedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="whitespace-nowrap px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 text-xs font-medium rounded-full border border-rose-100 dark:border-rose-800/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your cycle..."
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-slate-800 dark:text-slate-200"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2 rounded-full bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
