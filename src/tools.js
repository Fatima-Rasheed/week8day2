import { tool } from '@openai/agents';
import { z } from 'zod';

export const calculatorTool = tool({
  name: 'calculator',
  description: 'Evaluates a basic math expression and returns the result. Use for arithmetic calculations.',
  parameters: z.object({
    expression: z.string().describe('A math expression to evaluate, e.g. "2 + 2" or "10 * (3 + 4)"'),
  }),
  execute: async ({ expression }) => {
    try {
      // Safe eval: only allow numbers and basic operators
      if (!/^[\d\s\+\-\*\/\.\(\)%]+$/.test(expression)) {
        return 'Error: invalid expression. Only numbers and + - * / ( ) % are allowed.';
      }
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch {
      return 'Error: could not evaluate expression.';
    }
  },
});

export const wordCounterTool = tool({
  name: 'word_counter',
  description: 'Counts the number of words, characters, and sentences in a given text.',
  parameters: z.object({
    text: z.string().describe('The text to analyze'),
  }),
  execute: async ({ text }) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    return `Words: ${words}, Characters: ${chars}, Sentences: ${sentences}`;
  },
});
