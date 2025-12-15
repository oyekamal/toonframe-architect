import React from 'react';
import { ConsistencyBible } from '../types';

interface BibleCardProps {
  bible: ConsistencyBible;
}

export const BibleCard: React.FC<BibleCardProps> = ({ bible }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📖</span> Consistency Bible
        </h2>
        <p className="text-slate-400 text-sm mt-1">Global assets for this session</p>
      </div>
      <div className="p-6 grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-indigo-600 mb-2 uppercase text-sm tracking-wider">Character Visuals</h3>
          <p className="text-slate-700 leading-relaxed bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            {bible.characterVisuals}
          </p>
        </div>
        <div>
          <h3 className="font-bold text-emerald-600 mb-2 uppercase text-sm tracking-wider">Environment Visuals</h3>
          <p className="text-slate-700 leading-relaxed bg-emerald-50 p-4 rounded-lg border border-emerald-100">
            {bible.environmentVisuals}
          </p>
        </div>
      </div>
    </div>
  );
};
