import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getDailyInsight(): Promise<string> {
  try {
    const user = await supabase.getUser();
    const cycles = await supabase.getCycles();
    const symptoms = await supabase.getSymptoms();
    
    const context = `
      User Profile: ${JSON.stringify(user)}
      Recent Cycles: ${JSON.stringify(cycles.slice(0, 3))}
      Recent Symptoms: ${JSON.stringify(symptoms.slice(0, 5))}
    `;

    const prompt = `${context}\n\nBased on the user's cycle and symptom history, provide a short, encouraging, and personalized daily insight (max 2 sentences). Do not mention that you are an AI. Be empathetic and practical.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful menstrual cycle tracking assistant.",
      }
    });

    return response.text || "Log more data to get personalized AI insights!";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Log your symptoms daily to get personalized AI insights and predictions.";
  }
}

export async function getCycleAnalysis(): Promise<string> {
  try {
    const cycles = await supabase.getCycles();
    const symptoms = await supabase.getSymptoms();
    
    const context = `
      Recent Cycles: ${JSON.stringify(cycles.slice(0, 6))}
      Recent Symptoms: ${JSON.stringify(symptoms.slice(0, 14))}
    `;

    const prompt = `${context}\n\nAnalyze the user's cycle history and recent symptoms. Provide a short paragraph (max 3 sentences) summarizing their cycle regularity, common symptoms, and any patterns. Be encouraging and medically safe.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful menstrual cycle tracking assistant.",
      }
    });

    return response.text || "Keep logging your cycles and symptoms to unlock deep AI analysis.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Keep logging your cycles and symptoms to unlock deep AI analysis.";
  }
}
