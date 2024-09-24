'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Copy, Code, X, Users, Film } from 'lucide-react';
import { ElementType, Screenplay, Project } from '../types';
import { getElementType, capitalizeFirstLetter, createNewLine, loadDefaultProject } from '../utils';
import EditorContent from '../components/EditorContent';
import DebugToolbar from '../components/DebugToolbar';
import CharacterModal from '../components/CharacterModal';
import SceneModal from '../components/SceneModal';
import JSONPasteModal from '../components/JSONPasteModal';
import ProjectSidebar from '../components/ProjectSidebar';
import Toolbar from '../components/Toolbar';

const Editor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [screenplay, setScreenplay] = useState<Screenplay>({
    scenes: [],
    characters: [],
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [lastCharacters, setLastCharacters] = useState<string[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editedProjectName, setEditedProjectName] = useState('');
  
  // Modal states
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [fullJSONModalOpen, setFullJSONModalOpen] = useState(false);
  const [pasteJSONModalOpen, setPasteJSONModalOpen] = useState(false);

  // Function to apply formatting based on class name
  const applyFormatting = (className: ElementType) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let container = range.startContainer as HTMLElement | null;

    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    while (
      container &&
      container.parentElement &&
      container.parentElement !== editorRef.current
    ) {
      container = container.parentElement;
    }

    if (!container || container.parentElement !== editorRef.current) {
      const content = className !== 'parenthetical' ? capitalizeFirstLetter('') : '';
      createNewLine(editorRef, className, content);
      return;
    }

    const text = container.textContent?.trim() ?? '';
    container.className = className;

    const newDiv = document.createElement('div');
    newDiv.className = className;
    newDiv.style.minHeight = '1.5em';
    newDiv.style.marginBottom = '0.25rem';
    newDiv.style.padding = '0.5rem';
    newDiv.style.borderRadius = '0.375rem';
    newDiv.style.transition = 'all 0.2s ease-in-out';

    const styleClasses = {
      'scene-heading': ['ml-[5%]', 'mr-[5%]', 'font-bold', 'uppercase', 'bg-gradient-to-r', 'from-green-100', 'to-green-200', 'border-l-4', 'border-green-500', 'text-green-900'],
      'action': ['ml-[5%]', 'mr-[5%]', 'bg-gradient-to-r', 'from-blue-50', 'to-blue-100', 'border-l-4', 'border-blue-400', 'text-blue-900'],
      'character': ['mx-auto', 'w-fit', 'uppercase', 'font-semibold', 'text-center', 'bg-gradient-to-r', 'from-purple-100', 'to-purple-200', 'border-l-4', 'border-purple-500', 'text-purple-900'],
      'parenthetical': ['ml-[25%]', 'mr-[25%]', 'italic', 'bg-gradient-to-r', 'from-pink-50', 'to-pink-100', 'border-l-4', 'border-pink-400', 'text-pink-800'],
      'dialogue': ['ml-[20%]', 'mr-[20%]', 'bg-gradient-to-r', 'from-slate-50', 'to-slate-100', 'border-l-4', 'border-slate-400', 'text-slate-800'],
      'transition': ['ml-[60%]', 'mr-[5%]', 'text-right', 'uppercase', 'font-semibold', 'bg-gradient-to-r', 'from-amber-100', 'to-amber-200', 'border-l-4', 'border-amber-500', 'text-amber-900'],
      'shot': ['ml-[5%]', 'mr-[5%]', 'uppercase', 'font-medium', 'bg-gradient-to-r', 'from-orange-100', 'to-orange-200', 'border-l-4', 'border-orange-500', 'text-orange-900'],
      'note': ['ml-[5%]', 'mr-[5%]', 'italic', 'bg-gradient-to-r', 'from-gray-100', 'to-gray-200', 'border-l-4', 'border-gray-400', 'text-gray-700']
    };

    newDiv.classList.add(...(styleClasses[className] || []));

    switch (className) {
      case 'scene-heading':
      case 'character':
      case 'transition':
      case 'shot':
        newDiv.textContent = text.toUpperCase();
        break;
      case 'parenthetical':
        const cleanText = text.replace(/^\(|\)$/g, '');
        newDiv.textContent = '(' + cleanText + ')';
        break;
      case 'action':
      case 'dialogue':
      case 'note':
        newDiv.textContent = capitalizeFirstLetter(text);
        break;
      default:
        newDiv.textContent = text;
        break;
    }

    if (container.parentElement) {
      container.parentElement.replaceChild(newDiv, container);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(newDiv);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Function to handle the Enter key behavior
  const handleEnter = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let container = range.startContainer as HTMLElement | null;

    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    while (
      container?.parentElement &&
      container.parentElement !== editorRef.current
    ) {
      container = container.parentElement;
    }

    if (!container || container.parentElement !== editorRef.current) {
      createNewLine(editorRef, 'action', capitalizeFirstLetter(''));
      return;
    }

    let newClass: ElementType;

    if (
      container.classList.contains('character') ||
      container.classList.contains('parenthetical')
    ) {
      newClass = 'dialogue';
    } else if (container.classList.contains('dialogue')) {
      newClass = 'action';
    } else if (container.classList.contains('transition')) {
      newClass = 'scene-heading';
    } else {
      newClass = 'action';
    }

    createNewLine(editorRef, newClass, capitalizeFirstLetter(''), container);
  };

  // Function to handle input events
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const text = target.textContent?.trim() ?? '';

    if (target.classList.contains('scene-heading')) {
      const sceneHeadings = screenplay.scenes
        .map((scene) => scene.heading?.text ?? '')
        .filter((txt) => txt !== '');
      const uniqueHeadings = Array.from(new Set(sceneHeadings));
      const filteredSuggestions = uniqueHeadings.filter((heading) =>
        heading.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else if (target.classList.contains('character')) {
      const characterNames = screenplay.characters.map((char) => char.name ?? '');
      const uniqueNames = Array.from(new Set(characterNames));

      const topSuggestion =
        lastCharacters.length >= 2 ? lastCharacters[lastCharacters.length - 2] : '';
      const filteredSuggestions = uniqueNames.filter((name) =>
        name.toLowerCase().includes(text.toLowerCase())
      );

      if (topSuggestion && !filteredSuggestions.includes(topSuggestion)) {
        filteredSuggestions.unshift(topSuggestion);
      }

      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    updateJSONStructure();
  };

  // Function to handle keydown events for suggestions and shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleEnter(e);
    } else if (e.altKey) {
      e.preventDefault();
      const keyMap: { [key: string]: ElementType } = {
        '1': 'scene-heading',
        '2': 'action',
        '3': 'character',
        '4': 'parenthetical',
        '5': 'dialogue',
        '6': 'transition',
        '7': 'shot',
        '8': 'note'
      };
      if (keyMap[e.key]) {
        applyFormatting(keyMap[e.key]!);
      }
    } else if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      // Tab autocomplete logic
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let container = range.startContainer as HTMLElement | null;

      if (container && container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
      }

      while (
        container?.parentElement &&
        container.parentElement !== editorRef.current
      ) {
        container = container.parentElement;
      }

      if (container && container.parentElement === editorRef.current) {
        container.textContent = suggestions[0] ?? '';
        const elementType = getElementType(container);
        if (elementType && elementType !== 'parenthetical') {
          if (elementType === 'character' || elementType === 'transition') {
            container.textContent = container.textContent.toUpperCase();
          } else {
            container.textContent = capitalizeFirstLetter(
              container.textContent ?? ''
            );
          }
        } else if (elementType === 'parenthetical') {
          container.textContent = '(' + (suggestions[0] ?? '') + ')';
        }

        const newRange = document.createRange();
        newRange.selectNodeContents(container);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        setShowSuggestions(false);
      }
    }
  };

  // Function to update the screenplay JSON structure
  const updateJSONStructure = useCallback(() => {
    if (!editorRef.current) return;

    const screenplayData: Screenplay = {
      scenes: [],
      characters: [],
    };
    let currentScene: any = null;
    let currentCharacter: string | null = null;
    let lineNum = 1;
    const lastCharacterLines: string[] = [];

    const elements = Array.from(editorRef.current.children) as HTMLElement[];

    for (const element of elements) {
      const elementType = getElementType(element);
      if (!elementType) continue;

      let text = element.textContent?.trim() ?? '';

      switch (elementType) {
        case 'scene-heading':
        case 'character':
        case 'transition':
        case 'shot':
          text = text.toUpperCase();
          break;
        case 'action':
        case 'dialogue':
        case 'note':
          text = capitalizeFirstLetter(text);
          break;
      }

      if (elementType === 'parenthetical') {
        text = text.replace(/^\(|\)$/g, '');
      }

      const newEntry = { line_number: lineNum++, text };

      switch (elementType) {
        case 'scene-heading':
          currentScene = {
            heading: newEntry,
            screen_actions: [],
            notes: [],
            shots: [],
            transitions: [],
            dialogues: [],
            parentheticals: [],
          };
          screenplayData.scenes.push(currentScene);
          break;
        case 'action':
          if (!currentScene) {
            currentScene = {
              heading: null,
              screen_actions: [],
              notes: [],
              shots: [],
              transitions: [],
              dialogues: [],
              parentheticals: [],
            };
            screenplayData.scenes.push(currentScene);
          }
          currentScene.screen_actions.push(newEntry);
          break;
        case 'note':
          if (!currentScene) {
            currentScene = {
              heading: null,
              screen_actions: [],
              notes: [],
              shots: [],
              transitions: [],
              dialogues: [],
              parentheticals: [],
            };
            screenplayData.scenes.push(currentScene);
          }
          currentScene.notes.push(newEntry);
          break;
        case 'shot':
          if (!currentScene) {
            currentScene = {
              heading: null,
              screen_actions: [],
              notes: [],
              shots: [],
              transitions: [],
              dialogues: [],
              parentheticals: [],
            };
            screenplayData.scenes.push(currentScene);
          }
          currentScene.shots.push(newEntry);
          break;
        case 'transition':
          if (!currentScene) {
            currentScene = {
              heading: null,
              screen_actions: [],
              notes: [],
              shots: [],
              transitions: [],
              dialogues: [],
              parentheticals: [],
            };
            screenplayData.scenes.push(currentScene);
          }
          currentScene.transitions.push(newEntry);
          currentScene = null;
          break;
        case 'character':
          currentCharacter = text;
          lastCharacterLines.push(text);
          if (!screenplayData.characters.find((c: any) => c.name === text)) {
            screenplayData.characters.push({ name: text, dialogue: [] });
          }
          break;
        case 'dialogue':
          if (currentCharacter && currentScene) {
            const dialogueEntry = {
              character: currentCharacter,
              line: newEntry,
            };
            currentScene.dialogues.push(dialogueEntry);

            const character = screenplayData.characters.find(
              (c: any) => c.name === currentCharacter
            );
            if (character) {
              character.dialogue.push(newEntry);
            }
          }
          break;
        case 'parenthetical':
          if (currentCharacter && currentScene) {
            const parentheticalEntry = {
              character: currentCharacter,
              line: newEntry,
            };
            currentScene.parentheticals.push(parentheticalEntry);
          }
          break;
      }
    }

    setScreenplay(screenplayData);
    setLastCharacters(lastCharacterLines);

    setProjects((prevProjects) => {
      const updatedProjects = prevProjects.map((project) => {
        if (project.id === currentProjectId) {
          return { ...project, screenplay: screenplayData };
        }
        return project;
      });
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      return updatedProjects;
    });
  }, [currentProjectId]);

  // Function to reconstruct editor content from screenplay data
  const reconstructEditorContent = useCallback((data: Screenplay) => {
    if (!editorRef.current) return;

    editorRef.current.innerHTML = '';

    const allLines: {
      line_number: number;
      elementType: ElementType;
      text: string;
    }[] = [];

    data.scenes.forEach((scene) => {
      if (scene.heading) {
        allLines.push({
          line_number: scene.heading.line_number,
          elementType: 'scene-heading',
          text: scene.heading.text,
        });
      }
      scene.screen_actions.forEach((action: any) => {
        allLines.push({
          line_number: action.line_number,
          elementType: 'action',
          text: action.text,
        });
      });
      scene.shots.forEach((shot: any) => {
        allLines.push({
          line_number: shot.line_number,
          elementType: 'shot',
          text: shot.text,
        });
      });
      scene.notes.forEach((note: any) => {
        allLines.push({
          line_number: note.line_number,
          elementType: 'note',
          text: note.text,
        });
      });
      scene.dialogues.forEach((dialogue: any) => {
        allLines.push({
          line_number: dialogue.line.line_number,
          elementType: 'character',
          text: dialogue.character,
        });
        allLines.push({
          line_number: dialogue.line.line_number,
          elementType: 'dialogue',
          text: dialogue.line.text,
        });
      });
      scene.parentheticals.forEach((parenthetical: any) => {
        allLines.push({
          line_number: parenthetical.line.line_number,
          elementType: 'parenthetical',
          text: parenthetical.line.text,
        });
      });
      scene.transitions.forEach((transition: any) => {
        allLines.push({
          line_number: transition.line_number,
          elementType: 'transition',
          text: transition.text,
        });
      });
    });

    allLines.sort((a, b) => a.line_number - b.line_number);

    allLines.forEach((line) => {
      createNewLine(editorRef, line.elementType, line.text);
    });
  }, []);

  // Function to copy formatted text to clipboard
  const copyToClipboard = () => {
    if (!editorRef.current) return;

    let formattedText = '';
    let lastElementType = '';

    Array.from(editorRef.current.children).forEach((element) => {
      const elementType = getElementType(element as HTMLElement);
      if (!elementType) return;

      const text = element.textContent?.trim() ?? '';

      switch (elementType) {
        case 'scene-heading':
          formattedText += (lastElementType ? '\n\n' : '') + text.toUpperCase() + '\n';
          break;
        case 'action':
          formattedText += (lastElementType ? '\n' : '') + text + '\n';
          break;
        case 'character':
          formattedText += (lastElementType ? '\n' : '') + text.toUpperCase() + '\n';
          break;
        case 'parenthetical':
          formattedText += '(' + text.replace(/^\(|\)$/g, '') + ')\n';
          break;
        case 'dialogue':
          formattedText += text + '\n';
          break;
        case 'transition':
          formattedText += (lastElementType ? '\n' : '') + text.toUpperCase() + '\n\n';
          break;
        case 'shot':
          formattedText += (lastElementType ? '\n' : '') + text.toUpperCase() + '\n';
          break;
        case 'note':
          formattedText += (lastElementType ? '\n' : '') + text + '\n';
          break;
      }
      lastElementType = elementType;
    });

    navigator.clipboard.writeText(formattedText).then(() => {
      alert('Screenplay copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy screenplay.');
    });
  };

  // Function to create a new project
  const createNewProject = useCallback(async () => {
    const defaultScreenplay = await loadDefaultProject();
    const newProjectId = Date.now().toString();
    const newProject: Project = {
      id: newProjectId,
      name: projects.length === 0 ? 'Default Project' : `Project ${projects.length + 1}`,
      screenplay: defaultScreenplay,
    };
    setProjects((prevProjects) => {
      const updatedProjects = [...prevProjects, newProject];
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      return updatedProjects;
    });
    setCurrentProjectId(newProjectId);
    setScreenplay(newProject.screenplay);
    reconstructEditorContent(newProject.screenplay);
  }, [projects.length, reconstructEditorContent]);

  // Function to select a project
  const selectProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      setScreenplay(project.screenplay);
      reconstructEditorContent(project.screenplay);
    }
  };

  // Function to save JSON to local storage manually
  const saveJSONToLocalStorage = () => {
    updateJSONStructure();
    alert('Screenplay JSON structure saved to local storage.');
  };

  // Function to handle JSON paste
  const handleJSONPaste = (jsonText: string) => {
    try {
      const parsedData = JSON.parse(jsonText) as Screenplay;
      setScreenplay(parsedData);
      reconstructEditorContent(parsedData);
      
      // Update current project
      setProjects((prevProjects) => {
        const updatedProjects = prevProjects.map((project) => {
          if (project.id === currentProjectId) {
            return { ...project, screenplay: parsedData };
          }
          return project;
        });
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        return updatedProjects;
      });
      
      alert('JSON imported successfully!');
    } catch (error) {
      alert('Failed to import JSON. Please check the format.');
    }
  };

  // Function to handle screenplay updates from modals
  const handleUpdateScreenplay = (updatedScreenplay: Screenplay) => {
    setScreenplay(updatedScreenplay);
    reconstructEditorContent(updatedScreenplay);
    
    // Update current project
    setProjects((prevProjects) => {
      const updatedProjects = prevProjects.map((project) => {
        if (project.id === currentProjectId) {
          return { ...project, screenplay: updatedScreenplay };
        }
        return project;
      });
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      return updatedProjects;
    });
  };

  // Project management functions
  const handleEditProjectName = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditedProjectName(currentName);
  };

  const handleSaveProjectName = (projectId: string) => {
    if (editedProjectName.trim() === '') {
      alert('Project name cannot be empty.');
      return;
    }

    setProjects((prevProjects) => {
      const updatedProjects = prevProjects.map((project) => {
        if (project.id === projectId) {
          return { ...project, name: editedProjectName };
        }
        return project;
      });
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      return updatedProjects;
    });
    setEditingProjectId(null);
    setEditedProjectName('');
  };

  // Load projects from local storage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const projectsData = JSON.parse(savedProjects) as Project[];
        setProjects(projectsData);
        if (projectsData.length > 0) {
          const firstProject = projectsData[0];
          if (firstProject) {
            setCurrentProjectId(firstProject.id);
            setScreenplay(firstProject.screenplay);
            reconstructEditorContent(firstProject.screenplay);
          } else {
            createNewProject();
          }
        } else {
          createNewProject();
        }
      } catch (error) {
        createNewProject();
      }
    } else {
      createNewProject();
    }
  }, [createNewProject, reconstructEditorContent]);

  // Auto-save JSON structure every minute
  useEffect(() => {
    const interval = setInterval(() => {
      updateJSONStructure();
    }, 60000);
    return () => clearInterval(interval);
  }, [screenplay, currentProjectId, updateJSONStructure]);

  return (
    <div className="flex flex-col h-full">
      {/* Debug Toolbar */}
      <DebugToolbar
        onOpenCharacterModal={() => setCharacterModalOpen(true)}
        onOpenSceneModal={() => setSceneModalOpen(true)}
        onOpenFullJSON={() => setFullJSONModalOpen(true)}
        onPasteJSON={() => setPasteJSONModalOpen(true)}
      />

      <div className="flex flex-row flex-1 overflow-hidden">
        <ProjectSidebar
          projects={projects}
          currentProjectId={currentProjectId}
          editingProjectId={editingProjectId}
          editedProjectName={editedProjectName}
          onCreateNewProject={createNewProject}
          onSelectProject={selectProject}
          onEditProjectName={handleEditProjectName}
          onSaveProjectName={handleSaveProjectName}
          setEditedProjectName={setEditedProjectName}
        />

        <div className="flex flex-col flex-grow">
          <Toolbar
            onApplyFormatting={applyFormatting}
            onSave={saveJSONToLocalStorage}
            onCopy={copyToClipboard}
          />

          <div className="relative flex-grow bg-white dark:bg-slate-900">
            <EditorContent
              ref={editorRef}
              className="absolute inset-0 p-6 overflow-y-auto"
              onKeyDown={handleKeyDown}
              onInput={handleInput}
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-4 left-6 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-w-xs">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm border-b border-slate-100 dark:border-slate-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (!selection || selection.rangeCount === 0) return;

                      const range = selection.getRangeAt(0);
                      let container = range.startContainer as HTMLElement | null;

                      if (container && container.nodeType === Node.TEXT_NODE) {
                        container = container.parentElement;
                      }

                      while (
                        container?.parentElement &&
                        container.parentElement !== editorRef.current
                      ) {
                        container = container.parentElement;
                      }

                      if (container && container.parentElement === editorRef.current) {
                        container.textContent = suggestion;
                        const elementType = getElementType(container);
                        if (elementType && elementType !== 'parenthetical') {
                          if (elementType === 'character' || elementType === 'transition') {
                            container.textContent = container.textContent.toUpperCase();
                          } else {
                            container.textContent = capitalizeFirstLetter(
                              container.textContent ?? ''
                            );
                          }
                        } else if (elementType === 'parenthetical') {
                          container.textContent = '(' + (suggestion ?? '') + ')';
                        }

                        const newRange = document.createRange();
                        newRange.selectNodeContents(container);
                        newRange.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                        setShowSuggestions(false);
                      }
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CharacterModal
        isOpen={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        screenplay={screenplay}
        onUpdateScreenplay={handleUpdateScreenplay}
      />

      <SceneModal
        isOpen={sceneModalOpen}
        onClose={() => setSceneModalOpen(false)}
        screenplay={screenplay}
        onUpdateScreenplay={handleUpdateScreenplay}
      />

      <JSONPasteModal
        isOpen={pasteJSONModalOpen}
        onClose={() => setPasteJSONModalOpen(false)}
        onPaste={handleJSONPaste}
      />

      {/* Full JSON Modal */}
      {fullJSONModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Code className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Complete Screenplay JSON</h3>
                    <p className="text-slate-300 text-sm">Full structured data export of your screenplay</p>
                  </div>
                </div>
                <button
                  onClick={() => setFullJSONModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="ml-3 text-sm text-slate-400 font-mono">screenplay.json</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(screenplay, null, 2))
                        .then(() => alert('JSON copied to clipboard!'))
                        .catch(() => alert('Failed to copy JSON'));
                    }}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <pre className="text-sm overflow-auto text-green-400 font-mono leading-relaxed max-h-96">
                  {JSON.stringify(screenplay, null, 2)}
                </pre>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">Characters</h4>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 mb-1">{screenplay.characters.length}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {screenplay.characters.reduce((acc, char) => acc + char.dialogue.length, 0)} total dialogue lines
                  </p>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Scenes</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mb-1">{screenplay.scenes.length}</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {screenplay.scenes.reduce((acc, scene) => acc + scene.screen_actions.length, 0)} total actions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;