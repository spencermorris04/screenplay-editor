// types.ts
export type ElementType =
  | 'scene-heading'
  | 'action'
  | 'dialogue'
  | 'parenthetical'
  | 'character'
  | 'transition'
  | 'shot'
  | 'note';

export interface LineEntry {
  line_number: number;
  text: string;
}

export interface DialogueEntry {
  character: string;
  line: LineEntry;
}

export interface ParentheticalEntry {
  character: string;
  line: LineEntry;
}

export interface Scene {
  heading: LineEntry | null;
  screen_actions: LineEntry[];
  notes: LineEntry[];
  shots: LineEntry[];
  transitions: LineEntry[];
  dialogues: DialogueEntry[];
  parentheticals: ParentheticalEntry[];
}

export interface Character {
  name: string;
  dialogue: LineEntry[];
}

export interface Screenplay {
  scenes: Scene[];
  characters: Character[];
}

export interface Project {
  id: string;
  name: string;
  screenplay: Screenplay;
}

export interface DialogueWithContext {
  dialogue: LineEntry;
  context: {
    type: ElementType;
    text: string;
    line_number: number;
    character?: string;
  }[];
}