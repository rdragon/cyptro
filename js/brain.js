import ui from 'ui';
import * as helper from 'helper';
import config from 'config';
import decrypt from 'decrypt';
const _token = Symbol('_token');
const _encrypted = Symbol('_encrypted');
const _salt = Symbol('_salt');
function fetchStaticEntries(brain) {
  helper.download(ui, 'Loading entries...', config.staticDataUrl + '/' + config.entriesFile, 'json', entries => {
    ui.info('Entries loaded.')
    ui.showEntries(entries);
  });
}
function logIn(brain, password) {
  const url = `${config.apiUrl}?action=logIn&password=${encodeURIComponent(password)}`;
  helper.download(ui, 'Logging in...', url, 'json', response => {
    if (response.status !== 'ok') {
      ui.info('Could not login: ' + response.message);
      return;
    }
    brain[_token] = response.token;
    ui.loggedIn = true;
    ui.showEntries(response.entries);
    ui.info('Successfully logged in.');
  });
}
function handleEntryLoaded(brain, encrypted, id) {
  ui.info('Entry loaded.');
  brain[_encrypted] = encrypted;
  brain[_salt] = getSalt(id);
  ui.showDecodeScreen();
}
function getSalt(id) {
  return (id.match(/^[0-9]+_[0-9]$/) ? id.slice(-1) : id) + config.saltSuffix;
}
export default class {
  constructor() {
    this[_token] = null;
    this[_encrypted] = null;
    this[_salt] = null;
  }
  initialize() {
    ui.addLogInAction(password => {
      if (password.length === 0)
        fetchStaticEntries(this);
      else
        logIn(this, password);
    });
    ui.addLogOutAction(() => {
      helper.download(ui, 'Logging out...', `${config.apiUrl}?action=logOut&token=${this[_token]}`, 'json', response => {
        if (response.status === 'ok')
          ui.info('Successfully logged out.');
        else
          ui.info('Could not log out: ' + response.message);
      });
      this[_token] = null;
    });
    ui.addLoadEntryAction(id => {
      if (this[_token] === null)
        helper.download(ui, 'Loading entry...', `${config.staticDataUrl}/${id}${config.entrySuffix}`, 'text', encrypted => handleEntryLoaded(this, encrypted, id));
      else
        helper.download(ui, 'Loading entry...', `${config.apiUrl}?action=getEntry&token=${this[_token]}&id=${id}`, 'json', response => {
          if (response.status !== 'ok') {
            ui.info('Could not load entry: ' + response.message);
            return;
          }
          handleEntryLoaded(this, response.encrypted, id);
        });
    });
    ui.addDecodeAction(password => {
      if (password.length === 0)
        ui.info('Password is empty.');
      else
        decrypt(this[_encrypted], this[_salt], password, (...args) => ui.showOutput(...args));
    });
  }
};
