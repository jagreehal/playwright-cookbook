import { test, expect } from '@playwright/test';
import { story } from 'executable-stories-playwright';

/**
 * The native lane. Every other WebMCP test in this cookbook runs against the
 * double in webmcp-fixture.ts, which is a transcription of what a browser is
 * documented to do. Nothing keeps a transcription honest except reading the
 * original again, which is this file's only job.
 *
 * When one of these fails, suspect the double before the browser.
 *
 *   pnpm test:webmcp:native
 */

/**
 * Feature-detect, do not version-check.
 *
 * Two things decide whether the API is there, and a version gate sees neither.
 * The flags have to be on, and the page needs a real origin: on a `data:` URL
 * the origin is opaque and `document.modelContext` is absent in a browser that
 * has it everywhere else. Ask the browser what it has, on the page you are
 * about to test.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/webmcp');
  const available = await page.evaluate(
    () => typeof document.modelContext?.registerTool === 'function',
  );
  test.skip(
    !available,
    'This Chrome exposes no document.modelContext. Use Chrome Canary with ' +
      '--enable-experimental-web-platform-features and --enable-features=WebMCPTesting.',
  );
  await expect(page.getByTestId('webmcp-status')).toHaveAttribute('data-webmcp', 'ready');
});

test('the browser owns the context, not a page script', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native'] });

  story.given('a real Chrome launched with the WebMCP flags');
  const shape = await page.evaluate(() => ({
    registerTool: document.modelContext!.registerTool.toString(),
    onPrototype: Object.getOwnPropertyNames(
      Object.getPrototypeOf(document.modelContext!),
    ).sort(),
  }));
  story.json({ label: 'Context shape', value: shape });

  story.then('registerTool is native code rather than a polyfill');
  expect(shape.registerTool).toContain('[native code]');

  story.then('the methods sit on a prototype, as a platform object does');
  expect(shape.onPrototype).toContain('registerTool');
  expect(shape.onPrototype).toContain('getTools');
});

test('the navigator aliases are not part of the contract', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native'] });

  story.given('a draft that moved its surface to document.modelContext');

  story.then('navigator.modelContext does not alias it');
  expect(await page.evaluate(() => typeof navigator.modelContext)).toBe('undefined');

  story.then('navigator.modelContextTesting is gone too');
  expect(await page.evaluate(() => typeof navigator.modelContextTesting)).toBe('undefined');
});

test('getTools returns browser-owned descriptors, sorted by name', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'contract'] });

  story.given('the cart page, which registers add_to_cart then get_cart');

  story.when('the agent lists them');
  const tools = await page.evaluate(() => document.modelContext!.getTools());
  story.json({ label: 'Native descriptors', value: tools });

  story.then('they come back sorted, not in registration order');
  expect(tools.map((tool) => tool.name)).toEqual(['add_to_cart', 'get_cart']);

  story.then('inputSchema is a JSON string, which is what the double copies');
  expect(typeof tools[0]!.inputSchema).toBe('string');
  expect(JSON.parse(tools[0]!.inputSchema)).toMatchObject({ type: 'object' });
});

test('an AbortSignal drops the registration it owns', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'lifecycle'] });

  story.given('a tool registered with a signal, the way a component unmounts');

  story.when('the signal aborts');
  const names = await page.evaluate(async () => {
    const controller = new AbortController();
    await document.modelContext!.registerTool(
      {
        name: 'temporary_probe',
        description: 'Registered for the length of one controller',
        execute: () => 'ok',
      },
      { signal: controller.signal },
    );
    const before = (await document.modelContext!.getTools()).map((t) => t.name);
    controller.abort();
    const after = (await document.modelContext!.getTools()).map((t) => t.name);
    return { after, before };
  });

  story.then('the tool was advertised while the signal lived');
  expect(names.before).toContain('temporary_probe');

  story.then('and is withdrawn once it aborts');
  expect(names.after).not.toContain('temporary_probe');
});

test('executeTool takes a descriptor and a JSON string', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'contract'] });

  story.given('a browser that exposes the executeTool preview extension');
  const hasExecute = await page.evaluate(
    () => typeof document.modelContext!.executeTool === 'function',
  );
  // A Chromium preview extension rather than WebMCP core, so it may be absent
  // on a browser that is otherwise conformant.
  test.skip(!hasExecute, 'This Chrome does not expose executeTool()');

  story.when('the agent calls add_to_cart with a JSON string');
  const result = await page.evaluate(async () => {
    const tools = await document.modelContext!.getTools();
    const add = tools.find((tool) => tool.name === 'add_to_cart')!;
    return document.modelContext!.executeTool!(add, JSON.stringify({ qty: 2, sku: 'espresso' }));
  });

  story.then('the result arrives as text, which is all an agent ever gets');
  expect(typeof result).toBe('string');
  expect(JSON.parse(result)).toMatchObject({ qty: 2, sku: 'espresso' });

  story.then('and the cart the user sees moved with it');
  await expect(page.getByTestId('cart-count')).toHaveText('2');
});

test('a duplicate name is refused', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'contract'] });

  story.given('add_to_cart, already registered by the page');

  story.when('a second registration claims the same name');
  const error = await page.evaluate(async () => {
    try {
      await document.modelContext!.registerTool({
        name: 'add_to_cart',
        description: 'A second tool claiming a taken name',
        execute: () => 'ok',
      });
      return 'ACCEPTED';
    } catch (caught) {
      return (caught as Error).name;
    }
  });

  story.then('the browser refuses it, which is what the double copies');
  expect(error).toBe('InvalidStateError');
});

test('a handler that throws rejects, and does not return its message', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'errors'] });

  // The double got this wrong first time round, which is the reason this lane
  // exists. Libraries built on WebMCP catch handler errors and hand the agent
  // readable text, and it is easy to credit the browser for that.
  story.given('add_to_cart, whose handler throws on an unknown SKU');
  const hasExecute = await page.evaluate(
    () => typeof document.modelContext!.executeTool === 'function',
  );
  test.skip(!hasExecute, 'This Chrome does not expose executeTool()');

  story.when('an agent asks for a SKU the catalogue does not stock');
  const outcome = await page.evaluate(async () => {
    const tools = await document.modelContext!.getTools();
    const add = tools.find((tool) => tool.name === 'add_to_cart')!;
    try {
      return { result: await document.modelContext!.executeTool!(add, JSON.stringify({ sku: 'tea' })) };
    } catch (caught) {
      return { message: (caught as Error).message, name: (caught as Error).name };
    }
  });
  story.json({ label: 'Outcome', value: outcome });

  story.then('the call rejects with UnknownError');
  expect(outcome.name).toBe('UnknownError');

  story.then('the thrown message is not what the agent receives');
  expect(outcome.result).toBeUndefined();
  expect(outcome.message).not.toContain('Unknown SKU');
});

test('every result reaches the agent as a string', async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ['webmcp', 'native', 'contract'] });

  story.given('tools whose handlers return a string, an object, and undefined');
  const hasExecute = await page.evaluate(
    () => typeof document.modelContext!.executeTool === 'function',
  );
  test.skip(!hasExecute, 'This Chrome does not expose executeTool()');

  story.when('the agent executes each one');
  const results = await page.evaluate(async () => {
    const mc = document.modelContext!;
    await mc.registerTool({ description: 'Returns a string', execute: () => 'plain', name: 'ret_string' });
    await mc.registerTool({ description: 'Returns an object', execute: () => ({ a: 1 }), name: 'ret_object' });
    await mc.registerTool({ description: 'Returns nothing', execute: () => undefined, name: 'ret_void' });
    const byName = Object.fromEntries((await mc.getTools()).map((tool) => [tool.name, tool]));
    return {
      object: await mc.executeTool!(byName.ret_object!, '{}'),
      string: await mc.executeTool!(byName.ret_string!, '{}'),
      void: await mc.executeTool!(byName.ret_void!, '{}'),
    };
  });
  story.json({ label: 'Handler results', value: results });

  story.then('a string passes through untouched');
  expect(results.string).toBe('plain');

  story.then('an object is serialised');
  expect(results.object).toBe('{"a":1}');

  story.then('undefined becomes the string "undefined", not an empty result');
  expect(results.void).toBe('undefined');
});
