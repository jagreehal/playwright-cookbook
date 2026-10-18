import { test, expect } from '@playwright/test';

const usersTable = `
  <table aria-label="Users">
    <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
    <tbody>
      <tr><td>Nova</td><td>Admin</td><td><button>Delete</button></td></tr>
      <tr><td>Kai</td><td>Editor</td><td><button>Delete</button></td></tr>
      <tr><td>Remy</td><td>Viewer</td><td><button>Delete</button></td></tr>
    </tbody>
  </table>
  <p role="status"></p>
  <script>
    document.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        document.querySelector('[role="status"]').textContent = 'Deleted ' + row.cells[0].textContent;
        row.remove();
      });
    });
  </script>
`;

// Rows, cells, and headers have ARIA roles. Target them by role and by the
// content that identifies the row, so a reordered table cannot fool the test.
test.describe('49-tables-and-grids: rows, cells, sort order, pagination', () => {
  test('read a cell by its row content', async ({ page }) => {
    await page.setContent(usersTable);
    const table = page.getByRole('table', { name: 'Users' });

    await expect(table.getByRole('columnheader')).toHaveText(['Name', 'Role', 'Actions']);
    // Header row plus three body rows.
    await expect(table.getByRole('row')).toHaveCount(4);

    const kai = table.getByRole('row').filter({ hasText: 'Kai' });
    await expect(kai.getByRole('cell').nth(1)).toHaveText('Editor');
  });

  test('row-scoped actions: filter the row, then act inside it', async ({ page }) => {
    await page.setContent(usersTable);
    const rows = page.getByRole('table', { name: 'Users' }).getByRole('row');

    // Bad: "the third row" is Remy today. Sort the table or add a user and
    // the same index deletes someone else.
    //   await rows.nth(3).getByRole('button', { name: 'Delete' }).click();

    // Good: name the row by the data that identifies it.
    await rows
      .filter({ has: page.getByRole('cell', { name: 'Remy', exact: true }) })
      .getByRole('button', { name: 'Delete' })
      .click();

    await expect(page.getByRole('status')).toHaveText('Deleted Remy');
    await expect(rows.filter({ hasText: 'Remy' })).toHaveCount(0);
  });

  test('assert sort order with toHaveText(array)', async ({ page }) => {
    await page.setContent(`
      <table aria-label="Scores">
        <thead><tr><th><button>Name</button></th><th>Score</th></tr></thead>
        <tbody>
          <tr><td>Nova</td><td>12</td></tr>
          <tr><td>Remy</td><td>9</td></tr>
          <tr><td>Kai</td><td>15</td></tr>
        </tbody>
      </table>
      <script>
        document.querySelector('th button').addEventListener('click', () => {
          setTimeout(() => {
            const tbody = document.querySelector('tbody');
            [...tbody.rows]
              .sort((a, b) => a.cells[0].textContent.localeCompare(b.cells[0].textContent))
              .forEach((r) => tbody.appendChild(r));
          }, 200);
        });
      </script>
    `);
    const firstColumn = page.locator('tbody tr td:first-child');

    await page.getByRole('button', { name: 'Name' }).click();

    // Bad: allTextContents() reads once, before the 200ms sort lands.
    //   expect(await firstColumn.allTextContents()).toEqual(['Kai', 'Nova', 'Remy']);

    // Good: toHaveText with an array retries until every cell matches in order.
    await expect(firstColumn).toHaveText(['Kai', 'Nova', 'Remy']);
  });

  test('paginated grid: assert the page, then the rows', async ({ page }) => {
    await page.setContent(`
      <table aria-label="People"><tbody></tbody></table>
      <nav aria-label="Pagination">
        <button aria-label="Previous page">Prev</button>
        <span aria-live="polite">Page 1 of 2</span>
        <button aria-label="Next page">Next</button>
      </nav>
      <script>
        const pages = [['Ada', 'Kai'], ['Mira', 'Remy']];
        let i = 0;
        const render = () => {
          document.querySelector('tbody').innerHTML =
            pages[i].map((n) => '<tr><td>' + n + '</td></tr>').join('');
          document.querySelector('[aria-live]').textContent = 'Page ' + (i + 1) + ' of 2';
        };
        document.querySelector('[aria-label="Next page"]').onclick = () => { i = Math.min(i + 1, 1); render(); };
        document.querySelector('[aria-label="Previous page"]').onclick = () => { i = Math.max(i - 1, 0); render(); };
        render();
      </script>
    `);
    const rows = page.getByRole('table', { name: 'People' }).getByRole('row');

    await expect(rows).toHaveText(['Ada', 'Kai']);
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(rows).toHaveText(['Mira', 'Remy']);
  });
});
