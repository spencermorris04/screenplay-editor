// /api/ai-rewrite-dialogue/route.ts

/* ------------------------------------------------------------------
   AI Dialogue Rewrite API
   ------------------------------------------------------------------
   POST body: { character_name, dialogue, rewrite_prompt }
   Response : { original_dialogue, rewritten_dialogue }
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

const DialogueLineSchema = z.object({
  line_number: z.number(),
  text: z.string(),
});

const RewriteRequestSchema = z.object({
  character_name: z.string(),
  dialogue: z.array(DialogueLineSchema),
  rewrite_prompt: z.string(),
});

const RewriteResponseSchema = z.object({
  original_dialogue: z.array(DialogueLineSchema),
  rewritten_dialogue: z.array(DialogueLineSchema),
});

type RewriteRequest = z.infer<typeof RewriteRequestSchema>;
type RewriteResponse = z.infer<typeof RewriteResponseSchema>;

/* ------------------------------------------------------------------
   SYSTEM PROMPT
------------------------------------------------------------------ */

const SYSTEM_PROMPT = `
You are an expert screenplay dialogue rewriter. Your job is to rewrite character dialogue according to specific instructions while maintaining the dramatic intent and character voice.

RULES:
- Keep the same number of dialogue lines
- Maintain the same line numbers as the original
- Preserve the overall meaning and dramatic beats
- Apply the rewrite instructions consistently across all dialogue
- Ensure the dialogue feels natural and character-appropriate
- Match the tone and style requested in the rewrite prompt

INPUT FORMAT:
You'll receive a character name, their dialogue lines, and specific rewrite instructions.

OUTPUT FORMAT:
Return *only* JSON matching the schema. The response must include both original_dialogue and rewritten_dialogue arrays, each containing objects with line_number and text fields.

IMPORTANT: 
- The rewritten dialogue should feel like it could realistically come from the same character
- Maintain screenplay formatting conventions
- Keep line numbers exactly the same as the original
- Apply the rewrite instructions thoughtfully, not mechanically
- Return valid JSON that matches the exact schema provided
`.trim();

/* ------------------------------------------------------------------
   HELPER FUNCTIONS
------------------------------------------------------------------ */

function validateRewriteRequest(data: any): data is RewriteRequest {
  return (
    data &&
    typeof data === "object" &&
    typeof data.character_name === "string" &&
    Array.isArray(data.dialogue) &&
    typeof data.rewrite_prompt === "string"
  );
}

function validateDialogueArray(dialogue: any[]): boolean {
  return dialogue.every(line => 
    line &&
    typeof line === "object" &&
    typeof line.line_number === "number" &&
    typeof line.text === "string"
  );
}

/* ------------------------------------------------------------------
   ROUTE HANDLER
------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    
    if (!validateRewriteRequest(body)) {
      return NextResponse.json(
        { error: "Request body must include character_name, dialogue array, and rewrite_prompt." },
        { status: 400 },
      );
    }

    const { character_name, dialogue, rewrite_prompt } = body;
    
    // Validate dialogue array structure
    if (!validateDialogueArray(dialogue)) {
      return NextResponse.json(
        { error: "Dialogue array must contain objects with line_number and text fields." },
        { status: 400 },
      );
    }
    
    // Check if we have meaningful content
    if (!dialogue.length || !rewrite_prompt.trim()) {
      return NextResponse.json(
        { error: "Must provide dialogue lines and rewrite prompt." },
        { status: 400 },
      );
    }

    console.log(`[ai-rewrite] Rewriting dialogue for character: ${character_name}`);
    console.log(`[ai-rewrite] Prompt: ${rewrite_prompt}`);
    console.log(`[ai-rewrite] Original lines: ${dialogue.length}`);

    /* —— Call OpenAI Responses API ——————————————— */
    const resp = await openai.responses.parse({
      model: "gpt-4o",
      temperature: 0.7, // Higher temperature for more creative rewriting
      input: [
        { role: "system", content: SYSTEM_PROMPT },
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
            `CHARACTER: ${character_name}\n\n` +
            `ORIGINAL DIALOGUE:\n${dialogue.map(line => `Line ${line.line_number}: "${line.text}"`).join('\n')}\n\n` +
            `REWRITE INSTRUCTIONS:\n${rewrite_prompt}\n\n` +
            `Please rewrite all the dialogue according to these instructions while maintaining the character's voice and the dramatic intent of each line. Return both the original dialogue and the rewritten dialogue in the specified JSON format.`,
        },
      ],
      text: {
        format: zodTextFormat(
          RewriteResponseSchema,   // runtime schema
          "dialogue_rewrite",
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
    
    // Ensure we have the same number of lines
    if (result.original_dialogue.length !== dialogue.length || 
        result.rewritten_dialogue.length !== dialogue.length) {
      console.error("[ai-rewrite] Line count mismatch");
      return NextResponse.json(
        { error: "AI response has incorrect number of dialogue lines." },
        { status: 502 },
      );
    }

    // Validate that line numbers match
    const originalLineNumbers = dialogue.map(d => d.line_number).sort((a, b) => a - b);
    const rewrittenLineNumbers = result.rewritten_dialogue.map(d => d.line_number).sort((a, b) => a - b);
    
    if (JSON.stringify(originalLineNumbers) !== JSON.stringify(rewrittenLineNumbers)) {
      console.error("[ai-rewrite] Line number mismatch");
      return NextResponse.json(
        { error: "AI response has incorrect line numbers." },
        { status: 502 },
      );
    }

    console.log(`[ai-rewrite] Successfully rewrote ${result.rewritten_dialogue.length} lines`);
    
    return NextResponse.json(result);
  } catch (err) {
    console.error("ai-rewrite-dialogue route error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}