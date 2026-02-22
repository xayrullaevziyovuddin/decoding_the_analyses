import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = 'gemini-2.5-pro';

const systemInstruction = `You are a specialized AI assistant for interpreting medical lab reports. Your task is to extract all biomarkers from the provided document image(s), analyze them, and return the data in a single, consolidated JSON format according to the provided schema. Do not add any text, notes, or markdown outside of the JSON structure. Populate all fields of the schema accurately and concisely based on the report. The 'description' and 'possibleCauses' should be in clear, easy-to-understand language. For 'status', use only one of the allowed values: "Normal", "High", "Low", "Abnormal", "Detected", "Not Detected".`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING, 
      description: 'A concise title for the analysis report, like "Patient Biomarker Analysis Results" or "Blood Test Analysis".' 
    },
    biomarkers: {
      type: Type.ARRAY,
      description: 'An array of all biomarkers found in the report.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'The name of the biomarker, e.g., "Базофилы".' },
          value: { type: Type.STRING, description: 'The measured value of the biomarker, e.g., "0.06".' },
          unit: { type: Type.STRING, description: 'The unit of measurement, e.g., "10*9/л" or "%".' },
          status: { type: Type.STRING, description: 'The status of the result. Must be one of: "Normal", "High", "Low", "Abnormal", "Detected", "Not Detected".' },
          normalRange: { type: Type.STRING, description: 'The normal reference range for this biomarker, e.g., "0.0 - 1.0 %".' },
          description: { type: Type.STRING, description: 'A detailed but easy-to-understand explanation of what this biomarker is and its function in the body.' },
          possibleCauses: { type: Type.STRING, description: 'A list of possible reasons for the observed status (e.g., why it is high or low). Use markdown for lists if needed.' },
        },
        required: ['name', 'value', 'unit', 'status', 'normalRange', 'description', 'possibleCauses'],
      },
    },
  },
  required: ['title', 'biomarkers'],
};


export const analyzeMedicalImage = async (
  base64DataArray: string[],
  language: 'ru' | 'uz'
): Promise<AnalysisResult> => {
  try {
    const imageParts = base64DataArray.map(data => ({
      inlineData: {
        data: data,
        mimeType: 'image/jpeg', // All pages are converted to jpeg for consistency
      },
    }));

    const langInstruction = language === 'ru' 
      ? "Provide the response entirely in Russian." 
      : "Provide the response entirely in Uzbek.";

    const textPart = {
      text: `Extract and analyze all biomarkers from these medical report images. Combine results from all pages into a single response. ${langInstruction}`,
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [...imageParts, textPart] },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text;
    // Clean potential markdown code fences
    const cleanedJson = jsonText.replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson);

  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`An error occurred while analyzing the image: ${error.message}. Please check the console for details.`);
    }
    throw new Error("An unknown error occurred while analyzing the image.");
  }
};