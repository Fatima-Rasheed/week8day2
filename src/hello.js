import 'dotenv/config';
import OpenAI from 'openai';
import { Agent, Runner, setDefaultOpenAIClient } from '@openai/agents';

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
});
setDefaultOpenAIClient(client);

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant.',
  model: 'llama-3.1-8b-instant',
});

const runner = new Runner();
const result = await runner.run(agent, 'Hello! Who are you?');
console.log('Final Output:', result.finalOutput);