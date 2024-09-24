'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, X, Send, Wand2, Check, Edit3, CheckCircle2 } from 'lucide-react';
import { Character } from '../types';

interface DialogueRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onDialogueUpdate?: (updatedDialogue: Array<{ line_number: number; text: string; isChanged: boolean }>) => void;
}

interface AIRewriteResponse {
  original_dialogue: Array<{
    line_number: number;
    text: string;
  }>;
  rewritten_dialogue: Array<{
    line_number: number;
    text: string;
  }>;
}

type DialogueState = 'pending' | 'accepted' | 'rejected' | 'editing';

interface DialogueItem {
  line_number: number;
  originalText: string;
  aiText: string;
  currentText: string;
  state: DialogueState;
}

const LOADING_MESSAGES = [
  "Hacking into Paramount...",
  "Consulting with Shakespeare's ghost...",
  "Bribing the script supervisor...",
  "Stealing dialogue from Oscar winners...",
  "Channeling Tarantino's energy..."
];

// Memoized dialogue card component for performance
const DialogueCard = React.memo<{
  item: DialogueItem;
  characterName: string;
  onAccept: (lineNumber: number) => void;
  onReject: (lineNumber: number) => void;
  onEdit: (lineNumber: number) => void;
  onSaveEdit: (lineNumber: number, newText: string) => void;
  onCancelEdit: (lineNumber: number) => void;
}>(({ item, characterName, onAccept, onReject, onEdit, onSaveEdit, onCancelEdit }) => {
  const [editText, setEditText] = useState(item.currentText);
  const [isEditingLocal, setIsEditingLocal] = useState(false);

  useEffect(() => {
    if (item.state === 'editing') {
      setIsEditingLocal(true);
      setEditText(item.currentText);
    } else {
      setIsEditingLocal(false);
    }
  }, [item.state, item.currentText]);

  const handleSaveEdit = useCallback(() => {
    onSaveEdit(item.line_number, editText.trim());
    setIsEditingLocal(false);
  }, [item.line_number, editText, onSaveEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditText(item.currentText);
    setIsEditingLocal(false);
    onCancelEdit(item.line_number);
  }, [item.line_number, item.currentText, onCancelEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  if (item.state === 'pending') {
    // Show both original and AI side by side with action buttons
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1 bg-slate-500 text-white text-xs font-medium rounded-full">
              Line {item.line_number}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {characterName}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => onReject(item.line_number)}
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Keep original"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Original</div>
                <div className="text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed pr-8">
                  "{item.originalText}"
                </div>
              </div>
            </div>
            
            {/* AI Rewritten */}
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => onAccept(item.line_number)}
                  className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Accept AI suggestion"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">AI Rewritten</div>
                <div className="text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed pr-8">
                  "{item.aiText}"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show decided state (accepted, rejected, or editing)
  const isAccepted = item.state === 'accepted' || (item.state === 'editing' && item.currentText === item.aiText);
  const backgroundColor = isAccepted 
    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
    : 'bg-slate-50 dark:bg-slate-700/50';
  const borderColor = isAccepted
    ? 'border-emerald-200 dark:border-emerald-700'
    : 'border-slate-200 dark:border-slate-600';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-500 text-white text-xs font-medium rounded-full">
              Line {item.line_number}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {characterName}
            </div>
            <div className={`px-2 py-1 text-xs font-medium rounded-full ${
              isAccepted 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
            }`}>
              {isAccepted ? 'AI Selected' : 'Original'}
            </div>
          </div>
          
          {item.state !== 'editing' && (
            <button
              onClick={() => onEdit(item.line_number)}
              className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-110"
              title="Edit text"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
        
        <div className={`p-4 rounded-lg border ${backgroundColor} ${borderColor}`}>
          {isEditingLocal ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Edit dialogue..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Save (Ctrl+Enter)
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel (Esc)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed">
              "{item.currentText}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

DialogueCard.displayName = 'DialogueCard';

const DialogueRewriteModal: React.FC<DialogueRewriteModalProps> = ({ 
  isOpen, 
  onClose, 
  character,
  onDialogueUpdate 
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [aiResults, setAiResults] = useState<AIRewriteResponse | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);
  const [dialogueItems, setDialogueItems] = useState<DialogueItem[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // Memoize dialogue items creation
  const initialDialogueItems = useMemo(() => {
    if (!aiResults) return [];
    
    return aiResults.original_dialogue.map((originalLine, index) => {
      const aiLine = aiResults.rewritten_dialogue[index];
      return {
        line_number: originalLine.line_number,
        originalText: originalLine.text,
        aiText: aiLine?.text || originalLine.text,
        currentText: originalLine.text,
        state: 'pending' as DialogueState
      };
    });
  }, [aiResults]);

  // Initialize dialogue items when AI results arrive
  useEffect(() => {
    if (initialDialogueItems.length > 0) {
      setDialogueItems(initialDialogueItems);
    }
  }, [initialDialogueItems]);

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
      setDialogueItems([]);
      setCurrentLoadingMessage(0);
      setIsApplying(false);
    }
  }, [isOpen]);

  // Memoized action handlers
  const handleAccept = useCallback((lineNumber: number) => {
    setDialogueItems(prev => prev.map(item => 
      item.line_number === lineNumber 
        ? { ...item, state: 'accepted', currentText: item.aiText }
        : item
    ));
  }, []);

  const handleReject = useCallback((lineNumber: number) => {
    setDialogueItems(prev => prev.map(item => 
      item.line_number === lineNumber 
        ? { ...item, state: 'rejected', currentText: item.originalText }
        : item
    ));
  }, []);

  const handleEdit = useCallback((lineNumber: number) => {
    setDialogueItems(prev => prev.map(item => 
      item.line_number === lineNumber 
        ? { ...item, state: 'editing' }
        : item
    ));
  }, []);

  const handleSaveEdit = useCallback((lineNumber: number, newText: string) => {
    setDialogueItems(prev => prev.map(item => 
      item.line_number === lineNumber 
        ? { ...item, state: item.currentText === item.aiText ? 'accepted' : 'rejected', currentText: newText }
        : item
    ));
  }, []);

  const handleCancelEdit = useCallback((lineNumber: number) => {
    setDialogueItems(prev => prev.map(item => 
      item.line_number === lineNumber 
        ? { ...item, state: item.currentText === item.aiText ? 'accepted' : 'rejected' }
        : item
    ));
  }, []);

  // Accept all AI suggestions
  const handleAcceptAll = useCallback(() => {
    setDialogueItems(prev => prev.map(item => ({
      ...item,
      state: 'accepted' as DialogueState,
      currentText: item.aiText
    })));
  }, []);

  // Memoized stats
  const selectionStats = useMemo(() => {
    const total = dialogueItems.length;
    const decided = dialogueItems.filter(item => item.state !== 'pending' && item.state !== 'editing').length;
    const accepted = dialogueItems.filter(item => item.state === 'accepted').length;
    const rejected = dialogueItems.filter(item => item.state === 'rejected').length;
    
    return { total, decided, accepted, rejected, pending: total - decided };
  }, [dialogueItems]);

  const handleAIRewrite = async () => {
    if (!aiPrompt.trim()) return;

    setIsRewriting(true);
    setCurrentLoadingMessage(0);
    
    try {
      const response = await fetch('/api/ai-rewrite-dialogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_name: character.name,
          dialogue: character.dialogue,
          rewrite_prompt: aiPrompt.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite dialogue');
      }

      const result = await response.json();
      setAiResults(result);
    } catch (error) {
      console.error('Error rewriting dialogue:', error);
      alert('Failed to rewrite dialogue. Please try again.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleDone = useCallback(async () => {
    setIsApplying(true);
    
    // Simulate processing time for animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (onDialogueUpdate && dialogueItems.length > 0) {
      // For unreviewed items (pending), default to original
      const finalDialogue = dialogueItems.map(item => {
        const finalText = item.state === 'pending' ? item.originalText : item.currentText;
        const isChanged = finalText !== item.originalText;
        
        return {
          line_number: item.line_number,
          text: finalText,
          isChanged
        };
      });
      
      onDialogueUpdate(finalDialogue);
      
      // Additional delay for success animation
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsApplying(false);
    onClose();
  }, [dialogueItems, onDialogueUpdate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Dialogue Rewrite</h3>
                <p className="text-emerald-100 text-sm">
                  Reimagine {character.name}'s dialogue with artificial intelligence
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
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl mb-4 inline-block">
                  <Wand2 className="h-12 w-12 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  {character.name}
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  {character.dialogue.length} lines of dialogue ready to be transformed
                </p>
              </div>

              {isRewriting ? (
                /* Loading State */
                <div className="text-center py-12">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-emerald-600 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Rewriting Dialogue...
                  </h3>
                  <div className="text-emerald-600 font-medium text-lg animate-pulse">
                    {LOADING_MESSAGES[currentLoadingMessage]}
                  </div>
                  <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    This might take a moment while our AI analyzes and rewrites the dialogue
                  </div>
                </div>
              ) : (
                /* Input Form */
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                      How should we rewrite {character.name}'s dialogue?
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full h-32 p-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-base bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none shadow-inner"
                      placeholder="Describe the style or tone you want... 

Examples:
• Make it more dramatic and emotional
• Simplify the language for a younger audience  
• Add more humor and wit
• Make it sound more formal and professional
• Give it a noir/detective feel
• Make the character more confident and assertive"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleAIRewrite}
                      disabled={!aiPrompt.trim()}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Sparkles className="h-5 w-5" />
                      Rewrite Dialogue
                      <Send className="h-5 w-5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-4 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-xl font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Pro Tips</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Be specific about the tone or style you want</li>
                      <li>• Consider the character's personality and role in the story</li>
                      <li>• You can ask for genre changes (comedy → drama, casual → formal)</li>
                      <li>• Try emotional adjustments (more confident, vulnerable, angry, etc.)</li>
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
                    <div className="w-32 h-32 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-2xl">
                      <CheckCircle2 className="h-16 w-16 text-white animate-bounce" />
                    </div>
                    <div className="absolute inset-0 w-32 h-32 border-4 border-emerald-300 rounded-full animate-ping mx-auto opacity-75"></div>
                    <div className="absolute inset-0 w-32 h-32 border-2 border-emerald-400 rounded-full animate-ping mx-auto opacity-50" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    ✨ Changes Applied Successfully!
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                    Updating character dialogue...
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full p-6">
                {/* Stats Header with Accept All Button */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ✨ Review & Select Dialogue
                    </h3>
                    <button
                      onClick={handleAcceptAll}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept All AI
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      {selectionStats.accepted} AI Selected
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      {selectionStats.rejected} Original Kept
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      {selectionStats.pending} Unreviewed (will keep original)
                    </span>
                  </div>
                </div>

                {/* Dialogue Cards */}
                <div className="h-[450px] overflow-y-auto space-y-4 mb-6">
                  {dialogueItems.map((item) => (
                    <DialogueCard
                      key={item.line_number}
                      item={item}
                      characterName={character.name}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onEdit={handleEdit}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setAiResults(null)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  >
                    Try Another Rewrite
                  </button>
                  <button
                    onClick={handleDone}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Apply Changes
                    {selectionStats.pending > 0 && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        ({selectionStats.pending} will keep original)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogueRewriteModal;