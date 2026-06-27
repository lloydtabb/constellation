/*
 * Live tuning panel. Reads window.CONSTELLATION_PARAMS, drives game.setConfig().
 *
 *   DevPanel.mount(game);
 *
 * Renders a "⚙" toggle and a slider per parameter. "copy config" puts the
 * current tuned values on the clipboard so you can paste them into a preset.
 */
(function (global) {
  'use strict';

  const CSS =
    '#devpanel-toggle{position:fixed;top:8px;left:8px;z-index:9999;background:rgba(8,12,36,0.92);' +
      'border:1px solid #2a3a6a;border-radius:8px;color:#88aadd;font:14px monospace;width:32px;height:32px;cursor:pointer;}' +
    '#devpanel{position:fixed;top:46px;left:8px;z-index:9999;width:230px;max-height:80vh;overflow-y:auto;' +
      'background:rgba(8,12,36,0.96);border:1px solid #2a3a6a;border-radius:10px;padding:10px 12px;' +
      'font:11px monospace;color:#88aadd;display:none;}' +
    '#devpanel.open{display:block;}' +
    '#devpanel h3{font-size:11px;color:#aaccff;margin:0 0 8px;font-weight:normal;letter-spacing:1px;}' +
    '#devpanel .row{margin:7px 0;}' +
    '#devpanel .row label{display:flex;justify-content:space-between;margin-bottom:2px;}' +
    '#devpanel .row label .val{color:#cce0ff;}' +
    '#devpanel input[type=range]{width:100%;accent-color:#4488ff;}' +
    '#devpanel .actions{display:flex;gap:6px;margin-top:10px;}' +
    '#devpanel button{flex:1;background:#0d1530;border:1px solid #2a3a6a;border-radius:6px;color:#6688bb;' +
      'font:11px monospace;padding:5px;cursor:pointer;}' +
    '#devpanel .note{margin-top:8px;color:#445588;font-size:9px;line-height:1.4;}';

  function fmt(v, step) { return step < 1 ? Number(v).toFixed(2) : String(v); }

  function mount(game) {
    const params = global.CONSTELLATION_PARAMS || [];

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const toggle = document.createElement('button');
    toggle.id = 'devpanel-toggle';
    toggle.textContent = '⚙';
    toggle.title = 'tune parameters';

    const panel = document.createElement('div');
    panel.id = 'devpanel';
    panel.innerHTML = '<h3>✦ TUNE</h3>';

    toggle.addEventListener('click', function () { panel.classList.toggle('open'); });

    params.forEach(function (p) {
      const row = document.createElement('div'); row.className = 'row';
      const label = document.createElement('label');
      const name = document.createElement('span'); name.textContent = p.label;
      const val = document.createElement('span'); val.className = 'val';
      const input = document.createElement('input');
      input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step;
      const start = game.config[p.key];
      input.value = start;
      val.textContent = fmt(start, p.step);
      input.addEventListener('input', function () {
        const v = parseFloat(input.value);
        val.textContent = fmt(v, p.step);
        const patch = {}; patch[p.key] = v;
        game.setConfig(patch);
      });
      label.appendChild(name); label.appendChild(val);
      row.appendChild(label); row.appendChild(input);
      panel.appendChild(row);
    });

    const actions = document.createElement('div'); actions.className = 'actions';
    const newBtn = document.createElement('button'); newBtn.textContent = 'new word';
    newBtn.addEventListener('click', function () { game.newGame(); });
    const copyBtn = document.createElement('button'); copyBtn.textContent = 'copy config';
    copyBtn.addEventListener('click', function () {
      const lines = params.map(function (p) {
        const v = game.config[p.key];
        return '  ' + p.key + ': ' + (p.step < 1 ? Number(v).toFixed(2) : v) + ',';
      });
      const text = '{\n' + lines.join('\n') + '\n}';
      const done = function () { copyBtn.textContent = 'copied!'; setTimeout(function () { copyBtn.textContent = 'copy config'; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.prompt('config', text); });
      } else { window.prompt('config', text); }
    });
    actions.appendChild(newBtn); actions.appendChild(copyBtn);
    panel.appendChild(actions);

    const note = document.createElement('div'); note.className = 'note';
    note.textContent = 'Changes re-place the field with the same word. "copy config" copies a preset you can paste into js/config.js.';
    panel.appendChild(note);

    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  global.DevPanel = { mount: mount };
})(window);
