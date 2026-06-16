(function () {
  const API_BASE = 'https://swapi.dev/api';
  const app = document.getElementById('app');
  let currentPerson = null;

  function getPersonId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '1';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(function () {
      toast.style.display = 'none';
    }, 3000);
  }

  function renderPerson(person) {
    currentPerson = person;
    const id = getPersonId();
    app.innerHTML = `
      <h1>Person</h1>
      <div data-testid="person-card:${id}" class="person-card">
        <dl>
          <dt>Name</dt><dd data-testid="person-name">${person.name}</dd>
          <dt>Height</dt><dd data-testid="person-height">${person.height}</dd>
          <dt>Mass</dt><dd data-testid="person-mass">${person.mass || '—'}</dd>
        </dl>
        <button type="button" data-testid="edit-person">Edit</button>
      </div>
    `;
    app.querySelector('[data-testid="edit-person"]').addEventListener('click', openEditDialog);
  }

  function openEditDialog() {
    if (!currentPerson) return;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Edit person');
    dialog.innerHTML = `
      <form method="dialog">
        <label for="edit-name">Name</label>
        <input id="edit-name" name="name" type="text" value="${currentPerson.name}" />
        <button type="submit" name="save">Save</button>
      </form>
    `;
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      const name = dialog.querySelector('#edit-name').value;
      if (name) {
        currentPerson = Object.assign({}, currentPerson, { name: name });
        renderPerson(currentPerson);
        showToast('Saved');
      }
      dialog.close();
      dialog.remove();
    });
  }

  function renderError(message) {
    app.innerHTML = `<h1>Person</h1><p data-testid="error" role="alert">${message}</p>`;
  }

  async function load() {
    const id = getPersonId();
    try {
      const res = await fetch(`${API_BASE}/people/${id}/`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`SWAPI error ${res.status}: ${text}`);
      }
      const person = await res.json();
      renderPerson(person);
    } catch (err) {
      renderError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  load();
})();
