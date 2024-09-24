'use client';

import React from 'react';
import { Scene } from '../types';

interface EditorContentProps {
  onInput?: (e: React.FormEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  allowSceneHeadings?: boolean;
  sceneFilter?: Scene | null;
}

const EditorContent = React.forwardRef<HTMLDivElement, EditorContentProps>(
  ({ onInput, onKeyDown, className = '', allowSceneHeadings = true, sceneFilter }, ref) => {
    return (
      <div
        ref={ref}
        contentEditable
        aria-label="Screenplay Editor"
        className={`font-mono text-base leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${className}`}
        onKeyDown={onKeyDown}
        onInput={onInput}
        suppressContentEditableWarning={true}
      />
    );
  }
);

EditorContent.displayName = 'EditorContent';

export default EditorContent;