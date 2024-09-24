'use client';

import React from 'react';
import { Save, Copy, Film } from 'lucide-react';
import { ElementType } from '../types';

interface ToolbarProps {
  onApplyFormatting: (type: ElementType) => void;
  onSave: () => void;
  onCopy: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onApplyFormatting,
  onSave,
  onCopy
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film className="h-6 w-6" />
          Screenplay Editor
        </h1>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { type: 'scene-heading' as ElementType, label: 'Scene', color: 'green' },
            { type: 'action' as ElementType, label: 'Action', color: 'blue' },
            { type: 'character' as ElementType, label: 'Character', color: 'purple' },
            { type: 'parenthetical' as ElementType, label: 'Parenthetical', color: 'pink' },
            { type: 'dialogue' as ElementType, label: 'Dialogue', color: 'slate' },
            { type: 'transition' as ElementType, label: 'Transition', color: 'amber' },
            { type: 'shot' as ElementType, label: 'Shot', color: 'orange' },
            { type: 'note' as ElementType, label: 'Note', color: 'gray' }
          ].map(({ type, label, color }, index) => (
            <button
              key={type}
              className={`px-3 py-2 bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700 text-white rounded-md text-sm font-medium shadow-sm transition-all duration-200`}
              onClick={() => onApplyFormatting(type)}
              title={`${label} (Alt + ${index + 1})`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-grow"></div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-md font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-md font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;