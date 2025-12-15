import { GoogleGenAI, Type } from "@google/genai";
import { TEXT_MODEL, IMAGE_MODEL, SYSTEM_INSTRUCTION, VISUAL_STYLE_PROMPT } from "../constants";
import { StoryboardData, ImageSize } from "../types";

// Helper to get API key safely
const getApiKey = () => process.env.API_KEY || '';

const geminiService = {
  generateStoryboardAnalysis: async (script: string): Promise<StoryboardData> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Analyze this script and generate a storyboard:\n\n${script}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking for deep analysis
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consistencyBible: {
              type: Type.OBJECT,
              properties: {
                characterVisuals: { type: Type.STRING },
                environmentVisuals: { type: Type.STRING },
              },
              required: ["characterVisuals", "environmentVisuals"],
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  context: { type: Type.STRING },
                  imageADescription: { type: Type.STRING },
                  imageBDescription: { type: Type.STRING },
                  motionPrompt: { type: Type.STRING },
                  characterDirection: { type: Type.STRING },
                  characterExpression: { type: Type.STRING },
                  characterPose: { type: Type.STRING },
                },
                required: ["id", "title", "context", "imageADescription", "imageBDescription", "motionPrompt", "characterDirection", "characterExpression", "characterPose"],
              },
            },
          },
          required: ["consistencyBible", "scenes"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini.");
    }

    try {
      return JSON.parse(response.text) as StoryboardData;
    } catch (e) {
      console.error("Failed to parse JSON", response.text);
      throw new Error("Failed to parse storyboard data.");
    }
  },

  generateSceneImage: async (
    description: string,
    consistencyContext: string,
    size: ImageSize,
    characterImage?: string | null
  ): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // Construct a rich prompt ensuring consistency and style
    const fullPrompt = `
      ${VISUAL_STYLE_PROMPT}

      CONSISTENCY CONTEXT:
      ${consistencyContext}

      ${characterImage ? `Use the following character image as a reference for the character in the scene:\n[IMAGE]\n` : ''}

      SCENE DESCRIPTION:
      ${description}
    `;

    const contents = characterImage 
      ? [
          fullPrompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: characterImage.split(',')[1],
            },
          },
        ]
      : [fullPrompt];


    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents,
      config: {
        imageConfig: {
          imageSize: size, // 1K, 2K, or 4K
          aspectRatio: "16:9",
        },
      },
    });

    // Iterate to find inline data image
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated.");
  },

  createCharacter: async (description: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const fullPrompt = `
      Create a character in a cartoon style with the following description on a plain white background.
      This character should be consistently drawn.
      Description: ${description}
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: fullPrompt,
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "1:1",
        },
      },
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No character image generated.");
  },

  createCharacterReferenceSheet: async (description: string): Promise<{front: string, side: string, back: string}> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const views = {
      front: "front view, facing forward directly at camera",
      side: "side profile view, facing left, showing full body from the side",
      back: "back view, facing away from camera, showing the character from behind"
    };

    const results: {front: string, side: string, back: string} = {
      front: '',
      side: '',
      back: ''
    };

    for (const [viewName, viewDescription] of Object.entries(views)) {
      const fullPrompt = `
        ${VISUAL_STYLE_PROMPT}

        Create a character reference sheet showing the character in ${viewDescription}.
        Character should be drawn in a clean, consistent cartoon style on a plain white background.
        Show the full character from head to toe.
        
        Character Description: ${description}
        
        View: ${viewDescription.toUpperCase()}
        
        Ensure consistent proportions, clothing, colors, and features as described.
      `;

      try {
        const response = await ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: fullPrompt,
          config: {
            imageConfig: {
              imageSize: "1K",
              aspectRatio: "1:1",
            },
          },
        });

        for (const candidate of response.candidates || []) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              results[viewName as keyof typeof results] = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (error) {
        console.error(`Failed to generate ${viewName} view:`, error);
        results[viewName as keyof typeof results] = '';
      }
    }

    return results;
  }
};

export { geminiService };
