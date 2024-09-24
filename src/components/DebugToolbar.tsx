'use client';

import React from 'react';
import { Code, Users, Film, Upload } from 'lucide-react';

interface DebugToolbarProps {
  onOpenCharacterModal: () => void;
  onOpenSceneModal: () => void;
  onOpenFullJSON: () => void;
  onPasteJSON: () => void;
}

const DebugToolbar: React.FC<DebugToolbarProps> = ({
  onOpenCharacterModal,
  onOpenSceneModal,
  onOpenFullJSON,
  onPasteJSON
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 border-b border-slate-300 dark:border-slate-600 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            Screenplay Analysis & Tools
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Debug, analyze, and import screenplay data
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onPasteJSON}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            title="Import JSON Data"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </button>
          
          <button
            onClick={onOpenFullJSON}
            className="px-4 py-2.5 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            title="View Complete JSON"
          >
            <Code className="h-4 w-4" />
            Export JSON
          </button>
          
          <button
            onClick={onOpenCharacterModal}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            title="Character Analysis"
          >
            <Users className="h-4 w-4" />
            Characters
          </button>
          
          <button
            onClick={onOpenSceneModal}
            className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            title="Scene Analysis"
          >
            <Film className="h-4 w-4" />
            Scenes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugToolbar;