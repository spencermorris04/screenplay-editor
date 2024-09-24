'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film, X, Sparkles, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { Screenplay, Scene } from '../types';
import { createNewLine } from '../utils';
import EditorContent from './EditorContent';
import SceneRewriteModal from './SceneRewriteModal';

interface SceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenplay: Screenplay;
  onUpdateScreenplay: (screenplay: Screenplay) => void;
}

const SceneModal: React.FC<SceneModalProps> = ({ isOpen, onClose, screenplay, onUpdateScreenplay }) => {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [showSceneRewrite, setShowSceneRewrite] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previousScene, setPreviousScene] = useState<Scene | null>(null); // For revert functionality
  const [originalScene, setOriginalScene] = useState<Scene | null>(null); // For tracking original state
  const sceneEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && screenplay.scenes.length > 0) {
      const firstScene = screenplay.scenes[0];
      if (firstScene) {
        setSelectedScene({ ...firstScene });
        setOriginalScene({ ...firstScene });
        setSelectedSceneIndex(0);
        setPreviousScene(null);
        setHasUnsavedChanges(false);
      }
    }
  }, [isOpen, screenplay.scenes]);

  useEffect(() => {
    if (selectedScene && sceneEditorRef.current) {
      reconstructSceneContent(selectedScene);
      setHasUnsavedChanges(false);
      // Don't reset previousScene here - we want to keep it when switching scenes
    }
  }, [selectedScene]);

  const reconstructSceneContent = useCallback((scene: Scene) => {
    if (!sceneEditorRef.current) return;
    
    sceneEditorRef.current.innerHTML = '';

    const allLines: {
      line_number: number;
      elementType: any;
      text: string;
    }[] = [];

    // Add scene heading
    if (scene.heading) {
      allLines.push({
        line_number: scene.heading.line_number,
        elementType: 'scene-heading',
        text: scene.heading.text,
      });
    }

    // Add all other elements
    scene.screen_actions.forEach(action => {
      allLines.push({ line_number: action.line_number, elementType: 'action', text: action.text });
    });
    scene.shots.forEach(shot => {
      allLines.push({ line_number: shot.line_number, elementType: 'shot', text: shot.text });
    });
    scene.notes.forEach(note => {
      allLines.push({ line_number: note.line_number, elementType: 'note', text: note.text });
    });
    scene.dialogues.forEach(dialogue => {
      allLines.push({ line_number: dialogue.line.line_number, elementType: 'character', text: dialogue.character });
      allLines.push({ line_number: dialogue.line.line_number, elementType: 'dialogue', text: dialogue.line.text });
    });
    scene.parentheticals.forEach(parenthetical => {
      allLines.push({ line_number: parenthetical.line.line_number, elementType: 'parenthetical', text: parenthetical.line.text });
    });
    scene.transitions.forEach(transition => {
      allLines.push({ line_number: transition.line_number, elementType: 'transition', text: transition.text });
    });

    allLines.sort((a, b) => a.line_number - b.line_number);

    allLines.forEach(line => {
      createNewLine(sceneEditorRef, line.elementType, line.text);
    });
  }, []);

  const parseSceneFromEditor = useCallback((): Scene => {
    if (!sceneEditorRef.current) return selectedScene || {
      heading: null,
      screen_actions: [],
      notes: [],
      shots: [],
      transitions: [],
      dialogues: [],
      parentheticals: []
    };

    const updatedScene: Scene = {
      heading: null,
      screen_actions: [],
      notes: [],
      shots: [],
      transitions: [],
      dialogues: [],
      parentheticals: []
    };

    let currentCharacter: string | null = null;
    let lineNum = 1;

    const elements = Array.from(sceneEditorRef.current.children) as HTMLElement[];

    elements.forEach(element => {
      const classList = Array.from(element.classList);
      const text = element.textContent?.trim() || '';
      
      let elementType = '';
      for (const cls of classList) {
        if (['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'note'].includes(cls)) {
          elementType = cls;
          break;
        }
      }

      const lineEntry = { line_number: lineNum++, text };

      switch (elementType) {
        case 'scene-heading':
          updatedScene.heading = lineEntry;
          break;
        case 'action':
          updatedScene.screen_actions.push(lineEntry);
          break;
        case 'character':
          currentCharacter = text.toUpperCase();
          break;
        case 'dialogue':
          if (currentCharacter) {
            updatedScene.dialogues.push({
              character: currentCharacter,
              line: lineEntry
            });
          }
          break;
        case 'parenthetical':
          if (currentCharacter) {
            updatedScene.parentheticals.push({
              character: currentCharacter,
              line: { ...lineEntry, text: text.replace(/^\(|\)$/g, '') }
            });
          }
          break;
        case 'transition':
          updatedScene.transitions.push(lineEntry);
          break;
        case 'shot':
          updatedScene.shots.push(lineEntry);
          break;
        case 'note':
          updatedScene.notes.push(lineEntry);
          break;
      }
    });

    return updatedScene;
  }, [selectedScene]);

  const handleSceneSave = useCallback(() => {
    if (!selectedScene) return;

    const updatedScene = parseSceneFromEditor();

    // Update the screenplay with the modified scene
    const updatedScreenplay = { ...screenplay };
    updatedScreenplay.scenes[selectedSceneIndex] = updatedScene;

    // Update characters array
    const allCharacters = new Set<string>();
    updatedScreenplay.scenes.forEach(scene => {
      scene.dialogues.forEach(dialogue => {
        allCharacters.add(dialogue.character);
      });
    });

    updatedScreenplay.characters = Array.from(allCharacters).map(name => ({
      name,
      dialogue: updatedScreenplay.scenes.flatMap(scene => 
        scene.dialogues.filter(d => d.character === name).map(d => d.line)
      )
    }));

    onUpdateScreenplay(updatedScreenplay);
    
    // Update local state
    setSelectedScene(updatedScene);
    setOriginalScene({ ...updatedScene });
    setHasUnsavedChanges(false);
    setPreviousScene(null); // Clear previous scene after saving
  }, [selectedScene, selectedSceneIndex, screenplay, onUpdateScreenplay, parseSceneFromEditor]);

  // Handle AI rewrite completion - DO NOT AUTO-SAVE
  const handleAIRewriteComplete = useCallback((rewrittenScene: Scene) => {
    if (!selectedScene) return;

    // Store the current scene as the previous version for revert
    setPreviousScene({ ...selectedScene });
    
    // Update the scene in the editor without saving to main screenplay
    setSelectedScene(rewrittenScene);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  }, [selectedScene]);

  // Handle revert to previous scene
  const handleRevertScene = useCallback(() => {
    if (!previousScene) return;
    
    if (confirm('Are you sure you want to revert to the previous version? Any unsaved changes will be lost.')) {
      // Restore the previous scene
      setSelectedScene({ ...previousScene });
      setPreviousScene(null); // Clear previous scene after reverting
      setHasUnsavedChanges(true); // Mark as having changes (reverted back)
    }
  }, [previousScene]);

  // Handle revert to original (when modal opened)
  const handleRevertToOriginal = useCallback(() => {
    if (!originalScene) return;
    
    if (confirm('Are you sure you want to revert to the original version? All changes will be lost.')) {
      setSelectedScene({ ...originalScene });
      setPreviousScene(null);
      setHasUnsavedChanges(false);
    }
  }, [originalScene]);

  // Mark as changed when user types
  const handleSceneInput = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle scene switching with unsaved changes check
  const handleSceneSwitch = useCallback((scene: Scene, index: number) => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save them before switching scenes?')) {
        handleSceneSave();
      }
    }
    setSelectedScene({ ...scene });
    setOriginalScene({ ...scene });
    setSelectedSceneIndex(index);
    setPreviousScene(null); // Clear previous scene when switching
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, handleSceneSave]);

  // Handle modal close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save them before closing?')) {
        handleSceneSave();
      }
    }
    onClose();
  }, [hasUnsavedChanges, handleSceneSave, onClose]);

  if (!isOpen) return null;

  const getSceneStats = (scene: Scene) => {
    return {
      actions: scene.screen_actions.length,
      dialogues: scene.dialogues.length,
      characters: new Set(scene.dialogues.map(d => d.character)).size,
      notes: scene.notes.length,
      shots: scene.shots.length,
      transitions: scene.transitions.length,
      parentheticals: scene.parentheticals.length
    };
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Film className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Scene Analysis & Editor</h3>
                  <p className="text-green-100 text-sm">
                    Explore scene structure and edit content
                    {hasUnsavedChanges && (
                      <span className="ml-2 text-yellow-200">• Unsaved changes</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Scene List Sidebar */}
            <div className="w-80 border-r border-slate-200/50 dark:border-slate-700/50 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg">
                    <Film className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Scenes ({screenplay.scenes.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {screenplay.scenes.map((scene, index) => {
                    const stats = getSceneStats(scene);
                    const isSelected = selectedSceneIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSceneSwitch(scene, index)}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${
                          isSelected
                            ? 'bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/50 dark:to-teal-900/50 border-2 border-green-300 dark:border-green-600 shadow-lg'
                            : 'bg-white/80 dark:bg-slate-700/80 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-600 dark:hover:to-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
                          {scene.heading?.text || `Scene ${index + 1}`}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              {stats.dialogues} dialogue
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              {stats.actions} actions
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            {stats.characters} characters • {stats.shots + stats.notes + stats.transitions} other
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scene Details */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedScene ? (
                <>
                  <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl">
                          <Film className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                            {selectedScene.heading?.text || `Scene ${selectedSceneIndex + 1}`}
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400">
                            Scene Editor - Manual Save Required
                            {hasUnsavedChanges && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">• Unsaved changes</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowSceneRewrite(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                        >
                          <Sparkles className="h-5 w-5" />
                          AI Rewrite
                        </button>
                        
                        {/* Revert Buttons */}
                        {previousScene && (
                          <button
                            onClick={handleRevertScene}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                            title="Revert to previous version"
                          >
                            <RotateCcw className="h-5 w-5" />
                            Revert
                          </button>
                        )}
                        
                        {hasUnsavedChanges && originalScene && (
                          <button
                            onClick={handleRevertToOriginal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                            title="Revert to original version"
                          >
                            <AlertTriangle className="h-5 w-5" />
                            Reset
                          </button>
                        )}
                        
                        <button
                          onClick={handleSceneSave}
                          disabled={!hasUnsavedChanges}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 ${
                            hasUnsavedChanges
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white'
                              : 'bg-slate-300 text-slate-600 cursor-not-allowed hover:scale-100'
                          }`}
                        >
                          <Save className="h-5 w-5" />
                          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                        </button>
                      </div>
                    </div>
                    
                    {(() => {
                      const stats = getSceneStats(selectedScene);
                      return (
                        <div className="grid grid-cols-6 gap-4">
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.actions}</div>
                            <div className="text-blue-100 text-xs font-medium">Actions</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.dialogues}</div>
                            <div className="text-purple-100 text-xs font-medium">Dialogue</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.characters}</div>
                            <div className="text-green-100 text-xs font-medium">Characters</div>
                          </div>
                          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.shots}</div>
                            <div className="text-orange-100 text-xs font-medium">Shots</div>
                          </div>
                          <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.notes}</div>
                            <div className="text-gray-100 text-xs font-medium">Notes</div>
                          </div>
                          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-2xl font-bold mb-1">{stats.transitions}</div>
                            <div className="text-amber-100 text-xs font-medium">Transitions</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 p-4 border-b border-slate-200 dark:border-slate-600">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                          Scene Editor
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
                            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
                          </span>
                          {previousScene && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              Previous version available
                            </span>
                          )}
                        </h3>
                      </div>
                      <EditorContent
                        ref={sceneEditorRef}
                        className="p-6 min-h-96"
                        onInput={handleSceneInput}
                        allowSceneHeadings={false}
                        sceneFilter={selectedScene}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <div className="p-6 bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl mb-4">
                    <Film className="h-12 w-12 text-green-500" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">Select a Scene</h3>
                  <p className="text-center text-slate-600 dark:text-slate-400">Choose a scene from the sidebar to view and edit its content.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scene Rewrite Modal */}
      {selectedScene && (
        <SceneRewriteModal
          isOpen={showSceneRewrite}
          onClose={() => setShowSceneRewrite(false)}
          scene={selectedScene}
          sceneIndex={selectedSceneIndex}
          onRewriteComplete={handleAIRewriteComplete}
        />
      )}
    </>
  );
};

export default SceneModal;