// utils.ts
import { ElementType, Screenplay, DialogueWithContext, Scene, LineEntry } from './types';

export const getElementType = (element: HTMLElement): ElementType | null => {
  const types: ElementType[] = [
    'scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'shot', 'note',
  ];
  for (const type of types) {
    if (element.classList.contains(type)) {
      return type;
    }
  }
  return null;
};

export const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const createNewLine = (
  editorRef: React.RefObject<HTMLDivElement>,
  type: ElementType,
  content: string = '',
  referenceNode?: HTMLElement
) => {
  if (!editorRef.current) return;

  const newDiv = document.createElement('div');
  newDiv.className = type;
  
  if (type !== 'parenthetical') {
    newDiv.textContent = capitalizeFirstLetter(content);
  } else {
    newDiv.textContent = content ? `(${content})` : '()';
  }
  
  newDiv.style.minHeight = '1.5em';
  newDiv.style.marginBottom = '0.25rem';
  newDiv.style.padding = '0.5rem';
  newDiv.style.borderRadius = '0.375rem';
  newDiv.style.transition = 'all 0.2s ease-in-out';

  // Apply specific styles based on type
  const styleClasses = {
    'scene-heading': ['ml-[5%]', 'mr-[5%]', 'font-bold', 'uppercase', 'bg-gradient-to-r', 'from-green-100', 'to-green-200', 'border-l-4', 'border-green-500', 'text-green-900'],
    'action': ['ml-[5%]', 'mr-[5%]', 'bg-gradient-to-r', 'from-blue-50', 'to-blue-100', 'border-l-4', 'border-blue-400', 'text-blue-900'],
    'character': ['mx-auto', 'w-fit', 'uppercase', 'font-semibold', 'bg-gradient-to-r', 'from-purple-100', 'to-purple-200', 'border-l-4', 'border-purple-500', 'text-purple-900', 'text-center'],
    'parenthetical': ['ml-[25%]', 'mr-[25%]', 'bg-gradient-to-r', 'from-pink-50', 'to-pink-100', 'border-l-4', 'border-pink-400', 'text-pink-800', 'italic'],
    'dialogue': ['ml-[20%]', 'mr-[20%]', 'bg-gradient-to-r', 'from-slate-50', 'to-slate-100', 'border-l-4', 'border-slate-400', 'text-slate-800'],
    'transition': ['ml-[60%]', 'mr-[5%]', 'text-right', 'uppercase', 'font-semibold', 'bg-gradient-to-r', 'from-amber-100', 'to-amber-200', 'border-l-4', 'border-amber-500', 'text-amber-900'],
    'shot': ['ml-[5%]', 'mr-[5%]', 'uppercase', 'font-medium', 'bg-gradient-to-r', 'from-orange-100', 'to-orange-200', 'border-l-4', 'border-orange-500', 'text-orange-900'],
    'note': ['ml-[5%]', 'mr-[5%]', 'italic', 'bg-gradient-to-r', 'from-gray-100', 'to-gray-200', 'border-l-4', 'border-gray-400', 'text-gray-700']
  };

  newDiv.classList.add(...(styleClasses[type] || []));

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
};

export const getCharacterActions = (screenplay: Screenplay, characterName: string): LineEntry[] => {
  const actions: LineEntry[] = [];
  screenplay.scenes.forEach(scene => {
    scene.screen_actions.forEach(action => {
      if (action.text.toLowerCase().includes(characterName.toLowerCase())) {
        actions.push(action);
      }
    });
  });
  return actions;
};

export const getDialogueWithContext = (screenplay: Screenplay, characterName: string): DialogueWithContext[] => {
  const result: DialogueWithContext[] = [];
  
  // Create a flat list of all screenplay elements with their context
  const allElements: {
    type: ElementType;
    text: string;
    line_number: number;
    character?: string;
    sceneIndex: number;
  }[] = [];

  screenplay.scenes.forEach((scene, sceneIndex) => {
    // Add scene heading
    if (scene.heading) {
      allElements.push({
        type: 'scene-heading',
        text: scene.heading.text,
        line_number: scene.heading.line_number,
        sceneIndex
      });
    }

    // Create array of all scene elements
    const sceneElements: any[] = [
      ...scene.screen_actions.map(a => ({ ...a, type: 'action' })),
      ...scene.shots.map(s => ({ ...s, type: 'shot' })),
      ...scene.notes.map(n => ({ ...n, type: 'note' })),
      ...scene.dialogues.map(d => [
        { type: 'character', text: d.character, line_number: d.line.line_number, character: d.character },
        { type: 'dialogue', text: d.line.text, line_number: d.line.line_number, character: d.character }
      ]).flat(),
      ...scene.parentheticals.map(p => ({ 
        type: 'parenthetical', 
        text: p.line.text, 
        line_number: p.line.line_number, 
        character: p.character 
      })),
      ...scene.transitions.map(t => ({ ...t, type: 'transition' }))
    ];

    // Sort by line number and add to main array
    sceneElements.sort((a, b) => a.line_number - b.line_number);
    allElements.push(...sceneElements.map(el => ({ ...el, sceneIndex })));
  });

  // Sort all elements by line number
  allElements.sort((a, b) => a.line_number - b.line_number);

  // Find dialogue lines for the character and get context
  allElements.forEach((element, index) => {
    if (element.type === 'dialogue' && element.character === characterName) {
      const dialogue: LineEntry = {
        line_number: element.line_number,
        text: element.text
      };

      // Get context - look back up to 10 elements but be smart about it
      const contextElements: typeof allElements = [];
      let contextIndex = index - 1;
      let contextCount = 0;
      let foundExchange = false;

      // Look for dialogue exchange pattern
      while (contextIndex >= 0 && contextCount < 10) {
        const contextEl = allElements[contextIndex];
        
        // Add null/undefined check
        if (!contextEl) {
          contextIndex--;
          continue;
        }
        
        contextElements.unshift(contextEl);
        
        // If we hit another dialogue, check if it's part of an exchange
        if (contextEl.type === 'dialogue' || contextEl.type === 'character') {
          contextCount++;
          foundExchange = true;
        } else if (contextEl.type === 'action' || contextEl.type === 'scene-heading') {
          contextCount++;
          // If we've found an exchange and hit an action/scene break, stop
          if (foundExchange && contextCount > 3) {
            break;
          }
        }
        
        contextIndex--;
      }

      // Limit context to reasonable size but keep complete exchanges
      const context = contextElements.slice(-8).map(el => ({
        type: el.type,
        text: el.text,
        line_number: el.line_number,
        character: el.character
      }));

      result.push({ dialogue, context });
    }
  });

  return result;
};

export const loadDefaultProject = async (): Promise<Screenplay> => {
  try {
    const response = await fetch('/default_project.json');
    if (response.ok) {
      const data = await response.json();
      return data as Screenplay;
    }
  } catch (error) {
    console.log('Could not load default project, using fallback');
  }
  
  // Fallback default project
  return {
    scenes: [
      {
        heading: { line_number: 1, text: "FADE IN:" },
        screen_actions: [
          { line_number: 2, text: "A new screenplay begins..." }
        ],
        notes: [],
        shots: [],
        transitions: [],
        dialogues: [],
        parentheticals: []
      }
    ],
    characters: []
  };
};