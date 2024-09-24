// /api/ai-rewrite-scene/route.ts

/* ------------------------------------------------------------------
   AI Scene Rewrite API with Selective Editing Modes
   ------------------------------------------------------------------
   POST body: { scene, rewrite_prompt, rewrite_mode }
   Response : { original_scene, rewritten_scene }
------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const maxDuration = 90;

/* ------------------------------------------------------------------
   SCHEMAS
------------------------------------------------------------------ */

const LineSchema = z.object({
  line_number: z.number(),
  text: z.string(),
});

const DialogueSchema = z.object({
  character: z.string(),
  line: LineSchema,
});

const ParentheticalSchema = z.object({
  character: z.string(),
  line: LineSchema,
});

const SceneSchema = z.object({
  heading: LineSchema.nullable(),
  screen_actions: z.array(LineSchema),
  notes: z.array(LineSchema),
  shots: z.array(LineSchema),
  transitions: z.array(LineSchema),
  dialogues: z.array(DialogueSchema),
  parentheticals: z.array(ParentheticalSchema),
});

const RewriteRequestSchema = z.object({
  scene: SceneSchema,
  rewrite_prompt: z.string(),
  rewrite_mode: z.enum(['dialogue_only', 'everything_except_dialogue']),
});

const RewriteResponseSchema = z.object({
  original_scene: SceneSchema,
  rewritten_scene: SceneSchema,
});

type RewriteRequest = z.infer<typeof RewriteRequestSchema>;
type RewriteResponse = z.infer<typeof RewriteResponseSchema>;

/* ------------------------------------------------------------------
   SYSTEM PROMPTS
------------------------------------------------------------------ */

const DIALOGUE_ONLY_PROMPT = `
You are an expert screenplay dialogue rewriter. Your job is to rewrite ONLY the dialogue and parentheticals in a scene while keeping everything else exactly the same.

STRICT RULES:
- ONLY modify dialogue text and parenthetical text
- NEVER change scene headings, action lines, shots, notes, or transitions
- NEVER add or remove dialogue lines - keep the exact same number
- NEVER change character names
- NEVER change line numbers
- Keep the same characters speaking in the same order
- Maintain the dramatic intent and story progression
- Apply the rewrite instructions only to the spoken words and parentheticals

WHAT YOU CAN CHANGE:
- The text content of dialogue lines
- The text content of parenthetical directions
- The style, tone, and word choice of what characters say

WHAT YOU MUST KEEP UNCHANGED:
- Scene heading
- All action/description lines
- All shot directions
- All notes
- All transitions
- Character names
- The order and number of dialogue exchanges
- Line numbers

INPUT FORMAT:
You'll receive a scene and specific dialogue rewrite instructions.

OUTPUT FORMAT:
Return both original_scene (unchanged) and rewritten_scene (with only dialogue modified).
`.trim();

const EVERYTHING_EXCEPT_DIALOGUE_PROMPT = `
You are an expert screenplay scene rewriter. Your job is to rewrite everything in a scene EXCEPT the dialogue and character names.

STRICT RULES:
- NEVER modify dialogue text or character names
- NEVER change which characters are speaking or when they speak
- NEVER add or remove dialogue lines
- You CAN modify: scene headings, action lines, shots, notes, transitions, parentheticals
- You CAN add, remove, or modify non-dialogue elements as needed
- Maintain the core dramatic beats and character interactions
- Keep the story progression logical and coherent

WHAT YOU CAN CHANGE:
- Scene heading (location, time of day, etc.)
- Action/description lines
- Shot directions
- Notes
- Transitions
- Parenthetical directions (the instructions, not who speaks)
- The setting, atmosphere, and visual elements

WHAT YOU MUST KEEP UNCHANGED:
- Character names
- Dialogue text (the actual words characters speak)
- The order of who speaks when
- The number of dialogue exchanges

INPUT FORMAT:
You'll receive a scene and specific rewrite instructions for everything except dialogue.

OUTPUT FORMAT:
Return both original_scene (unchanged) and rewritten_scene (with everything except dialogue modified).
`.trim();

/* ------------------------------------------------------------------
   HELPER FUNCTIONS
------------------------------------------------------------------ */

function validateRewriteRequest(data: any): data is RewriteRequest {
  try {
    RewriteRequestSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
   ROUTE HANDLER
------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    
    if (!validateRewriteRequest(body)) {
      return NextResponse.json(
        { error: "Request body must include scene object, rewrite_prompt, and rewrite_mode." },
        { status: 400 },
      );
    }

    const { scene, rewrite_prompt, rewrite_mode } = body;
    
    // Check if we have meaningful content
    if (!rewrite_prompt.trim()) {
      return NextResponse.json(
        { error: "Must provide rewrite prompt." },
        { status: 400 },
      );
    }

    console.log(`[ai-rewrite-scene] Rewriting scene - Mode: ${rewrite_mode}`);
    console.log(`[ai-rewrite-scene] Prompt: ${rewrite_prompt}`);
    
    const sceneStats = {
      heading: !!scene.heading,
      actions: scene.screen_actions.length,
      dialogues: scene.dialogues.length,
      parentheticals: scene.parentheticals.length,
      notes: scene.notes.length,
      shots: scene.shots.length,
      transitions: scene.transitions.length
    };
    console.log(`[ai-rewrite-scene] Original scene elements:`, sceneStats);

    // Select appropriate system prompt based on mode
    const systemPrompt = rewrite_mode === 'dialogue_only' 
      ? DIALOGUE_ONLY_PROMPT 
      : EVERYTHING_EXCEPT_DIALOGUE_PROMPT;

    // Convert scene to readable format for AI
    const sceneDescription = formatSceneForAI(scene);

    // Create mode-specific user prompt
    const modeDescription = rewrite_mode === 'dialogue_only'
      ? "DIALOGUE REWRITE MODE: Only modify what the characters say and parenthetical directions. Keep everything else exactly the same."
      : "SCENE REWRITE MODE: Modify everything except dialogue and character names. You can change settings, actions, shots, etc.";

    /* —— Call OpenAI Responses API ——————————————— */
    const resp = await openai.responses.parse({
      model: "gpt-4o",
      temperature: 0.8,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "assistant",
          content:
            "Here is the schema you must obey:\n" +
            "```json\n" +
            RewriteResponseSchema.toString() +
            "\n```",
        },
        {
          role: "user",
          content:
            `${modeDescription}\n\n` +
            `ORIGINAL SCENE:\n${sceneDescription}\n\n` +
            `REWRITE INSTRUCTIONS:\n${rewrite_prompt}\n\n` +
            `Please rewrite this scene according to the instructions and mode restrictions. Return both the original scene and the rewritten scene in the specified JSON format.`,
        },
      ],
      text: {
        format: zodTextFormat(
          RewriteResponseSchema,
          "scene_rewrite",
        ),
      },
    });

    if (!resp.output_parsed) {
      return NextResponse.json(
        { error: "AI did not return valid schema-conformant JSON." },
        { status: 502 },
      );
    }

    const result = resp.output_parsed as RewriteResponse;
    
    // Validate the rewrite based on mode
    const validationError = validateRewriteMode(scene, result.rewritten_scene, rewrite_mode);
    if (validationError) {
      console.error(`[ai-rewrite-scene] Validation error: ${validationError}`);
      return NextResponse.json(
        { error: `AI rewrite validation failed: ${validationError}` },
        { status: 502 },
      );
    }
    
    const rewrittenStats = {
      heading: !!result.rewritten_scene.heading,
      actions: result.rewritten_scene.screen_actions.length,
      dialogues: result.rewritten_scene.dialogues.length,
      parentheticals: result.rewritten_scene.parentheticals.length,
      notes: result.rewritten_scene.notes.length,
      shots: result.rewritten_scene.shots.length,
      transitions: result.rewritten_scene.transitions.length
    };
    console.log(`[ai-rewrite-scene] Rewritten scene elements:`, rewrittenStats);
    
    return NextResponse.json(result);
  } catch (err) {
    console.error("ai-rewrite-scene route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------
   VALIDATION FUNCTIONS
------------------------------------------------------------------ */

function validateRewriteMode(original: any, rewritten: any, mode: string): string | null {
  if (mode === 'dialogue_only') {
    // Check that non-dialogue elements are unchanged
    if (JSON.stringify(original.screen_actions) !== JSON.stringify(rewritten.screen_actions)) {
      return "Action lines were modified in dialogue-only mode";
    }
    if (JSON.stringify(original.shots) !== JSON.stringify(rewritten.shots)) {
      return "Shots were modified in dialogue-only mode";
    }
    if (JSON.stringify(original.notes) !== JSON.stringify(rewritten.notes)) {
      return "Notes were modified in dialogue-only mode";
    }
    if (JSON.stringify(original.transitions) !== JSON.stringify(rewritten.transitions)) {
      return "Transitions were modified in dialogue-only mode";
    }
    if (JSON.stringify(original.heading) !== JSON.stringify(rewritten.heading)) {
      return "Scene heading was modified in dialogue-only mode";
    }
    
    // Check that dialogue structure is preserved
    if (original.dialogues.length !== rewritten.dialogues.length) {
      return "Number of dialogue lines changed in dialogue-only mode";
    }
    
    for (let i = 0; i < original.dialogues.length; i++) {
      if (original.dialogues[i].character !== rewritten.dialogues[i].character) {
        return "Character names were changed in dialogue-only mode";
      }
      if (original.dialogues[i].line.line_number !== rewritten.dialogues[i].line.line_number) {
        return "Line numbers were changed in dialogue-only mode";
      }
    }
  } else if (mode === 'everything_except_dialogue') {
    // Check that dialogue content is unchanged
    if (original.dialogues.length !== rewritten.dialogues.length) {
      return "Number of dialogue lines changed in everything-except-dialogue mode";
    }
    
    for (let i = 0; i < original.dialogues.length; i++) {
      if (original.dialogues[i].character !== rewritten.dialogues[i].character) {
        return "Character names were changed in everything-except-dialogue mode";
      }
      if (original.dialogues[i].line.text !== rewritten.dialogues[i].line.text) {
        return "Dialogue text was changed in everything-except-dialogue mode";
      }
    }
  }
  
  return null;
}

/* ------------------------------------------------------------------
   HELPER FUNCTION TO FORMAT SCENE FOR AI
------------------------------------------------------------------ */

function formatSceneForAI(scene: any): string {
  let formatted = "";
  
  // Collect all elements with line numbers
  const allElements: Array<{
    line_number: number;
    type: string;
    content: string;
  }> = [];

  // Add scene heading
  if (scene.heading) {
    allElements.push({
      line_number: scene.heading.line_number,
      type: "SCENE HEADING",
      content: scene.heading.text
    });
  }

  // Add all other elements
  scene.screen_actions.forEach((action: any) => {
    allElements.push({
      line_number: action.line_number,
      type: "ACTION",
      content: action.text
    });
  });

  scene.shots.forEach((shot: any) => {
    allElements.push({
      line_number: shot.line_number,
      type: "SHOT",
      content: shot.text
    });
  });

  scene.notes.forEach((note: any) => {
    allElements.push({
      line_number: note.line_number,
      type: "NOTE",
      content: note.text
    });
  });

  scene.dialogues.forEach((dialogue: any) => {
    allElements.push({
      line_number: dialogue.line.line_number,
      type: "DIALOGUE",
      content: `${dialogue.character}: "${dialogue.line.text}"`
    });
  });

  scene.parentheticals.forEach((parenthetical: any) => {
    allElements.push({
      line_number: parenthetical.line.line_number,
      type: "PARENTHETICAL",
      content: `${parenthetical.character}: (${parenthetical.line.text})`
    });
  });

  scene.transitions.forEach((transition: any) => {
    allElements.push({
      line_number: transition.line_number,
      type: "TRANSITION",
      content: transition.text
    });
  });

  // Sort by line number
  allElements.sort((a, b) => a.line_number - b.line_number);

  // Format for display
  allElements.forEach(element => {
    formatted += `[${element.type}] ${element.content}\n`;
  });

  return formatted;
}