import React, { useState, useCallback, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { StoryboardData, ImageSize, Scene } from './types';
import { BibleCard } from './components/BibleCard';
import { SceneCard } from './components/SceneCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DownloadSection } from './components/DownloadSection';
import { CharacterConsistencyIndicator } from './components/CharacterConsistencyIndicator';

const App: React.FC = () => {
  const [script, setScript] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [isGeneratingCharacterSheet, setIsGeneratingCharacterSheet] = useState(false);
  
  // API Key State
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  
  // Use a ref to keep track of the current storyboard state for the async queue
  const storyboardRef = useRef<StoryboardData | null>(null);

  // Check API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          // Fallback for environments without the wrapper (though instructions imply it exists)
          setHasApiKey(true); 
        }
      } catch (e) {
        console.error("Failed to check API key", e);
        setHasApiKey(false);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        setError(null);
      }
    } catch (e) {
      console.error("Failed to select key", e);
      setError("Failed to select API key. Please try again.");
    }
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScript(e.target.value);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setImageSize(e.target.value as ImageSize);
  };

  const updateSceneInState = (sceneId: number, updates: Partial<Scene>) => {
    setStoryboard((prev) => {
      if (!prev) return null;
      const newScenes = prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s));
      const newState = { ...prev, scenes: newScenes };
      storyboardRef.current = newState; // Keep ref in sync
      return newState;
    });
  };

  const processImagesQueue = async (data: StoryboardData, size: ImageSize, charImage: string | null) => {
    // Generate images sequentially to avoid rate limits and provide steady progress
    const consistencyContext = `Character: ${data.consistencyBible.characterVisuals}\nEnvironment: ${data.consistencyBible.environmentVisuals}`;

    for (const scene of data.scenes) {
      // Mark scene as generating
      updateSceneInState(scene.id, { isGeneratingImage: true });

      try {
        // Generate Image A with retry mechanism
        let imageA: string | null = null;
        updateSceneInState(scene.id, { retryAttempt: 1 });
        try {
          imageA = await geminiService.generateSceneImageWithRetry(scene.imageADescription, consistencyContext, size, charImage);
          updateSceneInState(scene.id, { imageAUrl: imageA, imageAFailed: false });
        } catch (imgError) {
          console.error(`Failed to generate Image A for scene ${scene.id} after retries:`, imgError);
          updateSceneInState(scene.id, { imageAFailed: true });
        }

        // Generate Image B with retry mechanism
        let imageB: string | null = null;
        updateSceneInState(scene.id, { retryAttempt: 2 });
        try {
          imageB = await geminiService.generateSceneImageWithRetry(scene.imageBDescription, consistencyContext, size, charImage);
          updateSceneInState(scene.id, { imageBUrl: imageB, imageBFailed: false });
        } catch (imgError) {
          console.error(`Failed to generate Image B for scene ${scene.id} after retries:`, imgError);
          updateSceneInState(scene.id, { imageBFailed: true });
        }

        // If both images failed, show error but continue with other scenes
        if (!imageA && !imageB) {
          console.error(`Both images failed for scene ${scene.id}`);
          // Don't stop the entire queue, just mark this scene as problematic
        }

      } catch (err: any) {
        console.error(`Failed to generate images for scene ${scene.id}`, err);
        
        const errMsg = err?.message || JSON.stringify(err);
        if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Requested entity was not found")) {
          setError("Permission denied. You must select a valid API Key from a paid project to use these features.");
          setHasApiKey(false); // Reset key state to force re-selection
          updateSceneInState(scene.id, { isGeneratingImage: false });
          return; // Stop the queue
        }
      } finally {
        updateSceneInState(scene.id, { isGeneratingImage: false });
      }
    }

    // After all scenes, check for any missing images and retry them once more
    await retryMissingImages(data, size, charImage, consistencyContext);
  };

  const retryMissingImages = async (data: StoryboardData, size: ImageSize, charImage: string | null, consistencyContext: string) => {
    const currentStoryboard = storyboardRef.current;
    if (!currentStoryboard) return;

    const scenesWithMissingImages = currentStoryboard.scenes.filter(scene => !scene.imageAUrl || !scene.imageBUrl);
    
    if (scenesWithMissingImages.length === 0) {
      console.log('All images generated successfully!');
      return;
    }

    console.log(`Retrying ${scenesWithMissingImages.length} scenes with missing images...`);

    for (const scene of scenesWithMissingImages) {
      updateSceneInState(scene.id, { isGeneratingImage: true });

      try {
        // Retry missing Image A
        if (!scene.imageAUrl) {
          updateSceneInState(scene.id, { retryAttempt: 3 });
          try {
            const imageA = await geminiService.generateSceneImageWithRetry(scene.imageADescription, consistencyContext, size, charImage, 2);
            updateSceneInState(scene.id, { imageAUrl: imageA, imageAFailed: false });
            console.log(`Successfully generated Image A for scene ${scene.id} on retry`);
          } catch (error) {
            console.error(`Final retry failed for Image A, scene ${scene.id}:`, error);
            updateSceneInState(scene.id, { imageAFailed: true });
          }
        }

        // Retry missing Image B
        if (!scene.imageBUrl) {
          updateSceneInState(scene.id, { retryAttempt: 4 });
          try {
            const imageB = await geminiService.generateSceneImageWithRetry(scene.imageBDescription, consistencyContext, size, charImage, 2);
            updateSceneInState(scene.id, { imageBUrl: imageB, imageBFailed: false });
            console.log(`Successfully generated Image B for scene ${scene.id} on retry`);
          } catch (error) {
            console.error(`Final retry failed for Image B, scene ${scene.id}:`, error);
            updateSceneInState(scene.id, { imageBFailed: true });
          }
        }
      } finally {
        updateSceneInState(scene.id, { isGeneratingImage: false });
      }
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setStoryboard(null);
    storyboardRef.current = null;
    setCharacterImage(null);

    try {
      const data = await geminiService.generateStoryboardAnalysis(script);
      setStoryboard(data);
      storyboardRef.current = data;

      // Create character from bible
      const charImage = await geminiService.createCharacter(data.consistencyBible.characterVisuals);
      setCharacterImage(charImage);
      
      // Generate character reference sheet in background
      setIsGeneratingCharacterSheet(true);
      try {
        const referenceSheet = await geminiService.createCharacterReferenceSheet(data.consistencyBible.characterVisuals, charImage);
        setStoryboard(prev => prev ? { ...prev, characterReferenceSheet: referenceSheet } : null);
      } catch (error) {
        console.error('Failed to generate character reference sheet:', error);
      } finally {
        setIsGeneratingCharacterSheet(false);
      }
      
      // Start image generation in background after state update
      processImagesQueue(data, imageSize, charImage);
    } catch (err: any) {
      const errMsg = err?.message || JSON.stringify(err);
      if (errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Requested entity was not found")) {
          setError("Permission denied. Please select a valid API Key.");
          setHasApiKey(false);
      } else {
          setError(errMsg || "An unexpected error occurred.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (checkingKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // API Key Selection Landing Page
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
         <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-fade-in-up">
           <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center font-bold text-3xl text-white mx-auto mb-6 shadow-lg">
             T
           </div>
           <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to ToonFrame</h1>
           <p className="text-slate-600 mb-6">
             This app uses <strong>Gemini 3 Pro</strong> and <strong>Imagen 3</strong> for professional-grade storyboard generation.
           </p>
           
           <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-sm text-left">
             <div className="flex items-start gap-3">
                <span className="text-2xl">💳</span>
                <div>
                   <p className="text-indigo-900 font-semibold mb-1">Paid Project Required</p>
                   <p className="text-indigo-700 leading-relaxed">
                     To generate 4K images and use deep reasoning models, you must select an API key from a paid Google Cloud Project.
                   </p>
                   <a 
                     href="https://ai.google.dev/gemini-api/docs/billing" 
                     target="_blank" 
                     rel="noreferrer" 
                     className="text-indigo-600 underline mt-2 inline-block hover:text-indigo-800 font-medium"
                   >
                     Read billing documentation
                   </a>
                </div>
             </div>
           </div>

           <button 
             onClick={handleSelectKey}
             className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
           >
             <span>🔑 Select API Key</span>
           </button>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-lg">T</div>
             <h1 className="text-xl font-bold tracking-tight">ToonFrame <span className="text-slate-400 font-light">Architect</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-slate-400 hidden sm:block">Powered by Gemini 2.5 & 3.0</div>
             <button 
                onClick={handleSelectKey}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition-colors"
             >
                Switch Key
             </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {characterImage && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Character References</h2>
              {isGeneratingCharacterSheet && (
                <span className="flex items-center gap-2 text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  <LoadingSpinner /> Generating Reference Sheet...
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Character */}
              <div className="lg:col-span-1">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Main Reference</h3>
                <img src={characterImage} alt="Main character reference" className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
              </div>
              
              {/* Reference Sheet Views */}
              {storyboard?.characterReferenceSheet && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Front View</h3>
                    {storyboard.characterReferenceSheet.front ? (
                      <img src={storyboard.characterReferenceSheet.front} alt="Character front view" className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 text-xs">Generating...</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Side View</h3>
                    {storyboard.characterReferenceSheet.side ? (
                      <img src={storyboard.characterReferenceSheet.side} alt="Character side view" className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 text-xs">Generating...</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Back View</h3>
                    {storyboard.characterReferenceSheet.back ? (
                      <img src={storyboard.characterReferenceSheet.back} alt="Character back view" className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 text-xs">Generating...</span>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Reference Sheet Loading State */}
              {!storyboard?.characterReferenceSheet && isGeneratingCharacterSheet && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Front View</h3>
                    <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Side View</h3>
                    <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Back View</h3>
                    <div className="w-full aspect-square bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Input Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-10">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-grow">
              <label htmlFor="script" className="block text-sm font-medium text-slate-700 mb-2">
                Story Script
              </label>
              <textarea
                id="script"
                rows={5}
                className="w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm resize-y"
                placeholder="Enter your scene script here... (e.g., 'A young wizard enters a dusty library, spots a glowing book, and reaches out to grab it.')"
                value={script}
                onChange={handleScriptChange}
                disabled={isAnalyzing}
              />
            </div>
            
            <div className="md:w-64 flex flex-col gap-4">
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-slate-700 mb-2">
                  Image Resolution
                </label>
                <select
                  id="size"
                  className="w-full rounded-lg border-slate-300 border p-3 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  value={imageSize}
                  onChange={handleSizeChange}
                  disabled={isAnalyzing || !!storyboard}
                >
                  <option value="1K">1K (Standard)</option>
                  <option value="2K">2K (High Res)</option>
                  <option value="4K">4K (Ultra Res)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Higher resolutions take longer to generate. 
                  <br />Uses <strong>gemini-3-pro-image-preview</strong>.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isAnalyzing || !script.trim()}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md
                  ${isAnalyzing || !script.trim()
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
              >
                {isAnalyzing ? (
                  <>
                    <LoadingSpinner /> Thinking...
                  </>
                ) : (
                  <>
                    <span>✨ Generate Storyboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-8 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            {error.includes("Permission denied") && (
                <button 
                  onClick={handleSelectKey}
                  className="ml-auto text-sm font-bold underline hover:text-red-900"
                >
                  Select New Key
                </button>
            )}
          </div>
        )}

        {/* Loading State for Analysis (Deep Thinking) */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🧠</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Analyzing Script with Gemini 3 Pro...</h3>
            <p className="text-slate-500 max-w-md mt-2">
              Using deep thinking mode (Budget: 32k tokens) to ensure perfect character and environment consistency.
            </p>
          </div>
        )}

        {/* Results View */}
        {storyboard && !isAnalyzing && (
          <div className="animate-fade-in-up">
            <BibleCard bible={storyboard.consistencyBible} />
            
            {/* Download Section */}
            <DownloadSection storyboard={storyboard} characterImage={characterImage} />
            
            <div className="space-y-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-200 flex-grow"></div>
                <h2 className="text-slate-400 font-bold uppercase tracking-widest text-sm">Action Sequence</h2>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {storyboard.scenes.map((scene, index) => {
                  const previousScene = index > 0 ? storyboard.scenes[index - 1] : undefined;
                  return (
                    <div key={scene.id} className="h-full">
                      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-full">
                        <CharacterConsistencyIndicator scene={scene} previousScene={previousScene} />
                        <SceneCard scene={scene} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;