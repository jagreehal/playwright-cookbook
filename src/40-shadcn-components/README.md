# Card 40: Testing shadcn (base-ui) components

## Scenario

Your team ships shadcn/ui on base (`@base-ui/react`). Someone argues that the component library "handles accessibility," so a `data-testid` on a Select or a Toast is harmless. The primitives are accessible. The accessible name is your code, and a test id hides the moment you forget to write it.

## Aim

- Show what base-ui gives you for free: a focusable icon `Button`, a `combobox` Select with real `option`s, a focus-trapping `Dialog`, a Toast that lands in a `Notifications` region.
- Show what stays application code: the `aria-label` on the icon button, the `FieldLabel` on the inputs, the name on the Select, the `DialogTitle`, the Toast title. A named-role query proves each one; a test id passes whether you wired it or not.
- Show the portal trap. A Select popup, a Dialog, and a Toast render at the end of `<body>`, so a query scoped to the field or region finds nothing and a page-level query finds them.

## How it works

Two tiers run the same lessons, the convention card 39 follows.

1. **The isolated tier** builds each surface twice with `page.setContent`: once with the roles base-ui renders, once as a div clone wired only with `data-testid`. The markup reproduces the roles (`combobox`/`listbox`/`option` for Select, `region` plus `dialog` for Toast), not the class names. `getByRole('combobox', { name: 'Country' })` and `getByRole('dialog', { name: 'Changes saved' })` pass against the good markup and return `toHaveCount(0)` against the clone.
2. **The rendered tier** drives the real components at `/cards/40`, where shadcn login, icon button, Select, Dialog, and Toast run with their own JS. Here the overlays genuinely portal to the body, so the page-scope queries are the only way to reach them. The island sets a hydration attribute on mount, and the spec waits for it before the first interaction so a click never races `client:load`.
3. Each query does two jobs: it finds the element and proves a real user could too. The portal cases scope a query to the field or region, show it misses, then find the same element at page level.

## When to use

- When a review treats "we use shadcn" as proof that accessibility is covered.
- When you test a Select, a Toast, a Dialog, or any portaled overlay and need to know why a region-scoped query comes back empty.
- As the runnable companion to the `playwright-shadcn` skill, beneath `playwright-locators` and `playwright-testid-strategy`.

## Run

```bash
pnpm test src/40-shadcn-components
```
