import { test, expect } from '@playwright/test';

// page.clock replaces Date, setTimeout, setInterval and friends inside the
// page. Install it before the page's scripts run, then move time yourself.
// install() alone keeps time flowing at real speed. Pause it when a test
// counts ticks, or a slow runner fires timers between your steps.
const T0 = new Date('2026-01-01T00:00:00Z');

test.describe('50-clock-control: install, fastForward, runFor, setFixedTime, pauseAt', () => {
  test('fastForward fires a long timer without waiting for it', async ({ page }) => {
    await page.clock.install();
    await page.setContent(`
      <button>Start</button>
      <p role="status">Idle</p>
      <script>
        document.querySelector('button').onclick = () => {
          document.querySelector('p').textContent = 'Running';
          setTimeout(() => { document.querySelector('p').textContent = 'Session expired'; }, 15 * 60_000);
        };
      </script>
    `);

    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Running');

    // Bad: await page.waitForTimeout(15 * 60_000) burns 15 real minutes,
    // and any shorter sleep is a guess that flakes on a slow runner.

    // Good: move the fake clock past the timeout.
    await page.clock.fastForward('15:00');
    await expect(page.getByRole('status')).toHaveText('Session expired');
  });

  test('runFor steps an interval-driven countdown', async ({ page }) => {
    await page.clock.install({ time: T0 });
    await page.clock.pauseAt(T0);
    await page.setContent(`
      <p role="timer">5</p>
      <script>
        let left = 5;
        const id = setInterval(() => {
          left -= 1;
          document.querySelector('p').textContent = left === 0 ? 'Go' : String(left);
          if (left === 0) clearInterval(id);
        }, 1000);
      </script>
    `);

    // runFor fires every timer due in the window, one tick at a time.
    await page.clock.runFor(2000);
    await expect(page.getByRole('timer')).toHaveText('3');
    await page.clock.runFor(3000);
    await expect(page.getByRole('timer')).toHaveText('Go');
  });

  test('debounced search fires once after the user stops typing', async ({ page }) => {
    await page.clock.install({ time: T0 });
    await page.clock.pauseAt(T0);
    await page.setContent(`
      <label>Search <input /></label>
      <p>Searches: <output>0</output></p>
      <script>
        let t, count = 0;
        document.querySelector('input').addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { document.querySelector('output').textContent = String(++count); }, 300);
        });
      </script>
    `);

    const search = page.getByLabel('Search');
    const searches = page.locator('output');
    await search.pressSequentially('pl');
    // A pause shorter than the delay. A debounce that ignored later keystrokes
    // would fire 300ms after "p", which falls inside the next window.
    await page.clock.runFor(200);
    await search.pressSequentially('ay');
    await page.clock.runFor(299);
    await expect(searches).toHaveText('0');
    // 300ms after the final keystroke, exactly one search runs.
    await page.clock.runFor(1);
    await expect(searches).toHaveText('1');
  });

  test('setFixedTime pins Date for date-dependent UI', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-12-25T09:00:00Z'));
    await page.setContent(`
      <p></p>
      <script>
        const d = new Date();
        document.querySelector('p').textContent =
          d.getUTCMonth() === 11 && d.getUTCDate() === 25 ? 'Happy holidays' : 'Welcome';
      </script>
    `);

    await expect(page.getByText('Happy holidays')).toBeVisible();
  });

  test('pauseAt jumps to a moment and holds time there', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T08:59:00Z') });
    await page.setContent(`
      <p role="status"></p>
      <script>
        const render = () => {
          const open = new Date().getUTCHours() >= 9;
          document.querySelector('p').textContent = open ? 'Open' : 'Closed';
        };
        render();
        setInterval(render, 1000);
      </script>
    `);
    await expect(page.getByRole('status')).toHaveText('Closed');

    await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
    await page.clock.runFor(1000);
    await expect(page.getByRole('status')).toHaveText('Open');
  });
});
