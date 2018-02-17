import $ from 'jquery';
import * as helper from 'helper';
import config from 'config';
import Clipboard from 'clipboard';
let auto1 = false; // for debugging
let auto2 = false; // for debugging
const screens = {
  logIn: 'logIn',
  entries: 'entries',
  decode: 'decode',
  output: 'output'
};
const ids = {
  logOut: 'logOut',
  back: 'back',
  password: 'password',
  submit: 'submit',
  entries: 'entries',
  clearOutput: 'clearOutput',
  output: 'output',
  form: 'form'
};
const actions =  {
  loadEntry: 'loadEntry'
};
let _lastWriteTime = 0;
let _el = null;
let _screen = screens.logIn;
let _loggedIn = false;
let _actions = new Map();
let _query = null;
const _clipboards = [];
function getEl(id) {
  const el = $('#' + id);
  if (el.length !== 1)
    throw new Error(`Not exactly one element found with id '${id}'.`);
  return el;
}
function getTimePrefix(milliseconds) {
  let s = milliseconds + '';
  if (5 < s.length || milliseconds < 50)
    s = '';
  while (s.length < 5)
    s = ' ' + s;
  return s.replace(/ /g, '&nbsp;') + ' ';
}
function draw() {
  _el.logOut.toggleClass('hidden', !_loggedIn);
  _el.back.toggleClass('hidden', _screen === screens.logIn || _loggedIn && _screen === screens.entries);
  _el.submit.val(_screen === screens.logIn ? config.loginButtonText : config.decodeButtonText);
  const x = _screen !== screens.logIn && _screen !== screens.decode;
  _el.form.toggleClass('hidden', x);
  if (!x)
    _el.password.focus();
  _el.entries.toggleClass('hidden', _screen !== screens.entries);
  _el.clearOutput.toggleClass('hidden', _el.output.html().length === 0);
}
function info(message) {
  const now = Math.round(performance.now());
  _el.output.prepend(getTimePrefix(now - _lastWriteTime) + message + '<br>');
  draw();
  _lastWriteTime = now;
}
function log(type, message) {
  const levels = ['all', 'debug', 'info', 'warn', 'error', 'fatal', 'off'];
  const level = levels.indexOf(type);
  const minLevel = levels.indexOf(config.logLevel);
  if (console.log && typeof console.log === 'function' && minLevel <= level)
    console.log(message);
}
function wrap(f, defaultAns) {
  return (...args) => {
    try {
      return f(...args);
    } catch (err) {
      log('error', err);
      info(helper.escapeHtml(err));
      return defaultAns;
    }
  }
}
function runAction(id, ...args) {
  const ar = _actions.get(id);
  if (ar === undefined)
    throw new Error(`No action '${id}' specified.`);
  ar.forEach(z => z(...args));
}
function addAction(id, action) {
  const ar = _actions.has(id) ? _actions.get(id) : [];
  ar.push(action);
  _actions.set(id, ar);
}
function runAuto() {
  if (!auto1)
    return;
  _el.password.val('a');
  _el.submit.click();
  auto1 = false;
}
function setQuery() {
  const s = document.URL;
  const i = s.indexOf('?');
  if (i < 0) return;
  _query = s.substr(i);
}
function showAccounts(accounts) {
  const supported = Clipboard.isSupported();
  const div = $(document.createElement('div'));
  div.append('Decrypted account(s)<br>--------------------<br>');
  const map = new Map([['loginName', null], ['password', 'pass'], ['email', 'mail'], ['extra', 'x']]);
  for (const account of accounts) {
    const inner = $(document.createElement('span'));
    if (account.title)
      inner.append(account.title + ': ');
    for (const id in account) {
      if (!account.hasOwnProperty(id) || id === 'title')
        continue;
      if (id === 'matrixDecomposition') {
        inner.append(helper.escapeHtml(account[id]) + ' ');
        continue;
      }
      const a = $(document.createElement('a'));
      a.attr('href', '#');
      a.attr('data-clipboard-text', account[id]);
      a.text(map.has(id) ? (map.get(id) || account[id]) : id);
      a.click(e => {
        e.preventDefault();
        const el = $(e.target);
        el.addClass('clicked');
        setTimeout(() => el.removeClass('clicked'), 1000);
        return false;
      });
      inner.append(a);
      inner.append(' ');
    }
    const show = $(document.createElement('a'));
    show.attr('href', '#');
    show.text('show');
    show.click(e => {
      e.preventDefault();
      show.replaceWith('');
      inner.children().each((dummy, z) => $(z).text($(z).attr('data-clipboard-text')));
      return false;
    });
    inner.append(show);
    div.append(inner);
  }
  _el.output.prepend(div);
  _clipboards.push(new Clipboard(div[0].querySelectorAll('a')));
}
class Ui {
  info(...args) { info(...args); }
  log(...args) { log(...args); }
  addLogInAction(action) { addAction(screens.logIn, action); }
  addLogOutAction(action) { addAction(ids.logOut, action); }
  addLoadEntryAction(action) { addAction(actions.loadEntry, action); }
  addDecodeAction(action) { addAction(screens.decode, action); }
  showDecodeScreen() { _screen = screens.decode; draw(); runAuto(); }
  get wrap () { return wrap; }
  get query () { return _query; }
  set loggedIn (value) { _loggedIn = value; }
  showEntries(entries) {
    const div = $(document.createElement('div'));
    div.attr('id', ids.entries);
    let testEl = null;
    const ar = [];
    for (const id in entries)
      if (entries.hasOwnProperty(id))
        ar.push({ id, title: entries[id] });
    ar.sort((x, y) => (x.title.toLowerCase() < y.title.toLowerCase() ? -1 : 1));
    for (const { id, title } of ar) {
      const a = $(document.createElement('a'));
      a.attr('href', '#');
      a.addClass('block');
      if (id === 'test')
        testEl = a;
      a.text(title);
      a.click(wrap(e => { e.preventDefault(); runAction(actions.loadEntry, id); return false; }));
      div.append(a);
    }
    _el.entries.replaceWith(div);
    _el.entries = div;
    _screen = screens.entries;
    draw();
    if (auto1 && testEl)
      testEl.click();
  }
  showOutput(type, arg) {
    _screen = screens.output;
    if (type === 'html') {
      _el.output.prepend(arg);
      draw();
    } else if (type === 'accounts') {
      showAccounts(arg);
    } else
      throw new Error(`Unexpected type '${type}'.`);
    draw();
  }
}
const ui = new Ui();
export default ui;
$(() => {
  setQuery();
  if (window.history && window.history.replaceState)
    window.history.replaceState({}, 'cyptro', '/');
  _el = {
    logOut: getEl(ids.logOut),
    back: getEl(ids.back),
    password: getEl(ids.password),
    submit: getEl(ids.submit),
    entries: getEl(ids.entries),
    clearOutput: getEl(ids.clearOutput),
    output: getEl(ids.output),
    form: getEl(ids.form)
  };
  _el.logOut.add(_el.back).add(_el.clearOutput).click(wrap(e => {
    const el = $(e.target);
    const id = el.attr('id');
    runAction(id);
  }));
  _el.form.submit(wrap(e => {
    e.preventDefault();
    const password = _el.password.val();
    _el.password.val('');
    runAction(_screen, password);
    return false;
  }));
  draw();
  $('body').toggleClass('hidden', false);
  draw();
  if (auto2)
    _el.password.val('a');
  if (auto1 || auto2)
    _el.submit.click();
});
addAction(ids.logOut, () => {
  _screen = screens.logIn;
  _loggedIn = false;
  draw();
});
addAction(ids.back, () => {
  _screen = _screen === screens.entries ? screens.logIn : screens.entries;
  draw();
});
addAction(ids.clearOutput, () => {
  _el.output.html('');
  _clipboards.forEach(z => z.destroy());
  _clipboards.length = 0;
  draw();
});
