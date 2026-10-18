import { test, expect } from '@playwright/test';

// Keyboard, focus, hover, and drag. Each test builds its own page with
// setContent so the event wiring sits next to the assertion that proves it.
test.describe('48-keyboard-mouse-drag: press, focus order, hover, dragTo, raw mouse', () => {
  test('press with modifiers selects and replaces text', async ({ page }) => {
    await page.setContent(`
      <label>Editor <textarea>draft text</textarea></label>
    `);
    const editor = page.getByLabel('Editor');

    // ControlOrMeta maps to Cmd on macOS and Ctrl elsewhere, so one test runs on every OS.
    await editor.press('ControlOrMeta+A');
    await editor.press('Backspace');
    await expect(editor).toHaveValue('');
  });

  test('fill skips key events; pressSequentially fires them', async ({ page }) => {
    await page.setContent(`
      <label>Filled <input /></label>
      <label>Typed <input /></label>
      <script>
        document.querySelectorAll('input').forEach((input) => {
          let keys = 0;
          input.addEventListener('keydown', () => { input.dataset.keys = String(++keys); });
        });
      </script>
    `);

    // Bad for key-driven widgets: fill sets the value in one input event.
    // A handler that listens to keydown never runs.
    await page.getByLabel('Filled').fill('pw');
    await expect(page.getByLabel('Filled')).not.toHaveAttribute('data-keys');

    // Good: pressSequentially types one key at a time, like a user.
    await page.getByLabel('Typed').pressSequentially('pw');
    await expect(page.getByLabel('Typed')).toHaveAttribute('data-keys', '2');
  });

  test('Tab order matches the visual order', async ({ page }) => {
    await page.setContent(`
      <label>Email <input /></label>
      <label>Password <input type="password" /></label>
      <button>Sign in</button>
    `);

    await page.getByLabel('Email').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
  });

  test('hover reveals a tooltip', async ({ page }) => {
    await page.setContent(`
      <button aria-describedby="tip">Save</button>
      <div role="tooltip" id="tip" hidden>Saves a draft</div>
      <script>
        const btn = document.querySelector('button');
        const tip = document.getElementById('tip');
        btn.addEventListener('mouseenter', () => { tip.hidden = false; });
        btn.addEventListener('mouseleave', () => { tip.hidden = true; });
      </script>
    `);

    await page.getByRole('button', { name: 'Save' }).hover();
    await expect(page.getByRole('tooltip')).toHaveText('Saves a draft');

    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toBeHidden();
  });

  test('dragTo moves an item between HTML5 drop zones', async ({ page }) => {
    await page.setContent(`
      <ul aria-label="Todo"><li draggable="true" id="task">Write tests</li></ul>
      <ul aria-label="Done" style="min-height:40px;border:1px solid"></ul>
      <script>
        const done = document.querySelector('[aria-label="Done"]');
        document.getElementById('task').addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', e.target.id);
        });
        done.addEventListener('dragover', (e) => e.preventDefault());
        done.addEventListener('drop', (e) => {
          e.preventDefault();
          done.appendChild(document.getElementById(e.dataTransfer.getData('text/plain')));
        });
      </script>
    `);

    await page.getByText('Write tests').dragTo(page.getByRole('list', { name: 'Done' }));
    await expect(page.getByRole('list', { name: 'Done' })).toContainText('Write tests');
  });

  test('raw mouse steps drive a pointer-event drag library', async ({ page }) => {
    // Custom drag libraries listen to pointer events and need movement
    // between down and up. A single jump can skip their drag threshold.
    await page.setContent(`
      <div id="knob" style="position:absolute;left:0;top:50px;width:40px;height:40px;background:#888"></div>
      <output>0</output>
      <script>
        const knob = document.getElementById('knob');
        let dragging = false;
        knob.addEventListener('pointerdown', () => { dragging = true; });
        document.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          knob.style.left = (e.clientX - 20) + 'px';
          document.querySelector('output').textContent = String(Math.round(e.clientX - 20));
        });
        document.addEventListener('pointerup', () => { dragging = false; });
      </script>
    `);

    const knob = await page.locator('#knob').boundingBox();
    expect(knob).not.toBeNull();
    const box = knob!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(220, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('output')).toHaveText('200');
  });
});
