import 'dotenv/config';
import OpenAI from 'openai';
import { setDefaultOpenAIClient, Runner } from '@openai/agents';
import * as readline from 'readline';
import { routerAgent } from './agents.js';
import { initTracing, flushTracing } from './tracing.js';

// Configure Groq as the OpenAI-compatible backend
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});
setDefaultOpenAIClient(client);

// Initialise tracing (controlled by TRACING env var: "console" | "off")
initTracing();

const runner = new Runner();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

console.log('Multi-Agent CLI Assistant');
console.log('Type your message and press Enter. Type "exit" to quit.\n');

while (true) {
  const input = await ask('You: ');

  if (input.trim().toLowerCase() === 'exit') {
    console.log('Goodbye.');
    await flushTracing();
    rl.close();
    break;
  }

  if (!input.trim()) continue;

  try {
    const result = await runner.run(routerAgent, input);
    console.log(`\nAssistant: ${result.finalOutput}\n`);
  } catch (err) {
    // Guardrail tripwire surfaces as an error with a specific name
    if (err.name === 'InputGuardrailTripwireTriggered') {
      console.log('\nAssistant: I can only assist with work-related topics.\n');
    } else {
      console.error(`Error: ${err.message}\n`);
    }
  }
}
