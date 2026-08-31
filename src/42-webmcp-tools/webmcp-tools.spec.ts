import { test, expect } from './webmcp-fixture';
import { story } from 'executable-stories-playwright';

// The everyday lane. Bundled Chromium has no WebMCP, so `page` arrives with the
// test double from webmcp-fixture.ts already installed. What is under test here
// is the page's own tool registration: the schemas it advertises, what its
// handlers return, and whether a tool call and a click land in the same state.
//
// The browser's real behaviour is not under test here. That is the native
// lane's job (webmcp-native.contract.ts), and it is what keeps this double
// honest.

test.describe('42-webmcp-tools: testing a page that exposes agent tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/webmcp');
    await expect(page.getByTestId('webmcp-status')).toHaveAttribute(
      'data-webmcp',
      'ready',
    );
  });

  test('the page advertises its tools to an agent', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'agent'] });

    story.given('a cart page that registers WebMCP tools on load');

    story.when('an agent lists the tools on the page');
    const tools = await page.evaluate(() => document.modelContext!.getTools());
    story.json({ label: 'Advertised tools', value: tools });

    story.then('both cart tools are advertised, sorted by name');
    expect(tools.map((tool) => tool.name)).toEqual(['add_to_cart', 'get_cart']);

    story.then('each tool carries a description an agent can act on');
    for (const tool of tools) expect(tool.description).not.toBe('');
  });

  test('a tool schema names the arguments an agent must send', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'contract'] });

    story.given('the add_to_cart tool');
    const [tool] = await page.evaluate(() => document.modelContext!.getTools());

    story.when('the agent reads its input schema');
    // The browser serialises the schema, so parse before asserting on it.
    const schema = JSON.parse(tool!.inputSchema) as {
      required?: string[];
      properties: Record<string, { enum?: string[] }>;
    };
    story.json({ label: 'add_to_cart inputSchema', value: schema });

    story.then('sku is required and constrained to the catalogue');
    expect(schema.required).toEqual(['sku']);
    expect(schema.properties.sku?.enum).toEqual(['espresso', 'cold-brew']);
  });

  test('an agent calling a tool changes what the user sees', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'agent'] });

    story.given('an empty cart');
    await expect(page.getByTestId('cart-count')).toHaveText('0');

    story.when('an agent calls add_to_cart for two espressos');
    const result = await page.evaluate(async () => {
      const [addToCart] = await document.modelContext!.getTools();
      return document.modelContext!.executeTool!(
        addToCart!,
        JSON.stringify({ sku: 'espresso', qty: 2 }),
      );
    });

    story.then('the tool reports what it added');
    expect(JSON.parse(result)).toMatchObject({ sku: 'espresso', qty: 2, total: 2 });

    story.then('the cart the user sees holds the same two');
    await expect(page.getByTestId('cart')).toContainText('2 x espresso');
    await expect(page.getByTestId('cart-count')).toHaveText('2');
  });

  test('a tool call and a click reach the same cart', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'agent'] });

    story.given('a user who has already added a cold brew by hand');
    await page.getByTestId('add-cold-brew').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    story.when('an agent adds an espresso through the tool');
    await page.evaluate(async () => {
      const tools = await document.modelContext!.getTools();
      const add = tools.find((tool) => tool.name === 'add_to_cart')!;
      await document.modelContext!.executeTool!(add, JSON.stringify({ sku: 'espresso' }));
    });

    story.then('one cart holds both, rather than the agent keeping its own');
    await expect(page.getByTestId('cart-count')).toHaveText('2');
    await expect(page.getByTestId('cart')).toContainText('1 x cold-brew');
    await expect(page.getByTestId('cart')).toContainText('1 x espresso');
  });

  test('a handler that throws rejects the call', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'errors'] });

    story.given('a catalogue that has never heard of tea');

    story.when('an agent asks for a SKU that does not exist');
    const outcome = await page.evaluate(async () => {
      const tools = await document.modelContext!.getTools();
      const add = tools.find((tool) => tool.name === 'add_to_cart')!;
      try {
        return { result: await document.modelContext!.executeTool!(add, JSON.stringify({ sku: 'tea' })) };
      } catch (caught) {
        return { name: (caught as Error).name };
      }
    });

    // Measured against Chrome 152: the call rejects, so the message never
    // reaches the agent as a result. Wrap a handler yourself if you want the
    // agent to read the reason.
    story.then('the browser rejects rather than returning the message');
    expect(outcome.name).toBe('UnknownError');

    story.then('the cart is untouched');
    await expect(page.getByTestId('cart-count')).toHaveText('0');
  });

  test('the page still works in a browser with no WebMCP', async ({ page }, testInfo) => {
    story.init(testInfo, { tags: ['webmcp', 'progressive-enhancement'] });

    story.given('a browser that never shipped document.modelContext');
    // Every browser without the flag. Drop the shim to be that browser.
    await page.addInitScript(() => {
      Object.defineProperty(document, 'modelContext', {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto('/webmcp');

    story.then('the page says so rather than throwing');
    await expect(page.getByTestId('webmcp-status')).toHaveAttribute(
      'data-webmcp',
      'unavailable',
    );

    story.then('a human can still add to the cart');
    await page.getByTestId('add-espresso').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
