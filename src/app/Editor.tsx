// /app/screenplay-editor/Editor.tsx

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaPencilAlt, FaCheck } from 'react-icons/fa'; // Using react-icons for icons
import type { FC } from 'react';

// Define the types for screenplay elements
type ElementType =
  | 'scene-heading'
  | 'action'
  | 'dialogue'
  | 'parenthetical'
  | 'character'
  | 'transition'
  | 'shot'
  | 'note';

interface LineEntry {
  line_number: number;
  text: string;
}

interface DialogueEntry {
  character: string;
  line: LineEntry;
}

interface ParentheticalEntry {
  character: string;
  line: LineEntry;
}

interface Scene {
  heading: LineEntry | null;
  screen_actions: LineEntry[];
  notes: LineEntry[];
  shots: LineEntry[];
  transitions: LineEntry[];
  dialogues: DialogueEntry[];
  parentheticals: ParentheticalEntry[];
}

interface Character {
  name: string;
  dialogue: LineEntry[];
}

interface Screenplay {
  scenes: Scene[];
  characters: Character[];
}

interface Project {
  id: string;
  name: string;
  screenplay: Screenplay;
}

const Editor: FC = () => {
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

  // Utility function to extract ElementType from classList
  const getElementType = (element: HTMLElement): ElementType | null => {
    const types: ElementType[] = [
      'scene-heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      'shot',
      'note',
    ];
    for (const type of types) {
      if (element.classList.contains(type)) {
        return type;
      }
    }
    return null;
  };

  // Utility function to capitalize first letter
  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  // Function to create and insert a new line with specific formatting
  const createNewLine = (
    type: ElementType,
    content: string = '',
    referenceNode?: HTMLElement
  ) => {
    const newDiv = document.createElement('div');
    newDiv.className = type;
    // Auto-capitalize first letter except for parentheticals
    if (type !== 'parenthetical') {
      newDiv.textContent = capitalizeFirstLetter(content);
    } else {
      newDiv.textContent = '()';
    }
    newDiv.style.minHeight = '1em';
    // Remove margin-bottom to eliminate vertical white space
    newDiv.style.marginBottom = '0';
    newDiv.style.boxSizing = 'border-box';
    newDiv.style.width = '100%';

    // Apply specific styles based on type using Tailwind classes
    switch (type) {
      case 'scene-heading':
        newDiv.classList.add(
          'pl-[5%]',
          'font-bold',
          'uppercase',
          'bg-green-200',
          'bg-opacity-50'
        );
        break;
      case 'action':
        newDiv.classList.add('pl-[5%]', 'bg-yellow-200', 'bg-opacity-50');
        break;
      case 'character':
        newDiv.classList.add(
          'pl-[23%]',
          'text-center',
          'uppercase',
          'bg-blue-200',
          'bg-opacity-50'
        );
        break;
      case 'parenthetical':
        newDiv.classList.add('pl-[25%]', 'bg-pink-200', 'bg-opacity-50');
        newDiv.textContent = '()';
        break;
      case 'dialogue':
        newDiv.classList.add(
          'pl-[20%]',
          'pr-[20%]',
          'bg-red-200',
          'bg-opacity-50'
        );
        break;
      case 'transition':
        newDiv.classList.add(
          'pr-[5%]',
          'text-right',
          'uppercase',
          'bg-purple-200',
          'bg-opacity-50'
        );
        break;
      case 'shot':
        newDiv.classList.add(
          'pl-[5%]',
          'uppercase',
          'bg-orange-200',
          'bg-opacity-50'
        );
        break;
      case 'note':
        newDiv.classList.add(
          'pl-[5%]',
          'italic',
          'bg-gray-300',
          'bg-opacity-50'
        );
        break;
      default:
        break;
    }

    // Insert the new line into the editor
    if (editorRef.current) {
      if (referenceNode && editorRef.current.contains(referenceNode)) {
        editorRef.current.insertBefore(newDiv, referenceNode.nextSibling);
      } else {
        editorRef.current.appendChild(newDiv);
      }
      // Move cursor to the new line
      const range = document.createRange();
      range.selectNodeContents(newDiv);
      range.collapse(true);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      console.error('Editor reference is null.');
    }
  };

  // Function to apply formatting based on class name
  const applyFormatting = (className: ElementType) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let container = range.startContainer as HTMLElement | null;

    // If the selection is a text node, get its parent element
    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // Traverse up to find a container that is a child of editorRef.current
    while (
      container &&
      container.parentElement &&
      container.parentElement !== editorRef.current
    ) {
      container = container.parentElement;
    }

    if (!container || container.parentElement !== editorRef.current) {
      // No container found, create a new line at the current cursor position
      const referenceNode =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? (range.startContainer.parentNode as HTMLElement | null)
          : (range.startContainer as HTMLElement | null);
      if (referenceNode && editorRef.current?.contains(referenceNode)) {
        // Auto-capitalize first letter if not parenthetical
        const content =
          className !== 'parenthetical' ? capitalizeFirstLetter('') : '';
        createNewLine(className, content, referenceNode);
        return;
      }

      // If we can't find a reference node, append at the end
      const content =
        className !== 'parenthetical' ? capitalizeFirstLetter('') : '';
      createNewLine(className, content);
      return;
    }

    // Apply the formatting class
    container.className = className;

    // Remove all previous formatting classes
    const formattingClasses = [
      'pl-[5%]',
      'font-bold',
      'uppercase',
      'bg-green-200',
      'bg-opacity-50',
      'bg-yellow-200',
      'bg-opacity-50',
      'pl-[23%]',
      'text-center',
      'uppercase',
      'bg-blue-200',
      'bg-opacity-50',
      'pl-[25%]',
      'bg-pink-200',
      'bg-opacity-50',
      'pl-[20%]',
      'pr-[20%]',
      'bg-red-200',
      'bg-opacity-50',
      'pr-[5%]',
      'text-right',
      'uppercase',
      'bg-purple-200',
      'bg-opacity-50',
      'pl-[5%]',
      'uppercase',
      'bg-orange-200',
      'bg-opacity-50',
      'pl-[5%]',
      'italic',
      'bg-gray-300',
      'bg-opacity-50',
    ];

    formattingClasses.forEach((cls) => container!.classList.remove(cls));

    // Re-apply classes based on the new formatting
    switch (className) {
      case 'scene-heading':
        container.classList.add(
          'pl-[5%]',
          'font-bold',
          'uppercase',
          'bg-green-200',
          'bg-opacity-50'
        );
        // Capitalize the text
        container.textContent = (container.textContent ?? '').toUpperCase();
        break;
      case 'action':
        container.classList.add('pl-[5%]', 'bg-yellow-200', 'bg-opacity-50');
        container.textContent = capitalizeFirstLetter(
          container.textContent ?? ''
        );
        break;
      case 'character':
        container.classList.add(
          'pl-[23%]',
          'text-center',
          'uppercase',
          'bg-blue-200',
          'bg-opacity-50'
        );
        container.textContent = (container.textContent ?? '').toUpperCase();
        break;
      case 'parenthetical':
        container.classList.add('pl-[25%]', 'bg-pink-200', 'bg-opacity-50');
        // Wrap existing content with parentheses
        let textContent = container.textContent ?? '';
        // Remove existing parentheses if any
        textContent = textContent.replace(/^\(|\)$/g, '');
        container.textContent = '(' + textContent + ')';
        // Move cursor inside the parentheses
        const textNode = container.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const pos = 1;
          const newRange = document.createRange();
          newRange.setStart(textNode, pos);
          newRange.setEnd(textNode, pos + textContent.length);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        break;
      case 'dialogue':
        container.classList.add(
          'pl-[20%]',
          'pr-[20%]',
          'bg-red-200',
          'bg-opacity-50'
        );
        container.textContent = capitalizeFirstLetter(
          container.textContent ?? ''
        );
        break;
      case 'transition':
        container.classList.add(
          'pr-[5%]',
          'text-right',
          'uppercase',
          'bg-purple-200',
          'bg-opacity-50'
        );
        container.textContent = (container.textContent ?? '').toUpperCase();
        break;
      case 'shot':
        container.classList.add(
          'pl-[5%]',
          'uppercase',
          'bg-orange-200',
          'bg-opacity-50'
        );
        container.textContent = (container.textContent ?? '').toUpperCase();
        break;
      case 'note':
        container.classList.add(
          'pl-[5%]',
          'italic',
          'bg-gray-300',
          'bg-opacity-50'
        );
        container.textContent = capitalizeFirstLetter(
          container.textContent ?? ''
        );
        break;
      default:
        break;
    }

    // Set cursor position
    selection.removeAllRanges();
    selection.addRange(range);

    console.log(`Applied formatting: ${className}`);
  };

  // Function to handle the Enter key behavior
  const handleEnter = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let container = range.startContainer as HTMLElement | null;

    // If the selection is a text node, get its parent element
    if (container && container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // Traverse up to find a container that is a child of editorRef.current
    while (
      container?.parentElement &&
      container.parentElement !== editorRef.current
    ) {
      container = container.parentElement;
    }

    if (!container || container.parentElement !== editorRef.current) {
      // If no specific line is selected, default to action
      createNewLine('action', capitalizeFirstLetter(''));
      return;
    }

    let newClass: ElementType;

    if (
      container.classList.contains('character') ||
      container.classList.contains('parenthetical')
    ) {
      newClass = 'dialogue';
    } else if (container.classList.contains('dialogue')) {
      // Default new line after dialogue to action
      newClass = 'action';
    } else if (container.classList.contains('transition')) {
      newClass = 'scene-heading';
    } else {
      newClass = 'action';
    }

    // Create and insert the new line after the current line
    createNewLine(newClass, capitalizeFirstLetter(''), container);

    console.log(`Inserted new line with type: ${newClass}`);
  };

  // Function to handle input events
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const text = target.textContent?.trim() ?? '';

    // Handle suggestions for scene headings and character names
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

      // Suggest second last used character
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

    // Update the JSON structure
    updateJSONStructure();
  };

  // Function to handle keydown events for suggestions and shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleEnter(e);
    } else if (e.altKey) {
      e.preventDefault();
      switch (e.key) {
        case '1':
          applyFormatting('scene-heading');
          break;
        case '2':
          applyFormatting('action');
          break;
        case '3':
          applyFormatting('character');
          break;
        case '4':
          applyFormatting('parenthetical');
          break;
        case '5':
          applyFormatting('dialogue');
          break;
        case '6':
          applyFormatting('transition');
          break;
        case '7':
          applyFormatting('shot');
          break;
        case '8':
          applyFormatting('note');
          break;
        default:
          break;
      }
    } else if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let container = range.startContainer as HTMLElement | null;

      // If the selection is a text node, get its parent element
      if (container && container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement;
      }

      // Traverse up to find a container that is a child of editorRef.current
      while (
        container?.parentElement &&
        container.parentElement !== editorRef.current
      ) {
        container = container.parentElement;
      }

      if (container && container.parentElement === editorRef.current) {
        // Replace the text with the top suggestion
        container.textContent = suggestions[0] ?? '';
        // Apply capitalization based on element type
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

        // Move cursor to the end of the text
        const newRange = document.createRange();
        newRange.selectNodeContents(container);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        setShowSuggestions(false);
        console.log(`Autocompleted with suggestion: ${suggestions[0]}`);
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
    let currentScene: Scene | null = null;
    let currentCharacter: string | null = null;
    let lineNum = 1;
    const lastCharacterLines: string[] = [];

    const elements = Array.from(editorRef.current.children) as HTMLElement[];

    for (const element of elements) {
      const elementType = getElementType(element);
      if (!elementType) {
        console.warn('Unknown element type:', element);
        continue; // Skip unknown elements
      }

      let text = element.textContent?.trim() ?? '';

      // Adjust text based on formatting for JSON storage
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
        // Parentheticals are handled separately
        default:
          break;
      }

      // Remove parentheses for parentheticals
      if (elementType === 'parenthetical') {
        text = text.replace(/^\(|\)$/g, '');
      }

      const newEntry: LineEntry = { line_number: lineNum++, text };

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
          // Start a new scene after transition
          currentScene = null;
          break;
        case 'character':
          currentCharacter = text;
          lastCharacterLines.push(text);
          // Add character if not already present
          if (!screenplayData.characters.find((c) => c.name === text)) {
            screenplayData.characters.push({ name: text, dialogue: [] });
          }
          break;
        case 'dialogue':
          if (currentCharacter && currentScene) {
            const dialogueEntry: DialogueEntry = {
              character: currentCharacter,
              line: newEntry,
            };
            currentScene.dialogues.push(dialogueEntry);

            // Add to character's dialogue
            const character = screenplayData.characters.find(
              (c) => c.name === currentCharacter
            );
            if (character) {
              character.dialogue.push(newEntry);
            }
          }
          break;
        case 'parenthetical':
          if (currentCharacter && currentScene) {
            const parentheticalEntry: ParentheticalEntry = {
              character: currentCharacter,
              line: newEntry,
            };
            currentScene.parentheticals.push(parentheticalEntry);
          }
          break;
        default:
          break;
      }
    }

    setScreenplay(screenplayData);
    setLastCharacters(lastCharacterLines);

    // Update the current project
    setProjects((prevProjects) => {
      const updatedProjects = prevProjects.map((project) => {
        if (project.id === currentProjectId) {
          return { ...project, screenplay: screenplayData };
        }
        return project;
      });
      // Save to local storage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      console.log('Updated projects in local storage:', updatedProjects);
      return updatedProjects;
    });
    console.log('Updated screenplay data:', screenplayData);
  }, [currentProjectId]);

  // Function to reconstruct editor content from screenplay data
  const reconstructEditorContent = useCallback((data: Screenplay) => {
    if (!editorRef.current) return;

    editorRef.current.innerHTML = ''; // Clear existing content

    // Collect all lines with their line_number
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
      scene.screen_actions.forEach((action) => {
        allLines.push({
          line_number: action.line_number,
          elementType: 'action',
          text: action.text,
        });
      });
      scene.shots.forEach((shot) => {
        allLines.push({
          line_number: shot.line_number,
          elementType: 'shot',
          text: shot.text,
        });
      });
      scene.notes.forEach((note) => {
        allLines.push({
          line_number: note.line_number,
          elementType: 'note',
          text: note.text,
        });
      });
      scene.dialogues.forEach((dialogue) => {
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
      scene.parentheticals.forEach((parenthetical) => {
        allLines.push({
          line_number: parenthetical.line.line_number,
          elementType: 'parenthetical',
          text: parenthetical.line.text,
        });
      });
      scene.transitions.forEach((transition) => {
        allLines.push({
          line_number: transition.line_number,
          elementType: 'transition',
          text: transition.text,
        });
      });
    });

    // Sort allLines by line_number
    allLines.sort((a, b) => a.line_number - b.line_number);

    // Render lines in sorted order
    allLines.forEach((line) => {
      createNewLine(line.elementType, line.text);
    });

    console.log('Reconstructed editor content from screenplay data.');
  }, []);

  // Function to copy formatted text to clipboard
  const copyToClipboard = () => {
    if (!editorRef.current) return;

    let formattedText = '';
    let lastElementType = '';

    Array.from(editorRef.current.children).forEach((element) => {
      const elementType = getElementType(element as HTMLElement);
      if (!elementType) {
        console.warn('Unknown element type during copy:', element);
        return;
      }

      const text = element.textContent?.trim() ?? '';

      switch (elementType) {
        case 'scene-heading':
          formattedText +=
            (lastElementType ? '\n\n' : '') + text.toUpperCase() + '\n';
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
          formattedText +=
            (lastElementType ? '\n' : '') + text.toUpperCase() + '\n\n';
          break;
        case 'shot':
          formattedText += (lastElementType ? '\n' : '') + text.toUpperCase() + '\n';
          break;
        case 'note':
          formattedText += (lastElementType ? '\n' : '') + text + '\n';
          break;
        default:
          break;
      }
      lastElementType = elementType;
    });

    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        alert('Screenplay copied to clipboard!');
        console.log('Copied screenplay to clipboard.');
      })
      .catch(() => {
        alert('Failed to copy screenplay.');
        console.error('Failed to copy screenplay to clipboard.');
      });
  };

  // Function to create a new project
  const createNewProject = useCallback(() => {
    const newProjectId = Date.now().toString();
    const newProject: Project = {
      id: newProjectId,
      name: `Project ${projects.length + 1}`,
      screenplay: {
        scenes: [],
        characters: [],
      },
    };
    setProjects((prevProjects) => {
      const updatedProjects = [...prevProjects, newProject];
      // Save to local storage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      console.log('Created new project:', newProject);
      return updatedProjects;
    });
    setCurrentProjectId(newProjectId);
    setScreenplay(newProject.screenplay);
    // Clear editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    // Initialize with a scene heading
    createNewLine('scene-heading', 'FADE IN:');
  }, [projects.length]);

  // Function to select a project
  const selectProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      setScreenplay(project.screenplay);
      reconstructEditorContent(project.screenplay);
      console.log('Switched to project:', project);
    } else {
      console.error('Project not found:', projectId);
    }
  };

  // Function to save JSON to local storage manually
  const saveJSONToLocalStorage = () => {
    updateJSONStructure();
    alert('Screenplay JSON structure saved to local storage.');
    console.log('Screenplay JSON structure saved to local storage.');
  };

  // Function to handle project name edit initiation
  const handleEditProjectName = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditedProjectName(currentName);
  };

  // Function to handle project name save
  const handleSaveProjectName = (projectId: string) => {
    // Prevent empty project names
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
      // Save to local storage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      console.log(
        `Updated project name for project ${projectId} to ${editedProjectName}`
      );
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
            // Set the first project as the current project
            setCurrentProjectId(firstProject.id);
            setScreenplay(firstProject.screenplay);
            reconstructEditorContent(firstProject.screenplay);
            console.log('Loaded projects from local storage:', projectsData);
          } else {
            console.error('First project is undefined');
            createNewProject();
          }
        } else {
          console.log('No projects found in saved data');
          createNewProject();
        }
      } catch (error) {
        console.error('Failed to parse projects from local storage:', error);
        // If parsing fails, create a new project
        createNewProject();
      }
    } else {
      // No projects, create a new one
      createNewProject();
    }
  }, [createNewProject, reconstructEditorContent]);

  // Auto-save JSON structure every minute
  useEffect(() => {
    const interval = setInterval(() => {
      updateJSONStructure();
    }, 60000); // 60000 ms = 1 minute
    return () => clearInterval(interval);
  }, [screenplay, currentProjectId, updateJSONStructure]);

  return (
    <div className="flex flex-row h-full">
      {/* Project List Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-2">
        <h2 className="text-xl font-bold mb-4">Projects</h2>
        <button
          className="w-full mb-2 px-2 py-1 bg-green-600 rounded hover:bg-green-700"
          onClick={createNewProject}
        >
          New Project
        </button>
        <ul>
          {projects.map((project) => (
            <li
              key={project.id}
              className="mb-2 flex items-center justify-between"
            >
              {editingProjectId === project.id ? (
                <>
                  <input
                    type="text"
                    value={editedProjectName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditedProjectName(e.target.value)
                    }
                    className="w-full px-2 py-1 text-black rounded"
                  />
                  <button
                    onClick={() => handleSaveProjectName(project.id)}
                    className="ml-2 text-green-500 hover:text-green-700"
                    title="Save Project Name"
                  >
                    <FaCheck />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`w-full text-left ${
                      project.id === currentProjectId
                        ? 'font-bold underline'
                        : ''
                    }`}
                    onClick={() => selectProject(project.id)}
                  >
                    {project.name}
                  </button>
                  <button
                    onClick={() =>
                      handleEditProjectName(project.id, project.name)
                    }
                    className="ml-2 text-white hover:text-gray-300"
                    title="Edit Project Name"
                  >
                    <FaPencilAlt />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Editor Container */}
      <div className="flex flex-col flex-grow">
        {/* Toolbar */}
        <div className="flex items-center bg-gray-800 text-white p-2 space-x-2">
          {/* Formatting Buttons */}
          <button
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
            onClick={() => applyFormatting('scene-heading')}
            title="Scene Heading (Alt + 1)"
          >
            Scene Heading
          </button>
          <button
            className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-700"
            onClick={() => applyFormatting('action')}
            title="Action (Alt + 2)"
          >
            Action
          </button>
          <button
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
            onClick={() => applyFormatting('character')}
            title="Character (Alt + 3)"
          >
            Character
          </button>
          <button
            className="px-3 py-1 bg-pink-600 rounded hover:bg-pink-700"
            onClick={() => applyFormatting('parenthetical')}
            title="Parenthetical (Alt + 4)"
          >
            Parenthetical
          </button>
          <button
            className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
            onClick={() => applyFormatting('dialogue')}
            title="Dialogue (Alt + 5)"
          >
            Dialogue
          </button>
          <button
            className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700"
            onClick={() => applyFormatting('transition')}
            title="Transition (Alt + 6)"
          >
            Transition
          </button>
          <button
            className="px-3 py-1 bg-orange-600 rounded hover:bg-orange-700"
            onClick={() => applyFormatting('shot')}
            title="Shot (Alt + 7)"
          >
            Shot
          </button>
          <button
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
            onClick={() => applyFormatting('note')}
            title="Note (Alt + 8)"
          >
            Note
          </button>

          {/* Spacer */}
          <div className="flex-grow"></div>

          {/* Save and Copy Buttons */}
          <button
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
            onClick={saveJSONToLocalStorage}
          >
            Save JSON
          </button>
          <button
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
            onClick={copyToClipboard}
          >
            Copy to Clipboard
          </button>
        </div>

        {/* Editor Area */}
        <div className="relative flex-grow">
          <div
            ref={editorRef}
            contentEditable
            aria-label="Screenplay Editor"
            className="absolute inset-0 p-5 overflow-y-auto font-mono text-lg outline-none"
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            suppressContentEditableWarning={true}
          ></div>
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute bg-white border border-gray-300 shadow-lg z-10">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    // Handle suggestion click
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0) return;

                    const range = selection.getRangeAt(0);
                    let container = range.startContainer as HTMLElement | null;

                    // If the selection is a text node, get its parent element
                    if (
                      container &&
                      container.nodeType === Node.TEXT_NODE
                    ) {
                      container = container.parentElement;
                    }

                    // Traverse up to find a container that is a child of editorRef.current
                    while (
                      container?.parentElement &&
                      container.parentElement !== editorRef.current
                    ) {
                      container = container.parentElement;
                    }

                    if (
                      container &&
                      container.parentElement === editorRef.current
                    ) {
                      container.textContent = suggestion;
                      // Apply capitalization based on element type
                      const elementType = getElementType(container);
                      if (elementType && elementType !== 'parenthetical') {
                        if (
                          elementType === 'character' ||
                          elementType === 'transition'
                        ) {
                          container.textContent =
                            container.textContent.toUpperCase();
                        } else {
                          container.textContent = capitalizeFirstLetter(
                            container.textContent ?? ''
                          );
                        }
                      } else if (elementType === 'parenthetical') {
                        container.textContent = '(' + (suggestion ?? '') + ')';
                      }

                      // Move cursor to the end of the text
                      const newRange = document.createRange();
                      newRange.selectNodeContents(container);
                      newRange.collapse(false);
                      selection.removeAllRanges();
                      selection.addRange(newRange);
                      setShowSuggestions(false);
                      console.log(`Selected suggestion: ${suggestion}`);
                    }
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;