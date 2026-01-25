import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';
import { addLog } from '../logsStore.js';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Dates must be YYYY-MM-DD' });
const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { message: 'Times must be 24-hour HH:MM' });

const createOperationSchema = z
  .object({
    action: z.literal('create'),
    title: z.string().min(1),
    date: dateSchema,
    time: timeSchema,
    type: z.string().optional(),
  })
  .describe('Create a new calendar event');

const updateOperationSchema = z
  .object({
    action: z.literal('update'),
    id: z.number().int().positive(),
    title: z.string().min(1).optional(),
    date: dateSchema.optional(),
    time: timeSchema.optional(),
    type: z.string().optional(),
  })
  .refine((data) => data.title || data.date || data.time || data.type, {
    message: 'Update requires at least one field to change',
  })
  .describe('Update an existing calendar event');

const deleteOperationSchema = z
  .object({
    action: z.literal('delete'),
    id: z.number().int().positive(),
  })
  .describe('Delete an existing calendar event');

const operationsSchema = z
  .discriminatedUnion('action', [
    createOperationSchema,
    updateOperationSchema,
    deleteOperationSchema,
  ])
  .describe('Calendar adjustment to apply');

const planSchema = z.object({
  summary: z.string().describe('Why the changes were proposed'),
  operations: z
    .array(operationsSchema)
    .max(10, { message: 'Limit suggestions to 10 at a time' })
    .describe('Set of changes to apply to the calendar'),
});

const parser = StructuredOutputParser.fromZodSchema(planSchema);

const prompt = ChatPromptTemplate.fromTemplate(`You help maintain a calendar.
You must return structured JSON that respects the format instructions.

Keep existing event IDs when modifying or deleting events.
Use 24-hour time format. Dates are YYYY-MM-DD.

User request:
{userPrompt}

Existing events JSON:
{events}

{format_instructions}`);

const serverMode = process.env.SERVER_MODE || 'default';
const numGpu = Number.parseInt(process.env.OLLAMA_NUM_GPU || '1', 10);
const useCuda = serverMode === 'cuda' && Number.isFinite(numGpu) && numGpu > 0;

const model = new ChatOllama({
  model: process.env.OLLAMA_MODEL || 'gemma3:1b',
  temperature: 0.3,
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ...(useCuda ? { numGpu } : {}),
});

const rawChain = prompt.pipe(model);

const fixerPrompt = ChatPromptTemplate.fromTemplate(`The following response did not match the required JSON schema.
Fix it to match the format instructions.
Return only valid JSON.

Format instructions:
{format_instructions}

Invalid response:
{bad_output}`);

const fixerChain = fixerPrompt.pipe(model);

const extractContent = (response) => {
  if (typeof response === 'string') {
    return response;
  }
  if (response?.content) {
    return response.content;
  }
  return JSON.stringify(response);
};

export const planCalendarEdits = async ({ prompt: userPrompt, events }) => {
  const eventsJson = JSON.stringify(events, null, 2);
  const formatInstructions = parser.getFormatInstructions();

  addLog({
    source: 'ai',
    level: 'info',
    message: 'AI request payload',
    detail: {
      prompt: userPrompt,
      events: eventsJson,
      formatInstructions,
    },
  });

  const rawResponse = await rawChain.invoke({
    userPrompt,
    events: eventsJson,
    format_instructions: formatInstructions,
  });

  const rawText = extractContent(rawResponse);

  addLog({
    source: 'ai',
    level: 'info',
    message: 'AI raw response',
    detail: rawText,
  });

  try {
    return await parser.parse(rawText);
  } catch (error) {
    addLog({
      source: 'ai',
      level: 'warn',
      message: 'AI response failed schema validation',
      detail: rawText,
    });

    const fixedResponse = await fixerChain.invoke({
      format_instructions: formatInstructions,
      bad_output: rawText,
    });

    const fixedText = extractContent(fixedResponse);

    addLog({
      source: 'ai',
      level: 'info',
      message: 'AI corrected response',
      detail: fixedText,
    });

    try {
      return await parser.parse(fixedText);
    } catch (fixError) {
      const finalError = new Error('AI response could not be parsed');
      finalError.name = 'AiParseError';
      finalError.cause = fixError;
      throw finalError;
    }
  }
};
