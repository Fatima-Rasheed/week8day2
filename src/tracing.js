import {
  setTracingDisabled,
  addTraceProcessor,
  BatchTraceProcessor,
  ConsoleSpanExporter,
} from '@openai/agents';

let processor = null;

/**
 * Initialise tracing based on the TRACING env var.
 *
 * TRACING=console  → print every span to stdout (good for local debugging)
 * TRACING=off      → disable tracing entirely (default)
 */
export function initTracing() {
  const mode = (process.env.TRACING ?? 'off').toLowerCase();

  if (mode === 'console') {
    processor = new BatchTraceProcessor(new ConsoleSpanExporter());
    addTraceProcessor(processor);
    console.log('[Tracing] Console tracing enabled — spans will print on exit.\n');
    return;
  }

  // Default: off
  setTracingDisabled(true);
  if (mode !== 'off') {
    console.warn(`[Tracing] Unknown TRACING value "${mode}". Tracing disabled.\n`);
  } else {
    console.log('[Tracing] Disabled.\n');
  }
}

/**
 * Flush any buffered spans — call before process exit.
 */
export async function flushTracing() {
  if (processor) {
    await processor.forceFlush();
  }
}
