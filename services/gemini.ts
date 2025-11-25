import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Attachment } from "../types";

// Helper to get a fresh AI instance with the current API key safely
const getAiClient = () => {
  // Safe access to process.env to prevent crashes in browsers
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  if (!apiKey) {
    console.warn("API_KEY not detected. Chat may fail.");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = 'gemini-2.5-flash';

// Helper to convert internal message format to Gemini history format if needed
export const createChatSession = (): Chat => {
  const ai = getAiClient();
  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      temperature: 0.7,
      systemInstruction: "Você é o Aether Base, uma IA sofisticada, minimalista e altamente capaz criada por Davi Felipe. Suas respostas são diretas, elegantes e úteis. Você ajuda o usuário a criar, programar e escrever. Responda sempre em Português do Brasil. Se o usuário pedir para criar um site, forneça o código HTML completo dentro de blocos de código markdown. Davi Felipe é um aluno do 6º ano que adora desenvolver projetos. Se o usuário pedir PDF, sugira um tema e estrutura.",
    },
  });
};

export const streamResponse = async (
  chat: Chat,
  userMessage: string,
  attachment: Attachment | undefined,
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    let responseStream;

    if (attachment) {
      // Multimodal request
      const imagePart = {
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      };
      const textPart = { text: userMessage };
      
      // Pass parts array directly for multimodal messages
      responseStream = await chat.sendMessageStream({ 
        message: [textPart, imagePart] 
      });
    } else {
      // Text only
      responseStream = await chat.sendMessageStream({ message: userMessage });
    }
    
    let fullText = "";
    
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      const text = c.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string, attachment?: Attachment): Promise<string | null> => {
  try {
    const ai = getAiClient();
    
    const parts: any[] = [];

    // If there is an attachment (for editing or reference), add it to the parts
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }

    // Add the text prompt
    parts.push({ text: prompt });

    // Using gemini-2.5-flash-image which supports both text-to-image and image-to-image (editing)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });
    
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
      for (const part of responseParts) {
        // Check for image data in the response parts
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};