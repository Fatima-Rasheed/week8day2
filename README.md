# Multi-Agent CLI Assistant

A CLI-based multi-agent system built with the [OpenAI Agents SDK](https://github.com/openai/openai-agents-js), powered by [Groq](https://groq.com) as an OpenAI-compatible backend.

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Edit `.env` in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Tracing: "console" to print spans, "off" to disable
TRACING=off
```

Get a free API key at [console.groq.com](https://console.groq.com).

### 3. Run the project

```bash
npm start
```

To run the one-shot trace test:

```bash
npm run test:trace
```

---

## How to Run

Once started, the CLI prompts for input continuously:

```
Multi-Agent CLI Assistant
Type your message and press Enter. Type "exit" to quit.

You: what is 12 * 15?
Assistant: 12 * 15 = 180

You: write a function to reverse a string in Python
Assistant: Here's a simple way to reverse a string in Python...

You: exit
Goodbye.
```

---

## Agent Roles

| Agent | Role |
|---|---|
| RouterAgent | Entry point. Reads the user message and hands off to the correct specialist. Never answers directly. |
| MathAgent | Handles math problems and numeric calculations. Uses the `calculator` tool. |
| ProgrammingAgent | Handles code questions, debugging, and algorithms. Uses the `word_counter` tool for text analysis. |
| GeneralAgent | Handles everything else — general knowledge and open-ended queries. |

### Routing Flow

```
User Input
    │
    ▼
[InputGuardrail] ── blocked ──▶ "I can only assist with work-related topics."
    │
    ▼
RouterAgent
    ├── math / numbers / calculations  ──▶  MathAgent  ──▶  calculator tool
    ├── code / programming / debugging ──▶  ProgrammingAgent ──▶ word_counter tool
    └── everything else                ──▶  GeneralAgent
                                                │
                                                ▼
                                          Final Output
```

---

## Tools

### `calculator`
- Used by: `MathAgent`
- Evaluates a math expression string (e.g. `"10 * (3 + 4)"`)
- Only allows numbers and `+ - * / ( ) %` — no arbitrary code execution
- Returns the expression and its numeric result

### `word_counter`
- Used by: `ProgrammingAgent`
- Accepts a block of text and returns word count, character count, and sentence count
- Useful for analyzing code snippets or text length

---

## Handoffs

Handoffs are a core SDK primitive. When `RouterAgent` decides which specialist to use, it calls a `handoff()` — this transfers full control of the conversation to the target agent, which then runs with its own instructions, model config, and tools.

```js
// agents.js
handoffs: [
  handoff(mathAgent),
  handoff(programmingAgent),
  handoff(generalAgent),
]
```

The runner resolves the full chain and returns `result.finalOutput` — the final response from whichever agent handled the request.

---

## Guardrails

An input guardrail (`safetyGuardrail`) is attached to `RouterAgent`. It runs before the agent processes any message and checks for inappropriate or harmful content using a keyword pattern. If triggered, it sets `tripwireTriggered: true`, which causes the SDK to throw an `InputGuardrailTripwireTriggered` error — caught in `index.js` and shown as a clean message to the user.

```js
// agents.js
const safetyGuardrail = guardrail({
  name: 'safety_check',
  execute: async ({ input }) => {
    const blocked = /(hate|kill|harm|...)/i.test(input);
    return { tripwireTriggered: blocked };
  },
});
```

---

## Tracing & Observability

Tracing is controlled by the `TRACING` environment variable:

- `TRACING=off` — tracing disabled (default, no overhead)
- `TRACING=console` — spans are printed to stdout on exit via `ConsoleSpanExporter`

To enable:

```env
TRACING=console
```

Then run `npm run test:trace` to see a full span dump for a single query.

### What tracing shows

Each span represents one unit of work in the agent execution:
- Which agent ran and when
- Which tool was called, with what arguments, and what it returned
- Which handoff occurred (from RouterAgent to which specialist)
- Total latency per step

### How it helps debug agent behavior

Without tracing, if the wrong agent handles a query or a tool returns an unexpected result, there's no visibility into why. With tracing enabled you can see the exact decision path: RouterAgent chose ProgrammingAgent, ProgrammingAgent called `word_counter` with these args, got this result, then produced this output. This makes it straightforward to catch routing mistakes, bad tool inputs, or unexpected model behavior.

### Observed during execution

When `TRACING=console` is set and `npm run test:trace` is run with the query `"what is 9 * 8?"`:
- A span is created for the RouterAgent run
- A child span shows the handoff to MathAgent
- Another child span shows the `calculator` tool call with `expression: "9 * 8"`
- The tool returns `"9 * 8 = 72"` and MathAgent produces the final output
- All spans flush on exit via `processor.forceFlush()`

---

## Notes

### What is Agentic AI?

**Single-prompt LLM usage** sends one message, gets one response, done. The developer controls all logic around it — what to ask, what to do with the answer, when to call tools.

**Agentic AI** flips this: the LLM is the reasoning engine that drives a multi-step workflow. It decides what to do next — call a tool, delegate to another agent, ask a clarifying question, or produce a final answer. The developer defines the agents, tools, and constraints; the model drives execution.

Key properties of agentic systems:
- Stateful across steps within a run
- Tool-using — the model calls real functions, not fake ones
- Goal-driven — the system works toward completing a task, not just answering a prompt
- Delegating — agents can hand off to specialists

Real-world examples:
- A POS assistant that looks up inventory, applies discounts, and processes payments
- A support bot that reads a ticket, queries a knowledge base, and escalates if unresolved
- A planner agent that breaks a project into tasks and assigns them to sub-agents

---

### OpenAI Agents SDK — Core Concepts

**Agent**
An LLM with a name, instructions (system prompt), model, and optional tools and handoffs. It's the basic unit of the system.

**Instructions**
The system prompt for the agent. Defines its role, constraints, and behavior. Example: "You are a math expert. Always use the calculator tool."

**Tool**
A typed, schema-validated function the agent can call. Defined with `tool()` using a Zod schema. The model decides when to call it based on the description. Agents must never fake tool results — the SDK enforces real execution.

**Handoff**
Transfers control from one agent to another. Used when a specialist is better suited for the task. The receiving agent runs with its own instructions and tools. Defined with `handoff(targetAgent)`.

**Guardrail**
Validates input or output before/after agent execution. Can block unsafe content, enforce format constraints, or modify messages. If `tripwireTriggered: true`, the SDK halts execution and throws.

**Runner**
The execution engine. Calls `runner.run(agent, input)` to start a run. Manages the loop: agent decides → tool call or handoff → next step → until final output. Supports sync and async runs.

**Tracing**
Built-in observability. Every agent run, tool call, and handoff is recorded as a span. Exportable to console or external backends. Essential for debugging multi-agent flows.

---

### LLM Configuration Levels

**Agent-level configuration** — set `model` and `modelSettings` directly on an `Agent` instance. This is the preferred approach because each agent can be tuned independently for its task.

```js
new Agent({ model: 'llama-3.1-8b-instant', modelSettings: { temperature: 0.2 } })
```

Use case: MathAgent uses low temperature for deterministic answers; GeneralAgent uses higher temperature for creative responses.

**Run-level configuration** — pass `RunConfig` to `runner.run()` to override model or settings for a specific execution. Useful for A/B testing or one-off overrides without changing agent definitions.

```js
runner.run(agent, input, { model: 'gpt-4o' })
```

Use case: Run the same agent with a more powerful model for a high-stakes query.

**Global-level configuration** — `setDefaultOpenAIClient()` sets the API client used by all agents that don't specify their own. Useful for pointing the entire system at a custom backend (like Groq).

```js
setDefaultOpenAIClient(new OpenAI({ baseURL: '...', apiKey: '...' }))
```

Use case: Swap the entire system from OpenAI to a self-hosted model endpoint without touching individual agents.

Agent-level is preferred because it keeps configuration co-located with the agent's purpose, makes behavior predictable, and avoids unintended side effects from global changes.

---

### Prompt-based LLM Usage vs Agent-based Systems

| Dimension | Prompt-based | Agent-based |
|---|---|---|
| Interaction model | Single request → single response | Multi-step loop with decisions at each step |
| Tool use | Manual — developer calls tools, injects results | Automatic — the model decides when and what to call |
| State | Stateless per call | Stateful across steps within a run |
| Delegation | Not possible | Agents hand off to specialized sub-agents |
| Complexity | Low — good for Q&A, summarization, generation | Higher — suited for workflows, automation, reasoning |
| Control flow | Fully in developer code | Partially driven by the model's reasoning |
| Observability | Manual logging | Built-in tracing (spans, processors, exporters) |

Use prompt-based for simple, one-shot tasks. Use agents when the task requires tool calls, conditional routing, multi-step reasoning, or collaboration between specialized models.
