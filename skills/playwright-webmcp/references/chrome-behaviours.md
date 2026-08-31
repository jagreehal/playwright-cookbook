# What Chrome actually does

Last measured against Chrome 152.0.7977.65 with `--enable-experimental-web-platform-features` and `--enable-features=WebMCPTesting,DevToolsWebMCPSupport`. This table is a snapshot, not a version gate. The native lane is the source of truth: when it fails, update the double and this table together.

Copy these into the default-lane double. A default lane that asserts fiction is worse than no double.

| Behaviour | What Chrome does |
|---|---|
| `getTools()` order | sorted by name, not registration order |
| `inputSchema` | a JSON **string**, so parse before asserting |
| `executeTool(tool, input)` | `input` must be a JSON string; an object rejects with `UnknownError` |
| handler returns an object | serialised, so `{a:1}` arrives as `'{"a":1}'` |
| handler returns `undefined` | arrives as the string `"undefined"` |
| handler throws | the call **rejects** with `UnknownError` and a generic message |
| duplicate name | `InvalidStateError` |
| `AbortSignal` | aborting withdraws the registration |

The throwing case catches people because WebMCP libraries often catch handler errors and return readable text. That is not browser behaviour. Wrap the handler yourself when the agent needs the reason:

```ts
execute: (input) => {
  try {
    return JSON.stringify(addToCart(input.sku));
  } catch (error) {
    return `Could not add that item: ${error.message}`;
  }
}
```

Re-measure by running the native lane against a flagged Chrome. Do not gate on `>= 152`.
