/**
 * One-shot trace test — runs a single query through the router,
 * flushes spans, then exits cleanly.
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { setDefaultOpenAIClient, Runner } from '@openai/agents';
import { routerAgent } from './agents.js';
import { initTracing, flushTracing } from './tracing.js';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});
setDefaultOpenAIClient(client);
initTracing();

const runner = new Runner();
const result = await runner.run(routerAgent, 'what is 9 * 8?');
console.log('\nFinal Output:', result.finalOutput, '\n');

await flushTracing();
