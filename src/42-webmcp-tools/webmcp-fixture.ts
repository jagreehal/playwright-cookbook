import { test as base, type Page } from '@playwright/test';

/**
 * A WebMCP test double, installed before any page script runs.
 *
 * Chrome ships `document.modelContext` behind a flag, so the everyday suite has
 * no browser API to drive. This stands in for one. It copies the behaviours the
 * real surface is documented to have, and the native lane in
 * `webmcp-native.contract.ts` is what proves the copy still matches.
 *
 * These behaviours catch people out, so they are reproduced exactly. Each one
 * was measured against Chrome 152, not guessed:
 *   1. `getTools()` sorts by name, ignoring registration order.
 *   2. A descriptor's `inputSchema` comes back as a JSON string, not an object.
 *   3. `executeTool()` takes a JSON *string*; an object rejects.
 *   4. A duplicate or malformed name throws `InvalidStateError`.
 *   5. A handler that throws *rejects* with `UnknownError`. It does not resolve
 *      with the message. Libraries built on WebMCP often catch and return text,
 *      which is easy to mistake for the browser doing it.
 *   6. A handler returning `undefined` resolves with the string "undefined".
 */
export const installWebMcpShim = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    const registry = new Map<string, { definition: Record<string, unknown>; execute: (input: unknown) => unknown }>();

    const fail = (name: string, message: string): never => {
      const error = new Error(message);
      error.name = name;
      throw error;
    };

    const descriptor = (name: string) => {
      const { definition } = registry.get(name)!;
      return {
        name,
        description: definition.description as string,
        // The browser hands back a serialised schema, not the object you passed.
        inputSchema: JSON.stringify(definition.inputSchema ?? { type: 'object' }),
        title: (definition.title as string) ?? '',
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        origin: location.origin,
      };
    };

    const modelContext = {
      async registerTool(tool: Record<string, unknown>, options?: { signal?: AbortSignal }) {
        const name = tool.name as string;
        if (typeof name !== 'string' || name === '' || /\s/.test(name)) {
          fail('InvalidStateError', `Invalid tool name: ${String(name)}`);
        }
        if (typeof tool.description !== 'string' || tool.description === '') {
          fail('InvalidStateError', 'A tool needs a non-empty description');
        }
        if (typeof tool.execute !== 'function') {
          throw new TypeError('execute must be a function');
        }
        if (registry.has(name)) fail('InvalidStateError', `Duplicate tool name: ${name}`);

        registry.set(name, { definition: tool, execute: tool.execute as (i: unknown) => unknown });
        // An AbortSignal owns the registration, which is how a component drops
        // its tools on unmount.
        options?.signal?.addEventListener('abort', () => {
          registry.delete(name);
          document.dispatchEvent(new Event('toolchange'));
        });
        document.dispatchEvent(new Event('toolchange'));
      },

      async getTools() {
        return [...registry.keys()].sort().map((name) => descriptor(name));
      },

      async executeTool(tool: { name: string }, inputJson: string) {
        const entry = registry.get(tool?.name);
        if (!entry) fail('NotFoundError', `No such tool: ${tool?.name}`);
        if (typeof inputJson !== 'string') {
          fail('UnknownError', 'Failed to parse input arguments');
        }
        let input: unknown;
        try {
          input = JSON.parse(inputJson);
        } catch {
          fail('UnknownError', 'Failed to parse input arguments');
        }
        let result: unknown;
        try {
          result = await entry!.execute(input);
        } catch {
          // The browser rejects. It does not hand the agent the message.
          fail(
            'UnknownError',
            'Tool was executed but the invocation failed. For example, the script function threw an error',
          );
        }
        // Everything reaches the agent as text, `undefined` included.
        return typeof result === 'string' ? result : String(JSON.stringify(result));
      },
    };

    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: modelContext,
    });
  });
};

/** `page` arrives with the shim already installed. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await installWebMcpShim(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
