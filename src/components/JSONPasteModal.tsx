'use client';

import React, { useState } from 'react';
import { Upload, X, Code } from 'lucide-react';

interface JSONPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaste: (json: string) => void;
}

const JSONPasteModal: React.FC<JSONPasteModalProps> = ({ isOpen, onClose, onPaste }) => {
  const [jsonText, setJsonText] = useState('');

  if (!isOpen) return null;

  const handlePaste = () => {
    try {
      JSON.parse(jsonText); // Validate JSON
      onPaste(jsonText);
      setJsonText('');
      onClose();
    } catch (error) {
      alert('Invalid JSON format. Please check your input.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 max-w-3xl w-full max-h-[70vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Import Screenplay JSON</h3>
                <p className="text-emerald-100 text-sm">Paste your screenplay data to import it into the editor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-8">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Screenplay JSON Data
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-80 p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-mono text-sm bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none shadow-inner"
              placeholder={`Paste your screenplay JSON here...

Example format:
{
  "scenes": [...],
  "characters": [...]
}`}
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handlePaste}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Upload className="h-5 w-5" />
              Import Screenplay
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 hover:from-slate-300 hover:to-slate-400 text-slate-800 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              Cancel
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-500 rounded-lg mt-1">
                <Code className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Import Instructions</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Paste valid screenplay JSON in the format exported by this editor. The JSON should contain "scenes" and "characters" arrays with the proper structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSONPasteModal;