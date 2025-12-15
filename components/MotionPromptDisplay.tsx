import React, { useState } from 'react';

interface MotionPromptDisplayProps {
  motionPrompt: string;
  sceneId: number;
}

export const MotionPromptDisplay: React.FC<MotionPromptDisplayProps> = ({ 
  motionPrompt, 
  sceneId 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse the motion prompt to extract timing and steps
  const parseMotionSteps = (prompt: string) => {
    // Try to split by common timing indicators or sentence structure
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim());
    return sentences.map((sentence, index) => ({
      id: index,
      description: sentence.trim(),
      timing: extractTiming(sentence)
    }));
  };
  
  const extractTiming = (sentence: string) => {
    const timingMatch = sentence.match(/\((\d+\.?\d*)\s*seconds?\)/i);
    return timingMatch ? timingMatch[1] + 's' : null;
  };
  
  const motionSteps = parseMotionSteps(motionPrompt);
  
  return (
    <div className="bg-indigo-900 text-indigo-100 p-4 text-sm mt-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-start gap-2">
          <span className="font-bold text-indigo-300 uppercase text-xs flex-shrink-0">Motion Prompt:</span>
          <span className="text-xs text-indigo-400">(Start → End Frame)</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-indigo-300 hover:text-indigo-100 text-xs underline"
        >
          {isExpanded ? 'Collapse' : 'Expand Steps'}
        </button>
      </div>
      
      {!isExpanded ? (
        <div className="text-indigo-50 leading-relaxed">
          {motionPrompt}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-indigo-50 leading-relaxed mb-4">
            <strong>Full Motion:</strong> {motionPrompt}
          </div>
          
          <div className="border-t border-indigo-700 pt-3">
            <div className="text-indigo-300 font-semibold text-xs uppercase mb-2">
              Step-by-Step Breakdown:
            </div>
            
            <div className="space-y-2">
              {motionSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-indigo-100 rounded-full text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-grow">
                    <div className="text-indigo-50 text-xs leading-relaxed">
                      {step.description}
                    </div>
                    {step.timing && (
                      <div className="text-indigo-400 text-xs mt-1 italic">
                        Duration: {step.timing}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};