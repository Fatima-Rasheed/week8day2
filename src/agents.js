import { Agent, handoff, guardrail } from '@openai/agents';
import { calculatorTool, wordCounterTool } from './tools.js';

// --- Input Guardrail ---
// Blocks messages that are clearly inappropriate or harmful before routing.
const safetyGuardrail = guardrail({
  name: 'safety_check',
  description: 'Blocks inappropriate, offensive, or harmful user input.',
  execute: async ({ input }) => {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    const blocked = /(hate|kill|harm|abuse|nsfw|porn|illegal|drug|weapon)/i.test(text);
    if (blocked) {
      return {
        tripwireTriggered: true,
        outputInfo: 'Blocked: message contains inappropriate content.',
      };
    }
    return { tripwireTriggered: false };
  },
});

// --- Domain Agents ---

export const mathAgent = new Agent({
  name: 'MathAgent',
  instructions: `You are a math expert. Solve math problems step by step.
Always use the calculator tool to compute numeric expressions — never compute mentally.
Present results clearly.`,
  model: 'llama-3.1-8b-instant',
  tools: [calculatorTool],
});

export const programmingAgent = new Agent({
  name: 'ProgrammingAgent',
  instructions: `You are a programming expert. Help with code questions, debugging, algorithms, and explanations.
Use the word_counter tool when asked to analyze text or code length.
Be concise and include code examples when helpful.`,
  model: 'llama-3.1-8b-instant',
  tools: [wordCounterTool],
});

export const generalAgent = new Agent({
  name: 'GeneralAgent',
  instructions: `You are a helpful general-purpose assistant. Answer questions on any topic clearly and concisely.`,
  model: 'llama-3.1-8b-instant',
});

// --- Router Agent ---

export const routerAgent = new Agent({
  name: 'RouterAgent',
  instructions: `You are a routing agent. Your ONLY job is to hand off the user's message to the correct agent.
Do NOT answer the question yourself. Always hand off.

Rules:
- If the message involves math, numbers, or calculations → hand off to MathAgent
- If the message involves programming, code, algorithms, or debugging → hand off to ProgrammingAgent
- For everything else → hand off to GeneralAgent
- If the message is inappropriate, offensive, or non-work-related (e.g. personal drama, harmful content) → respond with: "I can only assist with work-related topics."

Always hand off. Never answer directly.`,
  model: 'llama-3.1-8b-instant',
  handoffs: [
    handoff(mathAgent),
    handoff(programmingAgent),
    handoff(generalAgent),
  ],
  inputGuardrails: [safetyGuardrail],
});
