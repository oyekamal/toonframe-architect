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

  createCharacterReferenceSheet: async (description: string, originalCharacterImage: string): Promise<{front: string, side: string, back: string}> => {
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

        Using the provided character image as a reference, create a character reference sheet showing the SAME character in ${viewDescription}.
        
        CRITICAL: Maintain EXACT same character appearance:
        - Same clothing, colors, and style
        - Same proportions and features
        - Same cartoon art style
        - Plain white background
        - Full character from head to toe
        
        Character Description: ${description}
        View: ${viewDescription.toUpperCase()}
        
        The character in this new view must be identically recognizable as the same character in the reference image.
      `;

      const contents = [
        fullPrompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: originalCharacterImage.split(',')[1],
          },
        },
      ];

      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents,
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
          
          if (results[viewName as keyof typeof results]) {
            break; // Success, exit retry loop
          }
          
        } catch (error) {
          console.error(`Failed to generate ${viewName} view (attempt ${retryCount + 1}):`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
    }

    return results;
  },

  // Enhanced scene image generation with retry mechanism
  generateSceneImageWithRetry: async (
    description: string,
    consistencyContext: string,
    size: ImageSize,
    characterImage?: string | null,
    maxRetries: number = 3
  ): Promise<string> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await geminiService.generateSceneImage(
          description,
          consistencyContext,
          size,
          characterImage
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Scene image generation failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error('Scene image generation failed after all retries');
  }
};

export { geminiService };
