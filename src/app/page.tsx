// app/screenplay-editor/page.tsx

import { Montserrat } from "next/font/google";
import Editor from './Editor';

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export default function ScreenplayEditorPage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div>
            <h1 className={`${montserrat.className} text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2`}>
              Screenplay Editor
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Professional screenplay writing with intelligent formatting and auto-suggestions
            </p>
          </div>
        </div>

        {/* Main Editor Container */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <Editor />
        </div>
      </div>
    </div>
  );
}