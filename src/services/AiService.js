import { SYSTEM_INSTRUCTION } from '../data/knowledgeBase.js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

export default {
  async sendMessage(userMessage) {
    if (!API_KEY) {
      console.error('Gemini API key is missing.');
      return "Omlouvám se, ale momentálně nejsem k dispozici.";
    }

    const payload = {
      contents: [{
        parts: [{ text: SYSTEM_INSTRUCTION + "\n\nUser Question: " + userMessage }]
      }]
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Parse the response structure of Gemini API
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
         console.error('Unexpected API response structure:', data);
         return "Omlouvám se, ale momentálně nejsem k dispozici.";
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return "Omlouvám se, ale momentálně nejsem k dispozici.";
    }
  }
};
