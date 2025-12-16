import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';

const operationsSchema = z
  .object({
    action: z.enum(['create', 'update', 'delete']),
    id: z.number().optional(),
    title: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    type: z.string().optional(),
  })
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

const model = new ChatOllama({
  model: 'meta-llama/Llama-3.2-1B-Instruct:novita',
  temperature: 0.3,
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

const chain = prompt.pipe(model).pipe(parser);

export const planCalendarEdits = async ({ prompt: userPrompt, events }) => {
  const eventsJson = JSON.stringify(events, null, 2);

  return chain.invoke({
    userPrompt,
    events: eventsJson,
    format_instructions: parser.getFormatInstructions(),
  });
};
