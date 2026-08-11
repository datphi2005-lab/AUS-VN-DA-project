/* ==========================================================================
   Economic Ties between Vietnam and Australia — page logic
   Charts are hand-built SVG: no external libraries, so the page runs offline
   and from file://. Colour roles come from CSS custom properties defined in
   styles.css, which is why every chart follows the theme without redrawing.
   ========================================================================== */

(function () {
  'use strict';

  var D = window.AVDATA;
  if (!D) return;

  var SRC = D.meta.sources;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------- formatting */

  function fmt(n, dp) {
    if (n === null || n === undefined) return '—';
    return n.toLocaleString('en-AU', {
      minimumFractionDigits: dp === undefined ? 0 : dp,
      maximumFractionDigits: dp === undefined ? 0 : dp
    });
  }
  function aud(n, dp) { return 'A$' + fmt(n, dp) + 'm'; }
  function pct(n, dp) { return fmt(n, dp === undefined ? 1 : dp) + '%'; }
  function signed(n, dp) { return (n > 0 ? '+' : '') + fmt(n, dp === undefined ? 1 : dp) + '%'; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ------------------------------------------------------------- tooltip */

  var tip = document.getElementById('tooltip');

  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('is-visible');
    var w = tip.offsetWidth;
    var left = Math.min(Math.max(x, w / 2 + 8), window.innerWidth - w / 2 - 8);
    tip.style.left = left + 'px';
    tip.style.top = (y - 12) + 'px';
  }
  function hideTip() { tip.classList.remove('is-visible'); }

  function tipRows(title, chipColor, rows, note) {
    var h = '<div class="tooltip__title">';
    if (chipColor) h += '<span class="legend__swatch" style="background:' + chipColor + '"></span>';
    h += title + '</div>';
    rows.forEach(function (r) {
      h += '<div class="tooltip__row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    });
    if (note) h += '<div class="tooltip__note">' + note + '</div>';
    return h;
  }

  /* Attaches hover behaviour to a mark, dimming its siblings. */
  function bindMark(node, chartRoot, contentFn) {
    function enter(ev) {
      chartRoot.classList.add('is-hovering');
      node.classList.add('is-active');
      var r = node.getBoundingClientRect();
      showTip(contentFn(), r.left + r.width / 2, r.top + window.scrollY);
    }
    function move(ev) {
      showTip(contentFn(), ev.clientX, ev.clientY + window.scrollY);
    }
    function leave() {
      chartRoot.classList.remove('is-hovering');
      node.classList.remove('is-active');
      hideTip();
    }
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mousemove', move);
    node.addEventListener('mouseleave', leave);
    node.addEventListener('focus', enter);
    node.addEventListener('blur', leave);
    node.setAttribute('tabindex', '0');
  }

  /* ---------------------------------------------------------- hero tiles */

  function heroTiles() {
    var host = document.getElementById('heroTiles');
    var d = D.derived;
    var tiles = [
      { label: 'Two-way trade, 2025', value: '30.0', unit: 'A$bn', note: 'Goods and services. Vietnam is Australia’s 13th largest export destination and 13th largest import source.', cls: 'tile--aus' },
      { label: 'Two-way investment stock', value: '2.0', unit: 'A$bn', note: 'Both directions combined, as at end December 2025.', cls: 'tile--vnm' },
      { label: 'Trade per dollar invested', value: d.trade_to_investment_ratio + '×', unit: '', note: 'Annual trade flow divided by accumulated investment stock — the central imbalance on this page.', cls: '' },
      { label: 'Vietnamese students', value: fmt(D.people_2025.items[0].value), unit: '', note: 'Australia’s 4th largest source market, up 4.3% on 2024.', cls: '' }
    ];
    tiles.forEach(function (t) {
      var n = el('div', 'tile ' + t.cls);
      n.appendChild(el('div', 'tile__label', t.label));
      var v = el('div', 'tile__value');
      v.appendChild(document.createTextNode(t.value));
      if (t.unit) v.appendChild(el('span', 'tile__unit', t.unit));
      n.appendChild(v);
      n.appendChild(el('div', 'tile__note', t.note));
      host.appendChild(n);
    });
  }

  /* ---------------------------------------------------- ratio comparison */

  function ratioChart() {
    var host = document.getElementById('ratioChart');
    var trade = D.derived.two_way_trade / 1000;
    var inv = D.headline.two_way_investment_aud_m / 1000;
    var max = trade;

    var rows = [
      { label: 'Two-way trade', sub: 'one year of flow', value: trade, cls: 'ratio__bar--trade' },
      { label: 'Two-way investment', sub: 'total accumulated stock', value: inv, cls: 'ratio__bar--inv' }
    ];

    rows.forEach(function (r) {
      var row = el('div', 'ratio__row');
      var lab = el('div', 'ratio__label');
      var b = el('b', null, r.label);
      lab.appendChild(b);
      lab.appendChild(document.createTextNode(r.sub));
      row.appendChild(lab);

      var track = el('div', 'ratio__track');
      var bar = el('div', 'ratio__bar ' + r.cls);
      bar.style.width = '0%';
      track.appendChild(bar);
      track.appendChild(el('span', 'ratio__cap', 'A$' + r.value.toFixed(1) + 'bn'));
      row.appendChild(track);
      host.appendChild(row);

      requestAnimationFrame(function () {
        bar.style.transition = 'width 0.9s cubic-bezier(0.22,1,0.36,1)';
        bar.style.width = (r.value / max * 100) + '%';
      });
    });
  }

  /* ------------------------------------------------------- trade anatomy */

  function tradeChart() {
    var host = document.getElementById('chartTrade');
    var t = D.trade_2025_abs;

    var groups = [
      { title: 'Australia → Vietnam', items: t.exports_top, color: 'var(--aus)', total: t.exports_total, dir: 'export' },
      { title: 'Vietnam → Australia', items: t.imports_top, color: 'var(--vnm)', total: t.imports_total, dir: 'import' }
    ];

    var W = 760, labelW = 210, padR = 78, rowH = 30, groupGap = 46, headH = 26;
    var plotW = W - labelW - padR;
    var max = 3700;                                   // covers the largest line (coal, 3,574.7)
    var ticks = [0, 1000, 2000, 3000];

    var H = 14;
    groups.forEach(function (g) { H += headH + g.items.length * rowH + groupGap; });
    H = H - groupGap + 30;

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Top six exports in each direction between Australia and Vietnam, 2025, in A$ million');

    var y = 14;

    // Gridlines run the full height behind everything.
    ticks.forEach(function (tk) {
      var x = labelW + tk / max * plotW;
      s.appendChild(svg('line', { x1: x, x2: x, y1: 10, y2: H - 24, class: tk === 0 ? 'axisline' : 'gridline' }));
      var lab = svg('text', { x: x, y: H - 8, class: 'tick-label tick-label--num', 'text-anchor': 'middle' });
      lab.textContent = tk === 0 ? '0' : fmt(tk);
      s.appendChild(lab);
    });
    var unit = svg('text', { x: labelW, y: H - 8, class: 'tick-label', 'text-anchor': 'start', dx: -6 });
    s.appendChild(unit);

    groups.forEach(function (g, gi) {
      var head = svg('text', { x: labelW, y: y + 12, class: 'series-label', fill: g.color });
      head.textContent = g.title;
      s.appendChild(head);

      var sub = svg('text', { x: W - padR + 66, y: y + 12, class: 'tick-label', 'text-anchor': 'end' });
      sub.textContent = 'total ' + fmt(g.total, 1);
      s.appendChild(sub);

      y += headH;

      g.items.forEach(function (item) {
        var bw = Math.max(2, item.value / max * plotW);
        var by = y + 5;
        var bh = rowH - 12;

        var lab = svg('text', { x: labelW - 12, y: by + bh / 2 + 4, class: 'cat-label', 'text-anchor': 'end' });
        lab.textContent = item.item;
        s.appendChild(lab);

        var rect = svg('rect', {
          x: labelW, y: by, width: bw, height: bh,
          rx: 4, ry: 4, fill: g.color, class: 'mark'
        });
        // Square off the baseline end so the bar is anchored, not floating.
        var cap = svg('rect', { x: labelW, y: by, width: Math.min(4, bw), height: bh, fill: g.color, class: 'mark' });
        s.appendChild(rect);
        s.appendChild(cap);

        var val = svg('text', { x: labelW + bw + 8, y: by + bh / 2 + 4, class: 'value-label' });
        val.textContent = fmt(item.value, 1);
        s.appendChild(val);

        var share = item.value / g.total * 100;
        bindMark(rect, host, function () {
          return tipRows(item.item, cssVar(gi === 0 ? '--aus' : '--vnm'), [
            ['Value', aud(item.value, 1)],
            ['Share of direction', pct(share)],
            ['Type', item.kind.charAt(0).toUpperCase() + item.kind.slice(1)]
          ], g.title + ' · ' + (item.stage === 'upstream' ? 'Upstream input' : item.stage === 'downstream' ? 'Downstream manufacture' : 'Service'));
        });

        y += rowH;
      });

      y += groupGap;
    });

    host.appendChild(s);
    unit.textContent = 'A$ million';

    buildTradeTable();
  }

  function buildTradeTable() {
    var t = D.trade_2025_abs;
    var host = document.getElementById('tblTrade');
    var tbl = el('table', 'data');
    var cap = el('caption', null, 'Top six exports in each direction, 2025 (A$ million, goods and services). Source: DFAT Vietnam country economic fact sheet.');
    tbl.appendChild(cap);

    var thead = el('thead');
    var hr = el('tr');
    ['Item', 'Direction', 'A$m', 'Share of direction', 'Value-chain position'].forEach(function (h) {
      hr.appendChild(el('th', null, h));
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    var tbody = el('tbody');
    [['Australia → Vietnam', t.exports_top, t.exports_total],
     ['Vietnam → Australia', t.imports_top, t.imports_total]].forEach(function (grp) {
      grp[1].forEach(function (item) {
        var tr = el('tr');
        tr.appendChild(el('td', null, item.item));
        tr.appendChild(el('td', null, grp[0]));
        tr.appendChild(el('td', 'num', fmt(item.value, 1)));
        tr.appendChild(el('td', 'num', pct(item.value / grp[2] * 100)));
        tr.appendChild(el('td', null, item.stage === 'upstream' ? 'Upstream input' : item.stage === 'downstream' ? 'Downstream manufacture' : 'Service'));
        tbody.appendChild(tr);
      });
    });
    tbl.appendChild(tbody);

    var tfoot = el('tfoot');
    [['Total, Australia → Vietnam', t.exports_total], ['Total, Vietnam → Australia', t.imports_total]].forEach(function (r) {
      var tr = el('tr');
      var td = el('td', null, r[0]);
      td.colSpan = 2;
      tr.appendChild(td);
      tr.appendChild(el('td', 'num', fmt(r[1], 1)));
      var blank = el('td');
      blank.colSpan = 2;
      tr.appendChild(blank);
      tfoot.appendChild(tr);
    });
    tbl.appendChild(tfoot);

    host.appendChild(tbl);
  }

  /* ------------------------------------------------- concentration (CR6) */

  function cr6Chart() {
    var host = document.getElementById('cr6');
    var d = D.derived;
    var rows = [
      { label: 'Australia → Vietnam', value: d.exports_cr6, color: 'var(--aus)' },
      { label: 'Vietnam → Australia', value: d.imports_cr6, color: 'var(--vnm)' }
    ];
    var W = 420, H = 108, labelW = 0, barH = 26, padTop = 24;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Share of each trade direction accounted for by its top six line items');

    rows.forEach(function (r, i) {
      var y = padTop + i * 46;
      var lab = svg('text', { x: 0, y: y - 6, class: 'cat-label' });
      lab.textContent = r.label;
      s.appendChild(lab);

      s.appendChild(svg('rect', { x: 0, y: y, width: W, height: barH, rx: 4, fill: 'var(--gridline)' }));
      var w = r.value / 100 * W;
      var bar = svg('rect', { x: 0, y: y, width: w, height: barH, rx: 4, fill: r.color, class: 'mark' });
      s.appendChild(bar);

      var v = svg('text', { x: w - 10, y: y + barH / 2 + 4, class: 'value-label', 'text-anchor': 'end', fill: 'var(--page)' });
      v.textContent = pct(r.value);
      s.appendChild(v);

      bindMark(bar, host, function () {
        return tipRows(r.label, cssVar(i === 0 ? '--aus' : '--vnm'), [
          ['Top six share', pct(r.value)],
          ['Remainder', pct(100 - r.value)]
        ], 'Concentration ratio of the six largest published line items.');
      });
    });

    host.appendChild(s);
  }

  /* -------------------------------------------------- composition by stage */

  function compositionChart() {
    var host = document.getElementById('composition');
    var t = D.trade_2025_abs;

    // Stage is an ordered position in the value chain, so it takes one
    // sequential ramp (light -> dark), not four categorical hues.
    var stages = [
      { key: 'upstream', label: 'Upstream inputs', fill: 'var(--seq-250)', ink: '#0b0b0b' },
      { key: 'service', label: 'Services', fill: 'var(--seq-450)', ink: '#ffffff' },
      { key: 'downstream', label: 'Downstream manufactures', fill: 'var(--seq-650)', ink: '#ffffff' }
    ];

    var rows = [
      { label: 'Australia → Vietnam', items: t.exports_top, chip: 'var(--aus)' },
      { label: 'Vietnam → Australia', items: t.imports_top, chip: 'var(--vnm)' }
    ];

    var W = 420, barH = 30, rowGap = 52, padTop = 22;
    var H = padTop + rows.length * rowGap + 6;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Composition of the top six items in each direction by value-chain stage');

    rows.forEach(function (r, ri) {
      var y = padTop + ri * rowGap;
      var total = r.items.reduce(function (a, b) { return a + b.value; }, 0);

      var lab = svg('text', { x: 0, y: y - 7, class: 'cat-label' });
      lab.textContent = r.label;
      s.appendChild(lab);

      var x = 0;
      stages.forEach(function (st) {
        var v = r.items.filter(function (i) { return i.stage === st.key; })
                       .reduce(function (a, b) { return a + b.value; }, 0);
        if (v <= 0) return;
        var w = v / total * W;
        var share = v / total * 100;

        // 2px surface gap between adjacent segments.
        var seg = svg('rect', {
          x: x, y: y, width: Math.max(1, w - 2), height: barH,
          rx: 3, fill: st.fill, class: 'mark'
        });
        s.appendChild(seg);

        if (share > 13) {
          var vl = svg('text', {
            x: x + (w - 2) / 2, y: y + barH / 2 + 4,
            class: 'value-label', 'text-anchor': 'middle', fill: st.ink
          });
          vl.textContent = Math.round(share) + '%';
          s.appendChild(vl);
        }

        bindMark(seg, host, function () {
          return tipRows(st.label, null, [
            ['Direction', r.label],
            ['Value', aud(v, 1)],
            ['Share of top six', pct(share)]
          ], 'Share of the six largest published line items, not of the direction total.');
        });

        x += w;
      });
    });

    host.appendChild(s);

    var legend = el('div', 'legend');
    legend.style.marginTop = '0.85rem';
    stages.forEach(function (st) {
      var item = el('span', 'legend__item');
      var sw = el('span', 'legend__swatch');
      sw.style.background = st.fill;
      item.appendChild(sw);
      item.appendChild(document.createTextNode(st.label));
      legend.appendChild(item);
    });
    host.appendChild(legend);
  }

  /* -------------------------------------------------- investment reversal */

  var invView = 'level';

  function investmentChart() {
    var host = document.getElementById('chartInvestment');
    host.innerHTML = '';

    var rows = D.investment_stocks.series;
    var base = rows.filter(function (r) { return r.year === 2019; })[0];

    var series = [
      { key: 'aus_in_vnm_total', label: 'Australia’s stock in Vietnam', color: 'var(--aus)', varName: '--aus' },
      { key: 'vnm_in_aus_total', label: 'Vietnam’s stock in Australia', color: 'var(--vnm)', varName: '--vnm' }
    ];

    function val(r, k) {
      return invView === 'level' ? r[k] : (r[k] / base[k] * 100);
    }

    var W = 760, H = 380, padL = 62, padR = 150, padT = 24, padB = 46;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var years = rows.map(function (r) { return r.year; });
    var xMin = 2018, xMax = 2025;

    var all = [];
    rows.forEach(function (r) { series.forEach(function (sv) { all.push(val(r, sv.key)); }); });
    var yMax = invView === 'level' ? 3200 : 160;
    var ticks = invView === 'level'
      ? [0, 800, 1600, 2400, 3200]
      : [0, 40, 80, 120, 160];

    function X(yr) { return padL + (yr - xMin) / (xMax - xMin) * plotW; }
    function Y(v) { return padT + plotH - (v / yMax) * plotH; }

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Investment stock between Australia and Vietnam across benchmark years 2018, 2019, 2022 and 2025');

    ticks.forEach(function (tk) {
      var y = Y(tk);
      s.appendChild(svg('line', { x1: padL, x2: padL + plotW, y1: y, y2: y, class: tk === 0 ? 'axisline' : 'gridline' }));
      var lab = svg('text', { x: padL - 10, y: y + 4, class: 'tick-label tick-label--num', 'text-anchor': 'end' });
      lab.textContent = invView === 'level' ? fmt(tk) : fmt(tk);
      s.appendChild(lab);
    });

    var yTitle = svg('text', { x: padL - 10, y: padT - 8, class: 'tick-label', 'text-anchor': 'end' });
    yTitle.textContent = invView === 'level' ? 'A$m' : '2019 = 100';
    s.appendChild(yTitle);

    years.forEach(function (yr) {
      var x = X(yr);
      s.appendChild(svg('line', { x1: x, x2: x, y1: padT + plotH, y2: padT + plotH + 5, class: 'axisline' }));
      var lab = svg('text', { x: x, y: padT + plotH + 20, class: 'tick-label tick-label--num', 'text-anchor': 'middle' });
      lab.textContent = yr;
      s.appendChild(lab);
    });

    // Honesty marker: the gaps between benchmark years are not observed.
    [[2019, 2022], [2022, 2025]].forEach(function (g) {
      var x1 = X(g[0]), x2 = X(g[1]);
      var note = svg('text', { x: (x1 + x2) / 2, y: padT + plotH + 36, class: 'tick-label', 'text-anchor': 'middle' });
      note.textContent = '← ' + (g[1] - g[0] - 1) + ' years not observed →';
      s.appendChild(note);
    });

    series.forEach(function (sv) {
      var pts = rows.map(function (r) { return [X(r.year), Y(val(r, sv.key))]; });
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');

      s.appendChild(svg('path', {
        d: d, fill: 'none', stroke: sv.color, 'stroke-width': 2,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': '1 0'
      }));

      rows.forEach(function (r, i) {
        var p = pts[i];
        // 2px surface ring keeps overlapping markers legible.
        s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 7, fill: 'var(--surface-1)' }));
        var dot = svg('circle', { cx: p[0], cy: p[1], r: 5, fill: sv.color, class: 'mark' });
        s.appendChild(dot);

        bindMark(dot, host, function () {
          var lvl = r[sv.key];
          var idx = lvl / base[sv.key] * 100;
          return tipRows(sv.label, cssVar(sv.varName), [
            ['Year', String(r.year)],
            ['Stock', aud(lvl)],
            ['Indexed (2019=100)', fmt(idx, 0)]
          ], r.source.map(function (id) { return SRC[id].label; }).join('; '));
        });
      });

      // Direct label at the final point, so identity is never colour-alone.
      var last = pts[pts.length - 1];
      var lbl = svg('text', { x: last[0] + 14, y: last[1] + 4, class: 'series-label', fill: sv.color });
      lbl.textContent = sv.label;
      s.appendChild(lbl);

      var lv = svg('text', { x: last[0] + 14, y: last[1] + 20, class: 'tick-label tick-label--num' });
      lv.textContent = invView === 'level'
        ? aud(rows[rows.length - 1][sv.key])
        : fmt(val(rows[rows.length - 1], sv.key), 0) + ' (2019=100)';
      s.appendChild(lv);
    });

    // Crossover annotation.
    if (invView === 'level') {
      var cx = X(2025), cyA = Y(921), cyV = Y(1104);
      s.appendChild(svg('line', {
        x1: cx - 26, x2: cx - 26, y1: cyV, y2: cyA,
        stroke: 'var(--axis)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
      }));
      var g = svg('text', { x: cx - 32, y: (cyA + cyV) / 2 + 4, class: 'annot annot--strong', 'text-anchor': 'end' });
      g.textContent = 'Vietnam ahead by A$183m';
      s.appendChild(g);
    }

    host.appendChild(s);
  }

  function investmentDeltas() {
    var host = document.getElementById('invDeltas');
    var d = D.derived;
    var items = [
      { label: 'Australia’s stock in Vietnam, 2019 → 2025', value: d.aus_stock_change_2019_2025, detail: 'A$2,927m → A$921m' },
      { label: 'Australia’s stock in Vietnam, 2022 → 2025', value: d.aus_stock_change_2022_2025, detail: 'A$1,800m → A$921m' },
      { label: 'Vietnam’s stock in Australia, 2022 → 2025', value: d.vnm_stock_change_2022_2025, detail: 'A$437m → A$1,104m' },
      { label: 'Vietnam’s stock in Australia, 2019 → 2025', value: d.vnm_stock_change_2019_2025, detail: 'A$784m → A$1,104m' }
    ];
    items.forEach(function (it) {
      var row = el('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:1rem;align-items:baseline;border-top:1px solid var(--gridline);padding-top:0.6rem';
      var left = el('div');
      left.appendChild(el('div', null, it.label)).style.cssText = 'font-size:0.84rem';
      var det = el('div', null, it.detail);
      det.style.cssText = 'font-size:0.76rem;color:var(--text-muted);font-variant-numeric:tabular-nums';
      left.appendChild(det);
      row.appendChild(left);
      var v = el('div', null, signed(it.value));
      v.style.cssText = 'font-size:1.1rem;font-weight:680;font-variant-numeric:tabular-nums;white-space:nowrap;color:' +
        (it.value >= 0 ? 'var(--success-text)' : 'var(--critical)');
      row.appendChild(v);
      host.appendChild(row);
    });
  }

  function buildInvTable() {
    var host = document.getElementById('tblInv');
    var tbl = el('table', 'data');
    tbl.appendChild(el('caption', null, 'Investment stock, benchmark years (A$ million, end December, ABS basis). "np" = not published by the ABS for confidentiality.'));
    var thead = el('thead'), hr = el('tr');
    ['Year', 'Australia in Vietnam (total)', 'of which FDI', 'Vietnam in Australia (total)', 'of which FDI', 'Two-way', 'Source'].forEach(function (h) {
      hr.appendChild(el('th', null, h));
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);
    var tbody = el('tbody');
    D.investment_stocks.series.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', 'num', String(r.year)));
      tr.appendChild(el('td', 'num', fmt(r.aus_in_vnm_total)));
      tr.appendChild(el('td', 'num', r.aus_in_vnm_fdi === null ? 'np' : fmt(r.aus_in_vnm_fdi)));
      tr.appendChild(el('td', 'num', fmt(r.vnm_in_aus_total)));
      tr.appendChild(el('td', 'num', r.vnm_in_aus_fdi === null ? 'np' : fmt(r.vnm_in_aus_fdi)));
      tr.appendChild(el('td', 'num', fmt(r.aus_in_vnm_total + r.vnm_in_aus_total)));
      var td = el('td', null, r.source.map(function (id) { return SRC[id].label; }).join('; '));
      td.style.cssText = 'white-space:normal;font-size:0.76rem;color:var(--text-muted);max-width:22ch';
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    host.appendChild(tbl);
  }

  /* --------------------------------------------------------- two ledgers */

  function ledgers() {
    var host = document.getElementById('ledgers');
    var abs = D.trade_2025_abs;
    var vn = D.trade_vietnamese_ledger;
    var vinv = D.investment_vietnamese_ledger;
    var inv25 = D.investment_stocks.series[D.investment_stocks.series.length - 1];

    var cards = [
      {
        cls: 'ledger--abs',
        flag: 'Australian ledger · DFAT / ABS',
        big: 'A$30.0bn',
        meta: 'Two-way trade in goods <strong>and services</strong>, calendar 2025.',
        rows: [
          ['Australian exports', aud(abs.exports_total, 1)],
          ['Australian imports', aud(abs.imports_total, 1)],
          ['Balance', 'Australia −' + fmt(Math.abs(D.derived.trade_balance_aus), 1) + 'm'],
          ['Australia’s stock in Vietnam', aud(inv25.aus_in_vnm_total)],
          ['Vietnam’s stock in Australia', aud(inv25.vnm_in_aus_total)]
        ]
      },
      {
        cls: 'ledger--vnm',
        flag: 'Vietnamese ledger · Customs / Ministry of Finance',
        big: 'US$14bn',
        meta: 'Two-way trade in <strong>merchandise only</strong>, 2025.',
        rows: [
          ['Vietnamese exports', 'US$' + vn.year_2025.vnm_exports_to_aus.toFixed(1) + 'bn'],
          ['Vietnamese imports', 'US$' + vn.year_2025.vnm_imports_from_aus.toFixed(1) + 'bn'],
          ['Balance', 'Vietnam −US$0.4bn'],
          ['Australian registered capital', 'US$' + fmt(vinv.aus_in_vnm_usd_m) + 'm (' + vinv.aus_in_vnm_projects + ' projects)'],
          ['Vietnamese registered capital', 'US$' + fmt(vinv.vnm_in_aus_usd_m) + 'm (' + vinv.vnm_in_aus_projects + '+ projects)']
        ]
      }
    ];

    cards.forEach(function (c) {
      var n = el('div', 'ledger ' + c.cls);
      n.appendChild(el('div', 'ledger__flag', c.flag));
      n.appendChild(el('div', 'ledger__big', c.big));
      var meta = el('div', 'ledger__meta');
      meta.innerHTML = c.meta;
      n.appendChild(meta);
      var dl = el('dl');
      c.rows.forEach(function (r) {
        var row = el('div');
        row.appendChild(el('dt', null, r[0]));
        row.appendChild(el('dd', null, r[1]));
        dl.appendChild(row);
      });
      n.appendChild(dl);
      host.appendChild(n);
    });

    document.getElementById('ledgerRatio').textContent = D.derived.ledger_ratio + '×';
  }

  /* ------------------------------------------------ Vietnam's partners */

  function partnerChart(hostId, rows, label) {
    var host = document.getElementById(hostId);
    var W = 420, rowH = 30, padT = 8, padR = 56;
    var labelW = 150;
    var plotW = W - labelW - padR;
    var max = 40;
    var H = padT + rows.length * rowH + 10;

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', label);

    rows.forEach(function (r, i) {
      var y = padT + i * rowH;
      var bh = rowH - 12;
      var w = Math.max(2, r.share / max * plotW);
      var color = r.highlight ? 'var(--aus)' : 'var(--neutral-mark)';

      var lab = svg('text', { x: labelW - 12, y: y + bh / 2 + 4, class: 'cat-label', 'text-anchor': 'end' });
      lab.textContent = r.partner;
      if (r.highlight) { lab.setAttribute('fill', 'var(--text-primary)'); lab.setAttribute('font-weight', '650'); }
      s.appendChild(lab);

      var bar = svg('rect', { x: labelW, y: y, width: w, height: bh, rx: 4, fill: color, class: 'mark' });
      s.appendChild(bar);

      var v = svg('text', { x: labelW + w + 8, y: y + bh / 2 + 4, class: 'value-label' });
      v.textContent = pct(r.share);
      if (!r.highlight) v.setAttribute('fill', 'var(--text-secondary)');
      s.appendChild(v);

      var rk = svg('text', { x: W - 4, y: y + bh / 2 + 4, class: 'tick-label tick-label--num', 'text-anchor': 'end' });
      rk.textContent = '#' + r.rank;
      s.appendChild(rk);

      bindMark(bar, host, function () {
        return tipRows(r.partner, r.highlight ? cssVar('--aus') : null, [
          ['Share', pct(r.share)],
          ['Rank', '#' + r.rank]
        ], r.highlight ? 'Australia is shown for comparison; ranks 6 to ' + (r.rank - 1) + ' are omitted.' : null);
      });
    });

    host.appendChild(s);
  }

  /* ------------------------------------------------------------- macro */

  function macroGrid() {
    var host = document.getElementById('macroGrid');
    D.vietnam_macro_2025.indicators.forEach(function (ind) {
      var cell = el('div', 'macro__cell');
      cell.appendChild(el('div', 'macro__name', ind.name));
      var v = el('div', 'macro__val');
      v.appendChild(document.createTextNode(fmt(ind.value, ind.value % 1 === 0 ? 0 : 1)));
      v.appendChild(el('span', 'macro__unit', ' ' + ind.unit.replace('US$ billion', 'US$bn').replace('% labour force', '%').replace('% yoy', '%').replace('% GDP', '% GDP')));
      cell.appendChild(v);

      var prior = el('div', 'macro__prior');
      var arrowChar = ind.direction === 'up' ? '▲' : ind.direction === 'down' ? '▼' : '—';
      // Falling debt and rising growth are both good; the arrow shows movement,
      // the label always states the direction so colour never carries it alone.
      var cls = ind.direction === 'flat' ? 'macro__arrow--flat'
              : (ind.name === 'Gross government debt' && ind.direction === 'down') ? 'macro__arrow--down'
              : ind.direction === 'up' ? 'macro__arrow--up' : 'macro__arrow--flat';
      var a = el('span', 'macro__arrow ' + cls, arrowChar);
      prior.appendChild(a);
      prior.appendChild(document.createTextNode('from ' + fmt(ind.prior, ind.prior % 1 === 0 ? 0 : 1) + ' in 2024'));
      cell.appendChild(prior);
      host.appendChild(cell);
    });
  }

  /* ------------------------------------------------------------ people */

  function peopleTiles() {
    var host = document.getElementById('peopleTiles');
    D.people_2025.items.forEach(function (it) {
      var n = el('div', 'tile');
      n.appendChild(el('div', 'tile__label', it.name));
      var v = el('div', 'tile__value', fmt(it.value));
      n.appendChild(v);
      var note = it.change_pct !== null ? signed(it.change_pct) + ' on 2024 · ' + it.rank_label : it.rank_label;
      n.appendChild(el('div', 'tile__note', note));
      host.appendChild(n);
    });
  }

  /* ----------------------------------------------------- opportunities */

  function opportunities() {
    var host = document.getElementById('oppList');
    D.opportunities.forEach(function (o, i) {
      var card = el('div', 'opp');
      var bodyId = 'opp-body-' + i;

      var btn = el('button', 'opp__btn');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-controls', bodyId);

      var name = el('div', 'opp__name');
      name.appendChild(document.createTextNode(o.sector));
      var chev = svg('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'opp__chev' });
      chev.appendChild(svg('polyline', { points: '6 9 12 15 18 9' }));
      name.appendChild(chev);
      btn.appendChild(name);
      btn.appendChild(el('div', 'opp__anchor', o.anchor));
      card.appendChild(btn);

      var body = el('div', 'opp__body');
      body.id = bodyId;
      if (i !== 0) body.hidden = true;

      [['Why it works', o.why, ''], ['The opening', o.opportunity, ''], ['The constraint', o.risk, ' opp__block--risk']]
        .forEach(function (b) {
          var blk = el('div', 'opp__block' + b[2]);
          blk.appendChild(el('h4', null, b[0]));
          blk.appendChild(el('p', null, b[1]));
          body.appendChild(blk);
        });

      var srcs = el('div', 'opp__srcs', 'Sources: ' + o.sources.map(function (id) { return SRC[id].label; }).join('; '));
      body.appendChild(srcs);
      card.appendChild(body);

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        body.hidden = open;
      });

      host.appendChild(card);
    });
  }

  /* -------------------------------------------------------- scorecard */

  function scorecard() {
    var d = D.derived;
    var host = document.getElementById('scoreGrid');

    var items = [
      {
        goal: 'EEES goal: become <strong>top-ten trading partners</strong>.',
        progress: 10 / 13 * 100,
        color: 'var(--aus)',
        verdict: 'Close — Vietnam sits 13th both ways',
        state: 'on',
        detail: 'Vietnam is Australia’s 13th largest export destination and 13th largest import source for goods and services in 2025. Three places short.'
      },
      {
        goal: 'EEES goal: <strong>double two-way investment</strong>.',
        progress: d.eees_progress_pct,
        color: 'var(--vnm)',
        verdict: 'Off track — stock is below its 2022 baseline',
        state: 'off',
        detail: 'Doubling the A$2.2bn recorded for 2022 implies A$4.4bn. The 2025 outturn is A$2.0bn — ' + pct(d.eees_progress_pct) + ' of target, and A$' + fmt(d.eees_shortfall) + 'm short.'
      },
      {
        goal: 'Joint goal: <strong>US$20bn in two-way trade</strong>.',
        progress: 14 / 20 * 100,
        color: 'var(--aqua)',
        verdict: 'On the merchandise ledger, 70% of the way',
        state: 'on',
        detail: 'Vietnamese customs recorded about US$14bn of merchandise trade in 2025. Trade in the first two months of 2026 was up 14.7% year on year, which is the pace the target needs.'
      }
    ];

    items.forEach(function (it) {
      var n = el('div', 'score__item');
      var goal = el('div', 'score__goal');
      goal.innerHTML = it.goal;
      n.appendChild(goal);

      var bar = el('div', 'score__bar');
      var fill = el('div', 'score__fill');
      fill.style.background = it.color;
      fill.style.width = '0%';
      bar.appendChild(fill);
      n.appendChild(bar);

      var v = el('div', 'score__verdict score__verdict--' + it.state);
      var icon = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      if (it.state === 'off') {
        icon.appendChild(svg('path', { d: 'M12 8v5' }));
        icon.appendChild(svg('path', { d: 'M12 17h.01' }));
        icon.appendChild(svg('circle', { cx: 12, cy: 12, r: 9 }));
      } else {
        icon.appendChild(svg('polyline', { points: '20 6 9 17 4 12' }));
      }
      v.appendChild(icon);
      v.appendChild(document.createTextNode(it.verdict));
      n.appendChild(v);

      var det = el('p', null, it.detail);
      det.style.cssText = 'font-size:0.8rem;color:var(--text-secondary);margin:0.7rem 0 0;line-height:1.5';
      n.appendChild(det);

      host.appendChild(n);
      requestAnimationFrame(function () {
        fill.style.transition = 'width 1s cubic-bezier(0.22,1,0.36,1)';
        fill.style.width = Math.min(100, it.progress) + '%';
      });
    });
  }

  /* --------------------------------------------------------- timeline */

  function timeline() {
    var host = document.getElementById('timeline');
    D.timeline.forEach(function (t) {
      var n = el('div', 'tl tl--' + t.kind);
      n.appendChild(el('div', 'tl__date', t.date));
      n.appendChild(el('div', 'tl__event', t.event));
      n.appendChild(el('p', 'tl__detail', t.detail));
      host.appendChild(n);
    });
  }

  function instruments() {
    var host = document.getElementById('instruments');
    D.policy_instruments.forEach(function (p) {
      var n = el('div', 'card');
      n.appendChild(el('div', 'card__title', p.name));
      var d = el('p', null, p.detail);
      d.style.cssText = 'font-size:0.86rem;color:var(--text-secondary);margin:0.4rem 0 0';
      n.appendChild(d);
      host.appendChild(n);
    });
  }

  /* ---------------------------------------------------------- sources */

  function sourceList() {
    var host = document.getElementById('sourceList');
    var i = 1;
    Object.keys(SRC).forEach(function (key) {
      var s = SRC[key];
      var row = el('div', 'src');
      row.appendChild(el('div', 'src__n', String(i++)));
      var body = el('div', 'src__body');
      var a = el('a', null, s.label);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      body.appendChild(a);
      body.appendChild(el('div', 'src__pub', s.publisher));
      if (s.note) body.appendChild(el('div', 'src__note', s.note));
      row.appendChild(body);
      host.appendChild(row);
    });
  }

  /* ---------------------------------------------------- inline figures */

  function inlineFigures() {
    var d = D.derived;
    var set = function (id, text) {
      var n = document.getElementById(id);
      if (n) n.textContent = text;
    };
    set('svcShare', pct(d.services_share_of_two_way));
    set('resValue', 'A$' + fmt(d.resources_value, 1) + 'm');
    set('resShare', pct(d.resources_share));
    set('eduShare', pct(d.education_share) + ' of the total');
  }

  /* -------------------------------------------------------- interaction */

  function wireControls() {
    document.querySelectorAll('[data-table-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.getAttribute('data-table-toggle'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        target.hidden = open;
        btn.textContent = open ? 'Table' : 'Hide table';
      });
    });

    document.querySelectorAll('[data-inv-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        invView = btn.getAttribute('data-inv-view');
        document.querySelectorAll('[data-inv-view]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        investmentChart();
      });
    });

    document.querySelectorAll('[data-collapse]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var body = document.getElementById(btn.getAttribute('data-collapse'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        body.hidden = open;
      });
    });
  }

  /* ------------------------------------------------ I. Introduction */

  function statusCard() {
    var r = D.relationship_status;
    var host = document.getElementById('statusCard');
    host.innerHTML =
      '<p class="card__title">Where the relationship formally stands</p>' +
      '<p class="card__sub">The diplomatic frame both economies are operating inside.</p>';

    var grid = el('div', 'tiles');
    grid.style.margin = '0';
    [
      { label: 'Partnership tier', value: 'CSP', note: r.tier + ', agreed ' + r.since + ' — Australia\'s highest partnership tier.' },
      { label: 'Action programme delivery', value: r.action_lines_complete_pct + '%', note: 'of ' + r.action_lines + ' action lines under the ' + r.programme + ', across ' + r.pillars + ' pillars.' },
      { label: 'Free trade agreements', value: '3', note: 'AANZFTA, CPTPP and RCEP — plus the bilateral Enhanced Economic Engagement Strategy. There is no standalone bilateral FTA.' },
      { label: 'Next fixed deadline', value: String(r.apec_host_year), note: 'Vietnam hosts APEC, a natural date by which deliverables are expected to land.' }
    ].forEach(function (t) {
      var n = el('div', 'tile');
      n.appendChild(el('div', 'tile__label', t.label));
      n.appendChild(el('div', 'tile__value', t.value));
      n.appendChild(el('div', 'tile__note', t.note));
      grid.appendChild(n);
    });
    host.appendChild(grid);
  }

  function rbaCard() {
    var a = D.australia_macro_2026;
    var host = document.getElementById('rbaCard');

    var rate = el('div', 'rba__rate');
    rate.appendChild(el('div', 'rba__num', a.cash_rate.toFixed(2) + '%'));
    var tag = el('div', 'rba__tag');
    tag.innerHTML = 'Cash rate, <strong>' + a.cash_rate_decision + '</strong> on ' + a.decision_date +
      '<br>after <strong>' + a.hikes_this_year + ' increases</strong> since the start of the year';
    rate.appendChild(tag);
    host.appendChild(rate);

    var ul = el('ul');
    a.points.forEach(function (p) { ul.appendChild(el('li', null, p)); });
    host.appendChild(ul);

    var note = el('p', 'figure-note', 'Source: Reserve Bank of Australia, Statement by the Monetary Policy Board, ' + a.decision_date + '.');
    note.style.marginBottom = '0';
    host.appendChild(note);
  }

  /* ------------------------------------------------- II. The pillars */

  function pillar(hostId, id) {
    var p = D.pillars.filter(function (x) { return x.id === id; })[0];
    var host = document.getElementById(hostId);

    var sop = el('div', 'sop');
    sop.appendChild(el('h4', null, 'State of play'));
    sop.appendChild(el('p', null, p.state_of_play));
    host.appendChild(sop);

    var ad = el('div', 'ad');

    var adv = el('div', 'ad__col ad__col--adv');
    adv.appendChild(el('h4', null, 'Advantages'));
    var ulA = el('ul');
    p.advantages.forEach(function (x) {
      var li = el('li');
      li.innerHTML = '<b>' + x.head + '.</b> ' + x.body;
      ulA.appendChild(li);
    });
    adv.appendChild(ulA);
    ad.appendChild(adv);

    ad.appendChild(el('div', 'ad__rule'));

    var dis = el('div', 'ad__col ad__col--dis');
    dis.appendChild(el('h4', null, 'Disadvantages'));
    var ulD = el('ul');
    p.disadvantages.forEach(function (x) {
      var li = el('li');
      li.innerHTML = '<b>' + x.head + '.</b> ' + x.body;
      ulD.appendChild(li);
    });
    dis.appendChild(ulD);
    ad.appendChild(dis);

    host.appendChild(ad);
  }

  function fdiContext() {
    var f = D.vietnam_fdi_2025;
    var host = document.getElementById('fdiContext');
    var rows = [
      ['Registered FDI, 2025', 'US$' + f.registered_total.toFixed(2) + 'bn', signed(f.registered_growth_pct)],
      ['Realised (disbursed) FDI', 'US$' + f.realised_total.toFixed(2) + 'bn', signed(f.realised_growth_pct)],
      ['Largest single source', f.top_source.economy + ' · US$' + f.top_source.value.toFixed(2) + 'bn', pct(f.top_source.share_of_new_pct) + ' of new capital'],
      ['High-tech inflow', 'US$' + f.high_tech_inflow.toFixed(1) + 'bn', signed(f.high_tech_growth_pct)],
      ['Semiconductor projects', fmt(f.semiconductor_projects) + '+', 'US$' + f.semiconductor_registered.toFixed(1) + 'bn registered']
    ];
    rows.forEach(function (r) {
      var row = el('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:1rem;align-items:baseline;border-top:1px solid var(--gridline);padding-top:0.55rem';
      var left = el('div');
      var t = el('div', null, r[0]);
      t.style.cssText = 'font-size:0.84rem;color:var(--text-secondary)';
      left.appendChild(t);
      var d = el('div', null, r[2]);
      d.style.cssText = 'font-size:0.74rem;color:var(--text-muted)';
      left.appendChild(d);
      row.appendChild(left);
      var v = el('div', null, r[1]);
      v.style.cssText = 'font-size:0.95rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--navy);text-align:right';
      row.appendChild(v);
      host.appendChild(row);
    });
    var note = el('p', 'figure-note', f.australia_rank_note + ' ' + f.realised_note);
    note.style.marginBottom = '0';
    host.appendChild(note);
  }

  function vlmaCard() {
    var v = D.labour_mobility;
    var host = document.getElementById('vlmaCard');
    host.innerHTML =
      '<p class="card__title">' + v.name + '</p>' +
      '<p class="card__sub">Implementation arrangements signed ' + v.signed +
      ' — six days before the Comprehensive Strategic Partnership was agreed.</p>';

    var grid = el('div', 'tiles');
    grid.style.margin = '0 0 1rem';
    [
      { label: 'Worker ceiling', value: fmt(v.cap), note: v.skill_levels.toLowerCase() + ' agriculture-related roles.' },
      { label: 'Maximum stay', value: v.max_years + ' yrs', note: 'Short-term and long-term placements both available.' }
    ].forEach(function (t) {
      var n = el('div', 'tile');
      n.appendChild(el('div', 'tile__label', t.label));
      n.appendChild(el('div', 'tile__value', t.value));
      n.appendChild(el('div', 'tile__note', t.note));
      grid.appendChild(n);
    });
    host.appendChild(grid);

    var dl = el('div');
    dl.style.cssText = 'display:grid;gap:0.55rem;font-size:0.84rem;color:var(--text-secondary)';
    [
      ['Sectors', v.sectors.join(', ')],
      ['Administration', v.administration],
      ['Recruitment', v.recruitment],
      ['Protections', v.protections]
    ].forEach(function (r) {
      var row = el('div');
      row.style.cssText = 'border-top:1px solid var(--gridline);padding-top:0.5rem';
      var h = el('div', null, r[0]);
      h.style.cssText = 'font-size:0.68rem;text-transform:uppercase;letter-spacing:0.09em;color:var(--text-muted);font-weight:700;margin-bottom:0.2rem';
      row.appendChild(h);
      row.appendChild(el('div', null, r[1]));
      dl.appendChild(row);
    });
    host.appendChild(dl);
  }

  /* ------------------------------------------------- III. Discussion */

  function recommendations() {
    var host = document.getElementById('recommendations');
    [['large_scale', ''], ['small_scale', ' rec-group--small']].forEach(function (g) {
      var grp = D.recommendations[g[0]];
      var wrap = el('div', 'rec-group' + g[1]);
      wrap.appendChild(el('h3', null, grp.label));
      var list = el('div', 'recs');
      grp.items.forEach(function (it) {
        var card = el('div', 'rec');
        card.appendChild(el('h4', null, it.head));
        card.appendChild(el('p', null, it.body));
        var gr = el('div', 'rec__ground');
        gr.innerHTML = '<b>Grounded in:</b> ' + it.grounded_in;
        card.appendChild(gr);
        list.appendChild(card);
      });
      wrap.appendChild(list);
      host.appendChild(wrap);
    });
  }

  function conclusion() {
    var host = document.getElementById('conclusionList');
    D.conclusion.forEach(function (p) { host.appendChild(el('p', null, p)); });
  }

  /* --------------------------------------------------- Fact check */

  function factcheck() {
    var host = document.getElementById('fcList');
    D.factcheck.forEach(function (f, i) {
      var item = el('div', 'fcitem');
      var bodyId = 'fc-body-' + i;

      var btn = el('button', 'fcitem__btn');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', bodyId);
      btn.setAttribute('data-collapse', bodyId);

      var labels = { ok: 'Verified', check: 'Check', unverified: 'Unverified' };
      btn.appendChild(el('span', 'fcbadge fcbadge--' + f.status, labels[f.status]));
      btn.appendChild(el('span', 'fcitem__claim', f.claim));
      item.appendChild(btn);

      var body = el('div', 'fcitem__body');
      body.id = bodyId;
      body.hidden = true;

      var find = el('div');
      find.appendChild(el('h5', null, 'Finding'));
      find.appendChild(el('p', null, f.finding));
      body.appendChild(find);

      var fix = el('div', 'rec-fix');
      fix.appendChild(el('h5', null, 'Suggested wording'));
      fix.appendChild(el('p', null, f.recommendation));
      body.appendChild(fix);

      item.appendChild(body);
      host.appendChild(item);
    });
  }

  /* --------------------------------------------------------------- init */

  heroTiles();

  // I. Introduction
  statusCard();
  macroGrid();
  rbaCard();

  // II. State of play
  ratioChart();
  pillar('pillarTrade', 'trade');
  tradeChart();
  cr6Chart();
  compositionChart();
  ledgers();

  pillar('pillarInvestment', 'investment');
  investmentChart();
  investmentDeltas();
  buildInvTable();
  fdiContext();

  pillar('pillarLabour', 'labour');
  vlmaCard();
  peopleTiles();
  partnerChart('chartVnExports', D.vietnam_partners_2025.export_destinations, 'Share of Vietnam’s merchandise exports by destination, 2025');
  partnerChart('chartVnImports', D.vietnam_partners_2025.import_sources, 'Share of Vietnam’s merchandise imports by source, 2025');

  // III. Discussion
  recommendations();
  opportunities();
  scorecard();
  timeline();
  instruments();

  // IV. Conclusion + apparatus
  conclusion();
  factcheck();
  sourceList();
  inlineFigures();
  wireControls();

  window.addEventListener('scroll', hideTip, { passive: true });
})();
