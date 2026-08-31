/**
 * WebMCP is a draft, so TypeScript's DOM lib does not know `document.modelContext`
 * and every `page.evaluate` that touches it fails `tsc`. Declare the slice you
 * use. Keep it narrow: a wrong guess here is a lie the compiler will defend.
 */
interface WebMcpToolDescriptor {
  name: string;
  description: string;
  /** Serialised by the browser. A JSON string, not the object you registered. */
  inputSchema: string;
  title: string;
  annotations: Record<string, boolean>;
  origin: string;
}

interface WebMcpModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      title?: string;
      execute: (input: never) => unknown;
    },
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  getTools(): Promise<WebMcpToolDescriptor[]>;
  /** A Chromium preview extension. Feature-detect before calling it. */
  executeTool?(tool: WebMcpToolDescriptor, inputJson: string): Promise<string>;
}

interface Document {
  modelContext?: WebMcpModelContext;
}

/**
 * Chrome once aliased the surface onto `navigator` and shipped an undocumented
 * `navigator.modelContextTesting`. Both are gone. Declared only so the native
 * lane can assert their absence without `tsc` objecting.
 */
interface Navigator {
  modelContext?: unknown;
  modelContextTesting?: unknown;
}
