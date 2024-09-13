// /app/screenplay-editor/page.tsx

import { FC } from 'react';
import Editor from './Editor';

const ScreenplayEditorPage: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 shadow">
        <h1 className="text-2xl font-bold">Screenplay Editor</h1>
      </header>

      {/* Main Editor */}
      <main className="flex-grow flex justify-center p-4">
        <div className="w-full max-w-7xl bg-white shadow-lg rounded-lg overflow-hidden flex flex-row">
          <Editor />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 Musephoria. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ScreenplayEditorPage;
