'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sparkles, X, Send, Film, Edit3, Save, RotateCcw, Eye, MessageSquare, Camera, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Scene } from '../types';
import { createNewLine } from '../utils';
import EditorContent from './EditorContent';

interface SceneRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  sceneIndex: number;
  onRewriteComplete: (rewrittenScene: Scene) => void;
}

interface AIRewriteResponse {
  original_scene: Scene;
  rewritten_scene: Scene;
}

type RewriteMode = 'dialogue_only' | 'everything_except_dialogue';

const LOADING_MESSAGES = [
  "Consulting with Hitchcock's ghost...",
  "Rewriting reality...",
  "Channeling Scorsese's vision...",
  "Stealing techniques from the masters...",
  "Reimagining cinematic possibilities...",
  "Crafting dramatic perfection...",
  "Invoking the muse of storytelling..."
];

const SceneRewriteModal: React.FC<SceneRewriteModalProps> = ({ 
  isOpen, 
  onClose, 
  scene,
  sceneIndex,
  onRewriteComplete 
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>('dialogue_only');
  const [isRewriting, setIsRewriting] = useState(false);
  const [aiResults, setAiResults] = useState<AIRewriteResponse | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'rewritten'>('rewritten');
  const [isEditing, setIsEditing] = useState(false);
  const [editedScene, setEditedScene] = useState<Scene | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Cycle through loading messages
  useEffect(() => {
    if (!isRewriting) return;
    
    const interval = setInterval(() => {
      setCurrentLoadingMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isRewriting]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAiPrompt('');
      setAiResults(null);
      setCurrentLoadingMessage(0);
      setViewMode('rewritten');
      setIsEditing(false);
      setEditedScene(null);
      setIsApplying(false);
    }
  }, [isOpen]);

  // Initialize edited scene when AI results arrive
  useEffect(() => {
    if (aiResults) {
      setEditedScene(aiResults.rewritten_scene);
      reconstructEditorContent(aiResults.rewritten_scene);
    }
  }, [aiResults]);

  // Switch between original and rewritten views
  useEffect(() => {
    if (!aiResults) return;
    
    const sceneToShow = viewMode === 'original' 
      ? aiResults.original_scene 
      : (editedScene || aiResults.rewritten_scene);
    
    if (!isEditing) {
      reconstructEditorContent(sceneToShow);
    }
  }, [viewMode, aiResults, editedScene, isEditing]);

  // Function to reconstruct editor content from scene data
  const reconstructEditorContent = useCallback((sceneData: Scene) => {
    if (!editorRef.current) return;
    
    editorRef.current.innerHTML = '';

    const allLines: {
      line_number: number;
      elementType: any;
      text: string;
    }[] = [];

    // Add scene heading
    if (sceneData.heading) {
      allLines.push({
        line_number: sceneData.heading.line_number,
        elementType: 'scene-heading',
        text: sceneData.heading.text,
      });
    }

    // Add all other elements
    sceneData.screen_actions.forEach(action => {
      allLines.push({ line_number: action.line_number, elementType: 'action', text: action.text });
    });
    sceneData.shots.forEach(shot => {
      allLines.push({ line_number: shot.line_number, elementType: 'shot', text: shot.text });
    });
    sceneData.notes.forEach(note => {
      allLines.push({ line_number: note.line_number, elementType: 'note', text: note.text });
    });
    sceneData.dialogues.forEach(dialogue => {
      allLines.push({ line_number: dialogue.line.line_number, elementType: 'character', text: dialogue.character });
      allLines.push({ line_number: dialogue.line.line_number, elementType: 'dialogue', text: dialogue.line.text });
    });
    sceneData.parentheticals.forEach(parenthetical => {
      allLines.push({ line_number: parenthetical.line.line_number, elementType: 'parenthetical', text: parenthetical.line.text });
    });
    sceneData.transitions.forEach(transition => {
      allLines.push({ line_number: transition.line_number, elementType: 'transition', text: transition.text });
    });

    allLines.sort((a, b) => a.line_number - b.line_number);

    allLines.forEach(line => {
      createNewLine(editorRef, line.elementType, line.text);
    });
  }, []);

  const handleAIRewrite = async () => {
    if (!aiPrompt.trim()) return;

    setIsRewriting(true);
    setCurrentLoadingMessage(0);
    
    try {
      const response = await fetch('/api/ai-rewrite-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scene: scene,
          rewrite_prompt: aiPrompt.trim(),
          rewrite_mode: rewriteMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite scene');
      }

      const result: AIRewriteResponse = await response.json();
      setAiResults(result);
    } catch (error) {
      console.error('Error rewriting scene:', error);
      alert('Failed to rewrite scene. Please try again.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editorRef.current || !aiResults) return;

    // Parse the edited content back into the scene structure
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

    const elements = Array.from(editorRef.current.children) as HTMLElement[];

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

    setEditedScene(updatedScene);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (aiResults) {
      const sceneToShow = viewMode === 'original' 
        ? aiResults.original_scene 
        : (editedScene || aiResults.rewritten_scene);
      reconstructEditorContent(sceneToShow);
    }
  };

  const handleResetToAI = () => {
    if (aiResults && confirm('Reset to original AI suggestion? Any manual edits will be lost.')) {
      setEditedScene(aiResults.rewritten_scene);
      reconstructEditorContent(aiResults.rewritten_scene);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    
    // Simulate processing time for animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const finalScene = editedScene || (aiResults?.rewritten_scene) || scene;
    onRewriteComplete(finalScene);
    
    // Additional delay for success animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsApplying(false);
    onClose();
  };

  // Get scene stats for display
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

  const originalStats = getSceneStats(scene);
  const rewrittenStats = aiResults ? getSceneStats(editedScene || aiResults.rewritten_scene) : originalStats;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Scene Rewrite</h3>
                <p className="text-green-100 text-sm">
                  Transform {scene.heading?.text || `Scene ${sceneIndex + 1}`} with artificial intelligence
                </p>
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

        {!aiResults ? (
          /* Input Phase */
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              {/* Scene Info */}
              <div className="text-center mb-8">
                <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl mb-4 inline-block">
                  <Film className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {scene.heading?.text || `Scene ${sceneIndex + 1}`}
                </h2>
                
                {/* Scene Stats */}
                <div className="flex items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    {originalStats.actions} actions
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    {originalStats.dialogues} dialogue
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {originalStats.characters} characters
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    {originalStats.shots + originalStats.notes + originalStats.transitions + originalStats.parentheticals} other
                  </span>
                </div>
              </div>

              {isRewriting ? (
                /* Loading State */
                <div className="text-center py-12">
                  <div className="relative mb-12">
                    <div className="w-32 h-32 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-2xl">
                      <Sparkles className="h-16 w-16 text-white animate-bounce" />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 border-4 border-green-300 rounded-full animate-ping mx-auto opacity-75"></div>
                    <div className="absolute inset-0 w-32 h-32 border-2 border-green-400 rounded-full animate-ping mx-auto opacity-50" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Rewriting Scene...
                  </h3>
                  <div className="text-lg text-green-600 font-medium animate-pulse mb-6">
                    {LOADING_MESSAGES[currentLoadingMessage]}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                    This might take a moment while our AI analyzes and rewrites the scene
                  </div>
                </div>
              ) : (
                /* Input Form */
                <div className="space-y-6">
                  {/* Rewrite Mode Selection */}
                  <div>
                    <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                      What should the AI rewrite?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setRewriteMode('dialogue_only')}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                          rewriteMode === 'dialogue_only'
                            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 shadow-lg'
                            : 'border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <MessageSquare className={`h-6 w-6 ${rewriteMode === 'dialogue_only' ? 'text-purple-600' : 'text-slate-500'}`} />
                          <h3 className={`font-semibold text-lg ${rewriteMode === 'dialogue_only' ? 'text-purple-900 dark:text-purple-100' : 'text-slate-900 dark:text-slate-100'}`}>
                            Dialogue Only
                          </h3>
                        </div>
                        <p className={`text-sm ${rewriteMode === 'dialogue_only' ? 'text-purple-700 dark:text-purple-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          Rewrite only what characters say and parenthetical directions. Keep all actions, settings, and scene structure exactly the same.
                        </p>
                      </button>
                      
                      <button
                        onClick={() => setRewriteMode('everything_except_dialogue')}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                          rewriteMode === 'everything_except_dialogue'
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 shadow-lg'
                            : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Camera className={`h-6 w-6 ${rewriteMode === 'everything_except_dialogue' ? 'text-blue-600' : 'text-slate-500'}`} />
                          <h3 className={`font-semibold text-lg ${rewriteMode === 'everything_except_dialogue' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
                            Everything Except Dialogue
                          </h3>
                        </div>
                        <p className={`text-sm ${rewriteMode === 'everything_except_dialogue' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          Rewrite the setting, actions, camera shots, and scene elements. Keep all dialogue and character names exactly the same.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      How should we rewrite this scene?
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full h-40 p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-base bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none shadow-inner"
                      placeholder={rewriteMode === 'dialogue_only' 
                        ? `Describe how to change the dialogue...

Examples:
• Make the dialogue more formal and professional
• Add humor and wit to the conversation
• Make characters sound more emotional and dramatic
• Simplify the language for a younger audience
• Give it a film noir/detective feel
• Make the tone more confrontational`
                        : `Describe how to change the scene setting and actions...

Examples:
• Move the scene from indoors to outdoors
• Change from daytime to nighttime
• Add more tension and suspense to the actions
• Set it in a different time period (1920s, future, etc.)
• Make it more action-packed with chase sequences
• Change the location (coffee shop to rooftop, etc.)
• Add weather elements (rain, snow, storm)`
                      }
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleAIRewrite}
                      disabled={!aiPrompt.trim()}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Sparkles className="h-5 w-5" />
                      Rewrite Scene
                      <Send className="h-5 w-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-4 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xl font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className={`p-6 rounded-xl border ${
                    rewriteMode === 'dialogue_only' 
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700'
                      : 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700'
                  }`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                      rewriteMode === 'dialogue_only' 
                        ? 'text-purple-900 dark:text-purple-100'
                        : 'text-blue-900 dark:text-blue-100'
                    }`}>
                      {rewriteMode === 'dialogue_only' ? <MessageSquare className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                      💡 {rewriteMode === 'dialogue_only' ? 'Dialogue Rewriting Tips' : 'Scene Rewriting Tips'}
                    </h4>
                    <ul className={`text-sm space-y-2 ${
                      rewriteMode === 'dialogue_only' 
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      {rewriteMode === 'dialogue_only' ? (
                        <>
                          <li>• <strong>Tone changes:</strong> formal ↔ casual, serious ↔ humorous, confident ↔ uncertain</li>
                          <li>• <strong>Style shifts:</strong> modern ↔ period-appropriate, technical ↔ simple</li>
                          <li>• <strong>Emotional adjustments:</strong> angry, sad, excited, scared, romantic</li>
                          <li>• <strong>Character voice:</strong> make them sound more professional, street-smart, academic</li>
                        </>
                      ) : (
                        <>
                          <li>• <strong>Location changes:</strong> indoor ↔ outdoor, urban ↔ rural, specific venues</li>
                          <li>• <strong>Time shifts:</strong> day ↔ night, different seasons, historical periods</li>
                          <li>• <strong>Mood atmosphere:</strong> tense ↔ relaxed, mysterious ↔ bright, romantic ↔ action-packed</li>
                          <li>• <strong>Visual elements:</strong> weather, lighting, camera angles, action sequences</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Results Phase */
          <div className="flex-1 overflow-hidden">
            {isApplying ? (
              /* Success Animation */
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-md mx-auto">
                  <div className="relative mb-12">
                    <div className="w-32 h-32 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-2xl">
                      <CheckCircle2 className="h-16 w-16 text-white animate-bounce" />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 border-4 border-green-300 rounded-full animate-ping mx-auto opacity-75"></div>
                    <div className="absolute inset-0 w-32 h-32 border-2 border-green-400 rounded-full animate-ping mx-auto opacity-50" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    ✨ Scene Applied Successfully!
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                    Updating scene in editor...
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Comparison Header */}
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ✨ Scene Rewrite Complete
                    </h3>
                    
                    {/* Floating Toggle Button */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-lg border border-slate-200 dark:border-slate-600">
                        <button
                          onClick={() => setViewMode('original')}
                          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                            viewMode === 'original'
                              ? 'bg-slate-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          Original
                        </button>
                        <button
                          onClick={() => setViewMode('rewritten')}
                          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                            viewMode === 'rewritten'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Sparkles className="h-4 w-4" />
                          AI Rewritten
                        </button>
                      </div>
                      
                      {viewMode === 'rewritten' && !isEditing && (
                        <button
                          onClick={handleStartEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                      
                      {isEditing && (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-xl font-semibold transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                          <button
                            onClick={handleResetToAI}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Stats Comparison */}
                  <div className="flex items-center justify-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="text-slate-600 dark:text-slate-400 mb-1">Original</div>
                      <div className="flex gap-4">
                        <span>{originalStats.actions} actions</span>
                        <span>{originalStats.dialogues} dialogue</span>
                        <span>{originalStats.characters} chars</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400" />
                    <div className="text-center">
                      <div className="text-green-600 dark:text-green-400 mb-1">Rewritten</div>
                      <div className="flex gap-4">
                        <span>{rewrittenStats.actions} actions</span>
                        <span>{rewrittenStats.dialogues} dialogue</span>
                        <span>{rewrittenStats.characters} chars</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Scene Viewer */}
                <div className="flex-1 p-6 overflow-hidden">
                  <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className={`p-4 border-b border-slate-200 dark:border-slate-600 ${
                      viewMode === 'original' 
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20'
                    }`}>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${viewMode === 'original' ? 'bg-slate-500' : 'bg-green-500'}`}></div>
                        {viewMode === 'original' ? 'Original Scene' : 'AI Rewritten Scene'}
                        {isEditing && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Editing Mode
                          </span>
                        )}
                      </h3>
                    </div>
                    {isEditing ? (
                      <div
                        ref={editorRef}
                        className="p-6 h-full overflow-y-auto focus:outline-none"
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        style={{ minHeight: '400px' }}
                      />
                    ) : (
                      <EditorContent
                        ref={editorRef}
                        className="p-6 h-full overflow-y-auto"
                      />
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAiResults(null)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Try Another Rewrite
                    </button>
                    <button
                      onClick={handleApply}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Apply {viewMode === 'original' ? 'Original' : 'Rewritten'} Scene
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneRewriteModal;