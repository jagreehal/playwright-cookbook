(function () {
  var VALID_USERS = { testuser: 'password', admin: 'adminpass', alice: 'secret' };

  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    if (username && password) {
      if (VALID_USERS[username] === password) {
        localStorage.setItem('auth', '1');
        localStorage.setItem('user', username);
        window.location.href = '/protected';
      }
    }
  });
})();
