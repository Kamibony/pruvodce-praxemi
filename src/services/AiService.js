import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from '../data/knowledgeBase.js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default {
  async sendMessage(userMessage) {
    if (!API_KEY) {
      console.error('Gemini API Key is missing.');
      return "Omlouvám se, ale momentálně nejsem k dispozici (chybí klíč).";
    }

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `${SYSTEM_INSTRUCTION}\n\nOtázka studenta: ${userMessage}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();

    } catch (error) {
      console.error('AI Service Error:', error);

      // Check for specific error codes or messages indicating unavailability
      const errorMessage = error.message || '';
      const isNotFound = errorMessage.includes('404') || error.status === 404;
      const isUnavailable = errorMessage.includes('503') || error.status === 503;

      if (isNotFound || isUnavailable) {
        return "Omlouvám se, služba AI je momentálně nedostupná. Zkuste to prosím později.";
      }

      return "Omlouvám se, došlo k chybě při komunikaci s AI. Zkuste to prosím později.";
    }
  }
};
