export interface ConsistencyBible {
  characterVisuals: string;
  environmentVisuals: string;
}

export interface Scene {
  id: number;
  title: string;
  context: string;
  imageADescription: string;
  imageBDescription: string;
  motionPrompt: string;
  // Character consistency metadata
  characterDirection?: 'left' | 'right' | 'forward' | 'back';
  characterExpression?: string;
  characterPose?: string;
  // UI State
  imageAUrl?: string;
  imageBUrl?: string;
  isGeneratingImage?: boolean;
  retryAttempt?: number;
  imageAFailed?: boolean;
  imageBFailed?: boolean;
}

export interface CharacterReferenceSheet {
  front: string;
  side: string;
  back: string;
}

export interface StoryboardData {
  consistencyBible: ConsistencyBible;
  scenes: Scene[];
  characterReferenceSheet?: CharacterReferenceSheet;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface GenerationConfig {
  script: string;
  imageSize: ImageSize;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}