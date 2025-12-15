import React from 'react';
import { Scene } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { MotionPromptDisplay } from './MotionPromptDisplay';

interface SceneCardProps {
  scene: Scene;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene }) => {
  return (
    <>
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Scene {scene.id}: {scene.title}</h3>
        {scene.isGeneratingImage && (
           <span className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
             <LoadingSpinner /> Generating Visuals...
           </span>
        )}
      </div>

      {/* Context */}
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-sm text-slate-600 italic">{scene.context}</p>
      </div>

      {/* Images Grid */}
      <div className="relative p-5 bg-slate-50/50 grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image A */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Frame (A)</span>
               <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">Initial</span>
            </div>
            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden relative group border border-slate-300">
              {scene.imageAUrl ? (
                <img src={scene.imageAUrl} alt="Scene Start" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                   {scene.isGeneratingImage ? (
                     <div className="flex flex-col items-center gap-2 text-slate-400">
                       <LoadingSpinner />
                       <span className="text-xs">Rendering...</span>
                     </div>
                   ) : (
                     <span className="text-xs text-slate-400">Waiting for generation...</span>
                   )}
                </div>
              )}
              <div className="absolute inset-0 bg-black/80 p-4 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-y-auto">
                {scene.imageADescription}
              </div>
            </div>
          </div>

          {/* Image B */}
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Frame (B)</span>
               <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">Final</span>
            </div>
            <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden relative group border border-slate-300">
              {scene.imageBUrl ? (
                <img src={scene.imageBUrl} alt="Scene End" className="w-full h-full object-cover" />
              ) : (
                 <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                   {scene.isGeneratingImage ? (
                     <div className="flex flex-col items-center gap-2 text-slate-400">
                       <LoadingSpinner />
                       <span className="text-xs">Rendering...</span>
                     </div>
                   ) : (
                     <span className="text-xs text-slate-400">Waiting for generation...</span>
                   )}
                </div>
              )}
              <div className="absolute inset-0 bg-black/80 p-4 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-y-auto">
                {scene.imageBDescription}
              </div>
            </div>
          </div>
        </div>
        
        {/* Motion Flow Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center z-10">
          <div className="bg-indigo-500 text-white rounded-full p-2 shadow-lg">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Enhanced Motion Prompt Display */}
      <MotionPromptDisplay motionPrompt={scene.motionPrompt} sceneId={scene.id} />
    </>
  );
};
