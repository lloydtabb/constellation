/*
 * Constellation engine. Buildless, no dependencies.
 *
 *   const game = Constellation.init(config, mountEl);   // mountEl defaults to <body>
 *   game.setConfig({ skewX: 0.9 });   // re-place live with new params (same word)
 *   game.newGame();                   // pick a new word
 *
 * Every tunable lives in `config` (see DEFAULT_CONFIG). Variant pages pass a
 * partial config; the dev panel calls setConfig() to tune values on the fly.
 */
(function (global) {
  'use strict';

  // Each letter: pts on a 0-2 (x) by 0-4 (y) grid, edges = pairs of point indices.
  const DEFS = {
    A:{pts:[[1,0],[0,4],[2,4],[0.5,2.5],[1.5,2.5]],edges:[[0,1],[0,2],[3,4]]},
    B:{pts:[[0,0],[0,4],[1.8,1],[0,2],[1.8,3]],edges:[[0,1],[0,2],[2,3],[3,4],[4,1]]},
    C:{pts:[[2,0],[0,0],[0,4],[2,4]],edges:[[0,1],[1,2],[2,3]]},
    D:{pts:[[0,0],[0,4],[2,2]],edges:[[0,1],[0,2],[1,2]]},
    E:{pts:[[2,0],[0,0],[0,4],[2,4],[0,2],[1.5,2]],edges:[[0,1],[1,2],[2,3],[2,4],[4,5]]},
    F:{pts:[[2,0],[0,0],[0,4],[0,2],[1.5,2]],edges:[[0,1],[1,2],[3,4]]},
    G:{pts:[[2,0],[0,0],[0,4],[2,4],[2,2],[1,2]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
    H:{pts:[[0,0],[0,4],[2,0],[2,4],[0,2],[2,2]],edges:[[0,1],[2,3],[4,5]]},
    I:{pts:[[0,0],[2,0],[1,0],[1,4],[0,4],[2,4]],edges:[[0,1],[2,3],[4,5]]},
    J:{pts:[[0,0],[2,0],[2,3],[1,4],[0,3]],edges:[[0,1],[1,2],[2,3],[3,4]]},
    K:{pts:[[0,0],[0,4],[2,0],[0,2],[2,4]],edges:[[0,1],[2,3],[3,4]]},
    L:{pts:[[0,0],[0,4],[2,4]],edges:[[0,1],[1,2]]},
    M:{pts:[[0,4],[0,0],[1,2],[2,0],[2,4]],edges:[[0,1],[1,2],[2,3],[3,4]]},
    N:{pts:[[0,4],[0,0],[2,4],[2,0]],edges:[[0,1],[1,2],[2,3]]},
    O:{pts:[[0,0],[2,0],[2,4],[0,4]],edges:[[0,1],[1,2],[2,3],[3,0]]},
    P:{pts:[[0,0],[0,4],[2,0],[2,2],[0,2]],edges:[[0,1],[0,2],[2,3],[3,4]]},
    R:{pts:[[0,0],[0,4],[2,0],[2,2],[0,2],[2,4]],edges:[[0,1],[0,2],[2,3],[3,4],[4,5]]},
    S:{pts:[[2,0],[0,0],[0,2],[2,2],[2,4],[0,4]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
    T:{pts:[[0,0],[2,0],[1,0],[1,4]],edges:[[0,1],[2,3]]},
    U:{pts:[[0,0],[0,4],[2,4],[2,0]],edges:[[0,1],[1,2],[2,3]]},
    V:{pts:[[0,0],[1,4],[2,0]],edges:[[0,1],[1,2]]},
    W:{pts:[[0,0],[0.5,4],[1,2],[1.5,4],[2,0]],edges:[[0,1],[1,2],[2,3],[3,4]]},
    X:{pts:[[0,0],[2,4],[1,2],[0,4],[2,0]],edges:[[0,1],[3,4]]},
    Y:{pts:[[0,0],[1,2],[2,0],[1,4]],edges:[[0,1],[2,1],[1,3]]},
    Z:{pts:[[0,0],[2,0],[0,4],[2,4]],edges:[[0,1],[1,2],[2,3]]},
  };
  const ALPHABET = Object.keys(DEFS);

  const DEFAULT_CONFIG = {
    words: ['STAR','MOON','NOVA','MARS','FLUX','GUST','COMET','ORBIT','VEGA','BLAZE','STORM','NIGHT','FROST'],
    gridCols: 3,        // constellation grid columns
    gridRows: 4,        // constellation grid rows
    decoyCount: 12,     // max decoy constellations (capped to empty cells -> effectively "fill")
    noiseStars: 0,      // loose, brighter distractor stars that aren't part of any letter
    bgStars: 180,       // faint twinkling background stars
    scaleBase: 0.20,    // letter size as a fraction of min(cellW, cellH)
    scaleJitter: 6,     // extra random px added to scale
    rotate: 0.75,       // max abs rotation in radians
    skewX: 0.5,         // horizontal skew range
    skewY: 0.4,         // vertical skew range
    cellJitter: 0.3,    // how far a letter's center can wander from its cell center (fraction of cell)
    hitRadius: 30,      // tap/hover radius in px for finding a star
    margin: 10,         // keep constellations this many px inside the canvas
  };

  function ekey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

  // Transform a letter's points: scale, skew, rotate, translate to (cx,cy).
  function tx(pts, cx, cy, sc, ang, skx, sky) {
    return pts.map(function (p) {
      const x = p[0], y = p[1];
      const nx = x * sc + y * skx, ny = y * sc + x * sky;
      return [cx + nx * Math.cos(ang) - ny * Math.sin(ang), cy + nx * Math.sin(ang) + ny * Math.cos(ang)];
    });
  }

  function shuffle(arr) { return arr.slice().sort(function () { return Math.random() - 0.5; }); }

  const INNER =
    '<div id="toolbar">' +
      '<div id="word-row"></div>' +
      '<div id="btns">' +
        '<button id="reveal-btn">reveal</button>' +
        '<button id="ref-btn">A–Z ▾</button>' +
      '</div>' +
    '</div>' +
    '<div id="canvas-wrap">' +
      '<canvas id="canvas"></canvas>' +
      '<div id="ref"><div id="ref-grid"></div></div>' +
      '<div id="msg"></div>' +
    '</div>' +
    '<div id="hint">tap a star to find it · drag to connect stars</div>' +
    '<div id="new-btn-wrap"><button id="new-btn">new word ↺</button></div>';

  function init(userConfig, mount) {
    const config = Object.assign({}, DEFAULT_CONFIG, userConfig || {});
    mount = mount || document.body;

    const app = document.createElement('div');
    app.id = 'app';
    app.innerHTML = INNER;
    mount.appendChild(app);

    const canvas = app.querySelector('#canvas');
    const ctx = canvas.getContext('2d');
    const wrap = app.querySelector('#canvas-wrap');
    const wordRow = app.querySelector('#word-row');
    const msg = app.querySelector('#msg');
    const refEl = app.querySelector('#ref');
    const refGrid = app.querySelector('#ref-grid');
    const revealBtn = app.querySelector('#reveal-btn');
    const refBtn = app.querySelector('#ref-btn');
    const newBtn = app.querySelector('#new-btn');

    let W = 0, H = 0;
    let WORD = '', WORD_SET = new Set();
    let revealed = false;
    let cons = [], bgStars = [], noiseStars = [];
    let hov = null, dragging = false, dragA = null, dragB = null;
    let found = new Set();
    let touchId = null;
    let running = true;
    let msgTimer = null;
    const t0 = performance.now();

    function resize() {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = W;
      canvas.height = H;
      place();
    }

    function place() {
      if (!W || !H) return;
      cons = [];
      const cols = config.gridCols, rows = config.gridRows, cw = W / cols, ch = H / rows;
      const cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
      shuffleInPlace(cells);

      const wl = Array.from(WORD_SET);
      const maxDecoys = Math.max(0, cells.length - wl.length);
      const decoyN = Math.min(config.decoyCount, maxDecoys);
      const ex = shuffle(ALPHABET.filter(function (l) { return !WORD_SET.has(l); })).slice(0, decoyN);
      // Word letters first so the slice can never drop them; shuffled cells randomize positions.
      const all = wl.concat(ex).slice(0, cells.length);

      all.forEach(function (letter, i) {
        const col = cells[i][0], row = cells[i][1];
        const sc = Math.min(cw, ch) * config.scaleBase + Math.random() * config.scaleJitter;
        const ang = (Math.random() - 0.5) * config.rotate;
        const skx = (Math.random() - 0.5) * config.skewX;
        const sky = (Math.random() - 0.5) * config.skewY;
        // Transform around the origin, then center the bounding box on the cell.
        let placed = tx(DEFS[letter].pts, 0, 0, sc, ang, skx, sky);
        let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
        placed.forEach(function (p) {
          if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
          if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
        });
        const targetX = col * cw + cw / 2 + (Math.random() - 0.5) * cw * config.cellJitter;
        const targetY = row * ch + ch / 2 + (Math.random() - 0.5) * ch * config.cellJitter;
        let dx = targetX - (minx + maxx) / 2, dy = targetY - (miny + maxy) / 2;
        minx += dx; maxx += dx; miny += dy; maxy += dy;
        // Keep the whole constellation inside the visible canvas.
        const M = config.margin;
        if (minx < M) dx += M - minx; else if (maxx > W - M) dx += (W - M) - maxx;
        if (miny < M) dy += M - miny; else if (maxy > H - M) dy += (H - M) - maxy;
        placed = placed.map(function (p) { return [p[0] + dx, p[1] + dy]; });
        cons.push({
          letter: letter,
          stars: placed.map(function (p) { return { x: p[0], y: p[1] }; }),
          edges: DEFS[letter].edges, drawn: new Set(), done: false,
          isWord: WORD_SET.has(letter)
        });
      });

      bgStars = [];
      for (let i = 0; i < config.bgStars; i++)
        bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1, t: Math.random() * Math.PI * 2 });

      noiseStars = [];
      for (let i = 0; i < config.noiseStars; i++)
        noiseStars.push({ x: Math.random() * W, y: Math.random() * H, r: 2.4 + Math.random() * 1.6, t: Math.random() * Math.PI * 2 });
    }

    function shuffleInPlace(a) { a.sort(function () { return Math.random() - 0.5; }); }

    function getStarAt(mx, my) {
      let best = null, bestD = config.hitRadius * config.hitRadius;
      for (let ci = 0; ci < cons.length; ci++) {
        const con = cons[ci];
        if (!con.isWord) continue;
        for (let i = 0; i < con.stars.length; i++) {
          const s = con.stars[i], dx = s.x - mx, dy = s.y - my, d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = { con: con, idx: i }; }
        }
      }
      return best;
    }

    function checkDone(con) {
      if (con.done) return;
      if (con.edges.every(function (e) { return con.drawn.has(ekey(e[0], e[1])); })) {
        con.done = true; found.add(con.letter); updateTiles();
        if (found.size === WORD_SET.size) {
          wordRow.classList.add('win');
          setTimeout(function () { flash('✦ ' + WORD + ' complete! ✦', true); }, 100);
        } else flash(con.letter + ' found!');
      }
    }

    function draw(now) {
      if (!running) return;
      const t = (now - t0) * 0.001;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060818'; ctx.fillRect(0, 0, W, H);

      bgStars.forEach(function (s) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160,180,255,' + (0.08 + 0.14 * Math.sin(t * 0.8 + s.t)) + ')'; ctx.fill();
      });

      noiseStars.forEach(function (s) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150,175,255,' + (0.40 + 0.20 * Math.sin(t * 1.2 + s.t)) + ')';
        ctx.shadowBlur = 4; ctx.shadowColor = '#3a4a88'; ctx.fill(); ctx.shadowBlur = 0;
      });

      cons.forEach(function (con) {
        if (revealed) {
          con.edges.forEach(function (e) {
            const sa = con.stars[e[0]], sb = con.stars[e[1]];
            ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y);
            ctx.strokeStyle = con.isWord ? 'rgba(80,210,120,0.55)' : 'rgba(55,55,85,0.18)';
            ctx.lineWidth = 1; ctx.stroke();
          });
        }
        con.drawn.forEach(function (key) {
          const parts = key.split('-').map(Number);
          const sa = con.stars[parts[0]], sb = con.stars[parts[1]];
          const ok = con.edges.some(function (e) { return ekey(e[0], e[1]) === key; });
          ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y);
          ctx.strokeStyle = ok ? 'rgba(100,160,255,0.85)' : 'rgba(200,80,80,0.5)';
          ctx.lineWidth = 1.5; ctx.stroke();
        });
        con.stars.forEach(function (s, i) {
          const isHov = con.isWord && hov && hov.con === con && hov.idx === i;
          const isDrag = con.isWord && ((dragA && dragA.con === con && dragA.idx === i) || (dragB && dragB.con === con && dragB.idx === i));
          const lit = isHov || isDrag;
          let r, color, gb = 0, gc = 'transparent';
          if (!con.isWord) {
            r = 1.5; color = revealed ? 'rgba(75,75,105,0.35)' : 'rgba(110,125,165,0.11)';
          } else if (con.done) {
            r = 4; color = 'rgba(100,225,140,0.95)'; gb = 8; gc = '#33cc66';
          } else if (lit) {
            r = 7; color = '#eef4ff'; gb = 20; gc = '#55aaff';
          } else if (con.drawn.size > 0) {
            r = 4; color = 'rgba(100,150,255,0.9)'; gb = 6; gc = '#3355cc';
          } else {
            r = 3.5; color = 'rgba(150,175,255,0.65)';
          }
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.shadowBlur = gb; ctx.shadowColor = gc;
          ctx.fillStyle = color; ctx.fill(); ctx.shadowBlur = 0;
        });
      });

      if (dragging && dragA && dragB && dragA.con === dragB.con && dragA.idx !== dragB.idx) {
        const sa = dragA.con.stars[dragA.idx], ea = dragB.con.stars[dragB.idx];
        ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(ea.x, ea.y);
        ctx.strokeStyle = 'rgba(140,195,255,0.5)'; ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
      }
      requestAnimationFrame(draw);
    }

    function getPos(e, touch) {
      const rect = canvas.getBoundingClientRect(), sx = W / rect.width, sy = H / rect.height;
      const src = touch || e;
      return [(src.clientX - rect.left) * sx, (src.clientY - rect.top) * sy];
    }

    function endDrag() {
      if (dragging && dragA && dragB && dragA.con === dragB.con && dragA.idx !== dragB.idx) {
        dragA.con.drawn.add(ekey(dragA.idx, dragB.idx)); checkDone(dragA.con);
      }
      dragging = false; dragA = null; dragB = null;
    }

    canvas.addEventListener('mousemove', function (e) {
      const p = getPos(e); hov = getStarAt(p[0], p[1]);
      if (dragging) dragB = hov;
    });
    canvas.addEventListener('mousedown', function (e) {
      const p = getPos(e), s = getStarAt(p[0], p[1]);
      if (s) { dragging = true; dragA = s; dragB = s; }
    });
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', function () { dragging = false; dragA = null; dragB = null; hov = null; });

    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      const touch = e.changedTouches[0]; touchId = touch.identifier;
      const p = getPos(e, touch), s = getStarAt(p[0], p[1]);
      if (s) { dragging = true; dragA = s; dragB = s; }
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          const p = getPos(e, touch); hov = getStarAt(p[0], p[1]);
          if (dragging) dragB = hov;
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchend', function (e) {
      e.preventDefault(); endDrag(); hov = null; touchId = null;
    }, { passive: false });

    function buildTiles() {
      wordRow.classList.remove('win'); wordRow.innerHTML = '';
      WORD.split('').forEach(function (l) {
        const d = document.createElement('div'); d.className = 'tile'; d.dataset.letter = l; d.textContent = l;
        wordRow.appendChild(d);
      });
    }
    function updateTiles() {
      const tiles = wordRow.querySelectorAll('.tile');
      tiles.forEach(function (d) { if (found.has(d.dataset.letter)) d.classList.add('found'); });
    }
    function flash(txt, persist) {
      msg.textContent = txt; msg.style.opacity = '1';
      clearTimeout(msgTimer);
      if (!persist) msgTimer = setTimeout(function () { msg.style.opacity = '0'; }, 1800);
    }
    function toggleReveal() {
      revealed = !revealed; revealBtn.textContent = revealed ? 'hide' : 'reveal';
    }

    function buildRef() {
      refGrid.innerHTML = '';
      const S = 40, PAD = 5, SC = (S - PAD * 2) / 4;
      Object.keys(DEFS).forEach(function (letter) {
        const def = DEFS[letter];
        const cell = document.createElement('div'); cell.className = 'rc';
        const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
        const c = cv.getContext('2d');
        const sc = def.pts.map(function (p) { return [PAD + p[0] * SC, PAD + p[1] * SC]; });
        def.edges.forEach(function (e) {
          c.beginPath(); c.moveTo(sc[e[0]][0], sc[e[0]][1]); c.lineTo(sc[e[1]][0], sc[e[1]][1]);
          c.strokeStyle = 'rgba(80,120,220,0.5)'; c.lineWidth = 1; c.stroke();
        });
        sc.forEach(function (p) {
          c.beginPath(); c.arc(p[0], p[1], 2, 0, Math.PI * 2);
          c.fillStyle = '#99bbff'; c.shadowBlur = 4; c.shadowColor = '#4477ff'; c.fill(); c.shadowBlur = 0;
        });
        const lbl = document.createElement('div'); lbl.className = 'rl'; lbl.textContent = letter;
        cell.appendChild(cv); cell.appendChild(lbl); refGrid.appendChild(cell);
      });
    }

    function startRound(pickNew) {
      if (pickNew || !WORD) {
        WORD = config.words[Math.floor(Math.random() * config.words.length)];
        WORD_SET = new Set(WORD.split(''));
      }
      revealed = false; revealBtn.textContent = 'reveal';
      msg.style.opacity = '0';
      found = new Set();
      buildTiles();
      place();
    }

    // ---- public API ----
    function setConfig(partial) {
      Object.assign(config, partial || {});
      startRound(false); // same word, re-place with the new parameters
    }
    function newGame() { startRound(true); }
    function destroy() {
      running = false;
      window.removeEventListener('resize', resize);
      if (app.parentNode) app.parentNode.removeChild(app);
    }

    revealBtn.addEventListener('click', toggleReveal);
    refBtn.addEventListener('click', function () { refEl.classList.toggle('open'); });
    newBtn.addEventListener('click', newGame);
    window.addEventListener('resize', resize);

    buildRef();
    startRound(true);
    resize();
    requestAnimationFrame(draw);

    return {
      config: config,
      setConfig: setConfig,
      newGame: newGame,
      destroy: destroy,
      getWord: function () { return WORD; }
    };
  }

  global.Constellation = { init: init, DEFS: DEFS, ALPHABET: ALPHABET, DEFAULT_CONFIG: DEFAULT_CONFIG };
})(window);
