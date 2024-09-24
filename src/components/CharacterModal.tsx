'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, X, MessageSquare, Film, ChevronDown, Sparkles, Save, Edit3, Check, RotateCcw } from 'lucide-react';
import { Screenplay, Character } from '../types';
import { getCharacterActions, getDialogueWithContext } from '../utils';
import DialogueRewriteModal from './DialogueRewriteModal';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenplay: Screenplay;
  onUpdateScreenplay: (screenplay: Screenplay) => void;
}

interface DialogueLine {
  line_number: number;
  text: string;
  isChanged?: boolean;
}

const CharacterModal: React.FC<CharacterModalProps> = ({ isOpen, onClose, screenplay, onUpdateScreenplay }) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [expandedDialogue, setExpandedDialogue] = useState<Set<number>>(new Set());
  const [showDialogueRewrite, setShowDialogueRewrite] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [modifiedDialogue, setModifiedDialogue] = useState<DialogueLine[]>([]);
  const [originalDialogue, setOriginalDialogue] = useState<DialogueLine[]>([]);

  useEffect(() => {
    if (isOpen && screenplay.characters.length > 0) {
      const firstChar = screenplay.characters[0];
      if (firstChar) {
        setSelectedCharacter(firstChar);
        setModifiedDialogue(firstChar.dialogue.map(d => ({ ...d, isChanged: false })));
        setOriginalDialogue(firstChar.dialogue.map(d => ({ ...d, isChanged: false })));
        setHasUnsavedChanges(false);
      }
    }
  }, [isOpen, screenplay.characters]);

  // Reset states when switching characters
  useEffect(() => {
    if (selectedCharacter) {
      if (hasUnsavedChanges) {
        if (confirm('You have unsaved changes. Do you want to save them before switching characters?')) {
          handleSave();
        }
      }
      setExpandedDialogue(new Set());
      setModifiedDialogue(selectedCharacter.dialogue.map(d => ({ ...d, isChanged: false })));
      setOriginalDialogue(selectedCharacter.dialogue.map(d => ({ ...d, isChanged: false })));
      setHasUnsavedChanges(false);
      setEditingLine(null);
    }
  }, [selectedCharacter]);

  // Handle dialogue update from rewrite modal
  const handleDialogueUpdate = useCallback((updatedDialogue: Array<{ line_number: number; text: string; isChanged: boolean }>) => {
    setModifiedDialogue(updatedDialogue);
    setHasUnsavedChanges(true);
  }, []);

  // Handle individual line editing
  const handleEditLine = useCallback((lineNumber: number, currentText: string) => {
    setEditingLine(lineNumber);
    setEditText(currentText);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingLine === null) return;
    
    setModifiedDialogue(prev => prev.map(line => 
      line.line_number === editingLine 
        ? { ...line, text: editText.trim(), isChanged: true }
        : line
    ));
    
    setEditingLine(null);
    setEditText('');
    setHasUnsavedChanges(true);
  }, [editingLine, editText]);

  const handleCancelEdit = useCallback(() => {
    setEditingLine(null);
    setEditText('');
  }, []);

  // Handle keyboard shortcuts in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Save changes to main screenplay
  const handleSave = useCallback(() => {
    if (!selectedCharacter || !hasUnsavedChanges) return;

    const updatedScreenplay = { ...screenplay };
    
    // Update the character's dialogue
    const characterIndex = updatedScreenplay.characters.findIndex(c => c.name === selectedCharacter.name);
    if (characterIndex !== -1) {
      updatedScreenplay.characters[characterIndex] = {
        ...selectedCharacter,
        dialogue: modifiedDialogue.map(({ isChanged, ...rest }) => rest)
      };
    }

    // Update dialogue in scenes
    updatedScreenplay.scenes = updatedScreenplay.scenes.map(scene => ({
      ...scene,
      dialogues: scene.dialogues.map(dialogue => {
        if (dialogue.character === selectedCharacter.name) {
          const updatedLine = modifiedDialogue.find(line => line.line_number === dialogue.line.line_number);
          if (updatedLine) {
            return {
              ...dialogue,
              line: {
                ...dialogue.line,
                text: updatedLine.text
              }
            };
          }
        }
        return dialogue;
      })
    }));

    onUpdateScreenplay(updatedScreenplay);
    setHasUnsavedChanges(false);
    setOriginalDialogue(modifiedDialogue.map(d => ({ ...d, isChanged: false })));
  }, [selectedCharacter, hasUnsavedChanges, modifiedDialogue, screenplay, onUpdateScreenplay]);

  // Handle revert changes
  const handleRevert = useCallback(() => {
    if (confirm('Are you sure you want to revert all changes? This will restore the original dialogue.')) {
      setModifiedDialogue(originalDialogue.map(d => ({ ...d, isChanged: false })));
      setHasUnsavedChanges(false);
      setEditingLine(null);
    }
  }, [originalDialogue]);

  // Handle modal close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Do you want to save them before closing?')) {
        handleSave();
      }
    }
    onClose();
  }, [hasUnsavedChanges, handleSave, onClose]);

  const toggleDialogueExpansion = (index: number) => {
    const newExpanded = new Set(expandedDialogue);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDialogue(newExpanded);
  };

  const renderContextElement = (element: any, index: number) => {
    const getElementStyles = (type: string) => {
      switch (type) {
        case 'scene-heading':
          return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold uppercase';
        case 'action':
          return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
        case 'character':
          return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 font-semibold uppercase text-center';
        case 'dialogue':
          return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 ml-4';
        case 'parenthetical':
          return 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200 italic ml-8';
        case 'transition':
          return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold uppercase text-right';
        case 'shot':
          return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 uppercase';
        case 'note':
          return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 italic';
        default:
          return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
      }
    };

    return (
      <div
        key={index}
        className={`p-2 rounded-lg text-sm font-mono ${getElementStyles(element.type)} border border-opacity-50`}
      >
        {element.text}
      </div>
    );
  };

  // Memoized dialogue with context for better performance
  const dialogueWithContext = useMemo(() => {
    if (!selectedCharacter) return [];
    return getDialogueWithContext(screenplay, selectedCharacter.name);
  }, [screenplay, selectedCharacter]);

  // Merge dialogue with context and modified dialogue
  const enrichedDialogue = useMemo(() => {
    return dialogueWithContext.map(item => {
      const modifiedLine = modifiedDialogue.find(line => line.line_number === item.dialogue.line_number);
      return {
        ...item,
        dialogue: {
          ...item.dialogue,
          text: modifiedLine?.text || item.dialogue.text
        },
        isChanged: modifiedLine?.isChanged || false
      };
    });
  }, [dialogueWithContext, modifiedDialogue]);

  if (!isOpen) return null;

  const getCharacterStats = (character: Character) => {
    const totalLines = modifiedDialogue.length;
    const totalWords = modifiedDialogue.reduce((acc, line) => acc + line.text.split(' ').length, 0);
    const actions = getCharacterActions(screenplay, character.name);
    
    return {
      totalLines,
      totalWords,
      averageWordsPerLine: totalLines > 0 ? Math.round(totalWords / totalLines) : 0,
      actionMentions: actions.length,
      changedLines: modifiedDialogue.filter(line => line.isChanged).length
    };
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Character Analysis</h3>
                  <p className="text-purple-100 text-sm">Deep dive into character development and dialogue patterns</p>
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
            {/* Character List Sidebar */}
            <div className="w-80 border-r border-slate-200/50 dark:border-slate-700/50 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Characters ({screenplay.characters.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {screenplay.characters.map((character, index) => {
                    const stats = getCharacterStats(character);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedCharacter(character);
                        }}
                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${
                          selectedCharacter?.name === character.name
                            ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 border-2 border-purple-300 dark:border-purple-600 shadow-lg'
                            : 'bg-white/80 dark:bg-slate-700/80 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-600 dark:hover:to-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{character.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            {stats.totalLines} lines
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                            {stats.totalWords} words
                          </span>
                          {stats.changedLines > 0 && (
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                              {stats.changedLines} changed
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Character Details */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {selectedCharacter ? (
                <>
                  {/* Stats Header - Spans Both Columns */}
                  <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            {selectedCharacter.name}
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400">
                            Character Analysis & Dialogue Breakdown
                            {hasUnsavedChanges && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">• Unsaved changes</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDialogueRewrite(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                        >
                          <Sparkles className="h-5 w-5" />
                          AI Rewrite
                        </button>
                        
                        {hasUnsavedChanges && (
                          <button
                            onClick={handleRevert}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                          >
                            <RotateCcw className="h-5 w-5" />
                            Revert
                          </button>
                        )}
                        
                        <button
                          onClick={handleSave}
                          disabled={!hasUnsavedChanges}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 ${
                            hasUnsavedChanges
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                              : 'bg-slate-300 text-slate-600 cursor-not-allowed hover:scale-100'
                          }`}
                        >
                          <Save className="h-5 w-5" />
                          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                        </button>
                      </div>
                    </div>
                    
                    {(() => {
                      const stats = getCharacterStats(selectedCharacter);
                      return (
                        <div className="grid grid-cols-5 gap-4">
                          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-3xl font-bold mb-1">{stats.totalLines}</div>
                            <div className="text-purple-100 text-sm font-medium">Total Lines</div>
                          </div>
                          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-3xl font-bold mb-1">{stats.totalWords}</div>
                            <div className="text-indigo-100 text-sm font-medium">Total Words</div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-3xl font-bold mb-1">{stats.averageWordsPerLine}</div>
                            <div className="text-blue-100 text-sm font-medium">Avg Words/Line</div>
                          </div>
                          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-3xl font-bold mb-1">{stats.actionMentions}</div>
                            <div className="text-cyan-100 text-sm font-medium">Action Mentions</div>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all duration-200">
                            <div className="text-3xl font-bold mb-1">{stats.changedLines}</div>
                            <div className="text-emerald-100 text-sm font-medium">Modified Lines</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Two Column Layout */}
                  <div className="flex-1 grid grid-cols-2 gap-8 p-8 overflow-hidden">
                    {/* Left Column - Dialogue */}
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          Dialogue ({modifiedDialogue.length} lines)
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {enrichedDialogue.map((item, index) => (
                          <div key={index} className={`rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                            item.isChanged 
                              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700'
                              : 'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-slate-200 dark:border-slate-600'
                          }`}>
                            
                            {/* Context - Expandable (appears above) */}
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                expandedDialogue.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              <div className="px-5 pt-5 border-b border-slate-200 dark:border-slate-600 pb-4">
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  Context leading up to dialogue:
                                </div>
                                <div className="space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                                  {item.context.map(renderContextElement)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Main Dialogue */}
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-1 text-white text-xs font-medium rounded-full ${
                                    item.isChanged ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                  }`}>
                                    Line {item.dialogue.line_number}
                                  </div>
                                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                    {selectedCharacter.name}
                                  </div>
                                  {item.isChanged && (
                                    <div className="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-full">
                                      Modified
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  {editingLine === item.dialogue.line_number ? (
                                    <>
                                      <button
                                        onClick={handleSaveEdit}
                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                        title="Save edit"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-colors"
                                        title="Cancel edit"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditLine(item.dialogue.line_number, item.dialogue.text)}
                                        className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                        title="Edit dialogue"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                      
                                      {item.context.length > 0 && (
                                        <button
                                          onClick={() => toggleDialogueExpansion(index)}
                                          className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                                          title={expandedDialogue.has(index) ? 'Hide context' : 'Show context'}
                                        >
                                          <ChevronDown className={`h-3 w-3 transition-transform ${expandedDialogue.has(index) ? '' : 'rotate-180'}`} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {editingLine === item.dialogue.line_number ? (
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={2}
                                  placeholder="Edit dialogue..."
                                />
                              ) : (
                                <div className="text-slate-900 dark:text-slate-100 font-mono text-base leading-relaxed">
                                  "{item.dialogue.text}"
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column - Action Mentions */}
                    <div className="flex flex-col overflow-hidden">
                      {(() => {
                        const actions = getCharacterActions(screenplay, selectedCharacter.name);
                        return (
                          <>
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                                <Film className="h-5 w-5 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Action Mentions ({actions.length})
                              </h3>
                            </div>
                            {actions.length > 0 ? (
                              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {actions.map((action, index) => (
                                  <div key={index} className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-medium rounded-full">
                                        Line {action.line_number}
                                      </div>
                                    </div>
                                    <div className="text-slate-900 dark:text-slate-100 font-mono text-base leading-relaxed">{action.text}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl mb-4">
                                  <Film className="h-8 w-8 text-blue-500" />
                                </div>
                                <h4 className="font-medium mb-1">No Action Mentions</h4>
                                <p className="text-center text-sm">This character isn't mentioned in any action lines yet.</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-12">
                  <div className="p-6 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl mb-4">
                    <Users className="h-12 w-12 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Select a Character</h3>
                  <p className="text-center">Choose a character from the sidebar to view their detailed analysis and dialogue breakdown.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue Rewrite Modal */}
      {selectedCharacter && (
        <DialogueRewriteModal
          isOpen={showDialogueRewrite}
          onClose={() => setShowDialogueRewrite(false)}
          character={{
            ...selectedCharacter,
            dialogue: modifiedDialogue.map(({ isChanged, ...rest }) => rest)
          }}
          onDialogueUpdate={handleDialogueUpdate}
        />
      )}
    </>
  );
};

export default CharacterModal;