import React from 'react';
import { Scene } from '../types';

interface CharacterConsistencyIndicatorProps {
  scene: Scene;
  previousScene?: Scene;
}

export const CharacterConsistencyIndicator: React.FC<CharacterConsistencyIndicatorProps> = ({ 
  scene, 
  previousScene 
}) => {
  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'left': return '←';
      case 'right': return '→';
      case 'forward': return '↑';
      case 'back': return '↓';
      default: return '•';
    }
  };

  const getDirectionColor = (direction?: string) => {
    switch (direction) {
      case 'left': return 'text-blue-600 bg-blue-50';
      case 'right': return 'text-green-600 bg-green-50';
      case 'forward': return 'text-purple-600 bg-purple-50';
      case 'back': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const hasDirectionChange = previousScene && 
    previousScene.characterDirection !== scene.characterDirection;

  return (
    <div className="bg-slate-100 p-3 border-b border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Direction:</span>
            <span className={`px-2 py-1 rounded-full font-mono font-bold ${getDirectionColor(scene.characterDirection)}`}>
              {getDirectionIcon(scene.characterDirection)} {scene.characterDirection || 'unset'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Expression:</span>
            <span className="text-slate-700 font-medium">
              {scene.characterExpression || 'neutral'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">Pose:</span>
            <span className="text-slate-700 font-medium">
              {scene.characterPose || 'standing'}
            </span>
          </div>
        </div>
        
        {hasDirectionChange && (
          <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
            <span>⚠️</span>
            <span className="font-medium">Direction Change</span>
          </div>
        )}
      </div>
      
      {hasDirectionChange && (
        <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
          <strong>Flow Notice:</strong> Character direction changed from{' '}
          <span className="font-mono">{previousScene?.characterDirection}</span> to{' '}
          <span className="font-mono">{scene.characterDirection}</span>.
          This may affect animation continuity.
        </div>
      )}
    </div>
  );
};