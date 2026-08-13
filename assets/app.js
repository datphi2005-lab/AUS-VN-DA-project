/* ==========================================================================
   Vietnam – Australia Economic Ties — page logic

   Charts are hand-built SVG, no libraries, so the page runs offline and from
   file://. Styling follows the data-journalism conventions of the reference:
   flat fills, white gaps between marks, faint gridlines, direct labels,
   13px label type, and a source line under every figure.

   Sections are rendered independently — a removed section degrades to "absent"
   rather than throwing and taking the rest of the page with it.
   ========================================================================== */

(function () {
  'use strict';

  var D = window.AVDATA;
  if (!D) return;

  var SRC = D.meta.sources;
  var NS = 'http://www.w3.org/2000/svg';

  var AUS = '#004F9F', VNM = '#DA251D', NEU = '#C9CDD2', NEU_DK = '#848C96';

  /* ------------------------------------------------------------ helpers */

  function fmt(n, dp) {
    if (n === null || n === undefined) return '—';
    return n.toLocaleString('en-AU', {
      minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0
    });
  }
  function aud(n, dp) { return 'A$' + fmt(n, dp) + 'm'; }
  function pct(n, dp) { return fmt(n, dp === undefined ? 1 : dp) + '%'; }
  function signed(n) { return (n > 0 ? '+' : '') + fmt(n, 1) + '%'; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }
  function txt(node, s) { node.textContent = s; return node; }
  function byId(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------ tooltip */

  var tip = byId('tip');

  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('on');
    var w = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(x, w / 2 + 8), window.innerWidth - w / 2 - 8) + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tip.classList.remove('on'); }

  function tipHTML(title, rows, note) {
    var h = '<div class="tip__t">' + title + '</div>';
    rows.forEach(function (r) {
      h += '<div class="tip__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
    });
    if (note) h += '<div class="tip__n">' + note + '</div>';
    return h;
  }

  function bind(node, root, fn) {
    function enter() {
      root.classList.add('is-hover'); node.classList.add('on');
      var r = node.getBoundingClientRect();
      showTip(fn(), r.left + r.width / 2, r.top + window.scrollY);
    }
    function move(e) { showTip(fn(), e.clientX, e.clientY + window.scrollY - 8); }
    function leave() { root.classList.remove('is-hover'); node.classList.remove('on'); hideTip(); }
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mousemove', move);
    node.addEventListener('mouseleave', leave);
    node.addEventListener('focus', enter);
    node.addEventListener('blur', leave);
    node.setAttribute('tabindex', '0');
  }

  /* ================================================== FIGURE: the paradox */

  function chartParadox() {
    var host = byId('chartParadox');
    var fig = host.closest('.fig');
    var trade = D.derived.two_way_trade / 1000;
    var inv = D.headline.two_way_investment_aud_m / 1000;

    var W = 900, rowH = 84, padL = 0, padR = 150, H = rowH * 2 + 34;
    var plotW = W - padL - padR;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Two-way trade of A$30.0 billion against two-way investment stock of A$2.0 billion, 2025');

    var rows = [
      { lab: 'Two-way trade', sub: 'one year of flow, 2025', v: trade, c: AUS },
      { lab: 'Two-way investment', sub: 'every dollar accumulated to date', v: inv, c: NEU_DK }
    ];

    rows.forEach(function (r, i) {
      var y = i * rowH + 8, bh = 46;
      var w = Math.max(3, r.v / trade * plotW);

      var rect = svg('rect', { x: 0, y: y + 16, width: w, height: bh, fill: r.c, class: 'mark' });
      s.appendChild(rect);

      s.appendChild(txt(svg('text', { x: 0, y: y + 8, class: 'cat' }), r.lab));
      s.appendChild(txt(svg('text', { x: w + 14, y: y + 16 + bh / 2 + 6, class: 'val' }),
                        'A$' + r.v.toFixed(1) + 'bn'));
      s.appendChild(txt(svg('text', { x: w + 14, y: y + 16 + bh / 2 + 24, class: 'tick' }), r.sub));

      bind(rect, fig, function () {
        return tipHTML(r.lab, [['Value', 'A$' + r.v.toFixed(1) + 'bn'],
                               ['Share of trade', pct(r.v / trade * 100)]], r.sub);
      });
    });

    host.appendChild(s);
  }

  /* ================================================ FIGURE: trade anatomy */

  function chartTrade() {
    var host = byId('chartTrade');
    var fig = host.closest('.fig');
    var t = D.trade_2025_abs;

    var groups = [
      { title: 'Australia to Vietnam', items: t.exports_top, c: AUS, total: t.exports_total },
      { title: 'Vietnam to Australia', items: t.imports_top, c: VNM, total: t.imports_total }
    ];

    var W = 1100, gapX = 70, colW = (W - gapX) / 2;
    var labelW = 172, padR = 62, rowH = 40, headH = 34;
    var plotW = colW - labelW - padR;
    var max = 3700, ticks = [0, 1000, 2000, 3000];
    var H = headH + 6 * rowH + 30;

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Top six exports in each direction between Australia and Vietnam, 2025, A$ million');

    groups.forEach(function (g, gi) {
      var ox = gi * (colW + gapX);

      var head = txt(svg('text', { x: ox, y: 14, class: 'serieslab', fill: g.c }), g.title);
      s.appendChild(head);
      s.appendChild(txt(svg('text', { x: ox + colW - padR + 56, y: 14, class: 'tick', 'text-anchor': 'end' }),
                        'total ' + fmt(g.total, 1)));

      ticks.forEach(function (tk) {
        var x = ox + labelW + tk / max * plotW;
        s.appendChild(svg('line', {
          x1: x, x2: x, y1: headH - 6, y2: headH + 6 * rowH - 4,
          class: tk === 0 ? 'axisline' : 'gridline'
        }));
        s.appendChild(txt(svg('text', { x: x, y: H - 10, class: 'tick tick--num', 'text-anchor': 'middle' }),
                          tk === 0 ? '0' : fmt(tk)));
      });

      g.items.forEach(function (item, i) {
        var y = headH + i * rowH;
        var bh = rowH - 14;
        var w = Math.max(2, item.value / max * plotW);

        s.appendChild(txt(svg('text', { x: ox + labelW - 12, y: y + bh / 2 + 5, class: 'cat', 'text-anchor': 'end' }),
                          item.item));

        var rect = svg('rect', { x: ox + labelW, y: y, width: w, height: bh, fill: g.c, class: 'mark' });
        s.appendChild(rect);

        s.appendChild(txt(svg('text', { x: ox + labelW + w + 9, y: y + bh / 2 + 5, class: 'val' }),
                          fmt(item.value, 1)));

        var stage = item.stage === 'upstream' ? 'Upstream input'
                  : item.stage === 'downstream' ? 'Downstream manufacture' : 'Service';
        bind(rect, fig, function () {
          return tipHTML(item.item, [
            ['Value', aud(item.value, 1)],
            ['Share of direction', pct(item.value / g.total * 100)]
          ], g.title + ' · ' + stage);
        });
      });
    });

    s.appendChild(txt(svg('text', { x: 0, y: H - 10, class: 'tick' }), 'A$ million'));
    host.appendChild(s);
    tradeTable();
  }

  function tradeTable() {
    var t = D.trade_2025_abs, host = byId('tblTrade');
    if (!host) return;
    var tbl = el('table', 'data');
    tbl.appendChild(el('caption', null,
      'Top six exports in each direction, 2025 (A$ million, goods and services). Source: DFAT Vietnam country economic fact sheet.'));
    var thead = el('thead'), hr = el('tr');
    ['Item', 'Direction', 'A$m', 'Share', 'Value-chain position'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr); tbl.appendChild(thead);
    var tb = el('tbody');
    [['Australia to Vietnam', t.exports_top, t.exports_total],
     ['Vietnam to Australia', t.imports_top, t.imports_total]].forEach(function (grp) {
      grp[1].forEach(function (it) {
        var tr = el('tr');
        tr.appendChild(el('td', null, it.item));
        tr.appendChild(el('td', null, grp[0]));
        tr.appendChild(el('td', 'num', fmt(it.value, 1)));
        tr.appendChild(el('td', 'num', pct(it.value / grp[2] * 100)));
        tr.appendChild(el('td', null, it.stage === 'upstream' ? 'Upstream input'
          : it.stage === 'downstream' ? 'Downstream manufacture' : 'Service'));
        tb.appendChild(tr);
      });
    });
    tbl.appendChild(tb);
    host.appendChild(tbl);
  }

  /* ================================================== FIGURE: concentration */

  function chartConc() {
    var host = byId('chartConc');
    var fig = host.closest('.fig');
    var d = D.derived;
    var rows = [
      { lab: 'Australia to Vietnam', v: d.exports_cr6, c: AUS },
      { lab: 'Vietnam to Australia', v: d.imports_cr6, c: VNM }
    ];

    var W = 900, rowH = 68, H = rows.length * rowH + 8;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Share of each trade direction carried by its six largest line items');

    rows.forEach(function (r, i) {
      var y = i * rowH + 6, bh = 34;
      s.appendChild(txt(svg('text', { x: 0, y: y + 10, class: 'cat' }), r.lab));
      s.appendChild(svg('rect', { x: 0, y: y + 18, width: W, height: bh, fill: '#F0F0EE' }));
      var w = r.v / 100 * W;
      var rect = svg('rect', { x: 0, y: y + 18, width: w, height: bh, fill: r.c, class: 'mark' });
      s.appendChild(rect);
      s.appendChild(txt(svg('text', { x: w - 12, y: y + 18 + bh / 2 + 5, class: 'val val--inv', 'text-anchor': 'end' }),
                        pct(r.v)));
      s.appendChild(txt(svg('text', { x: w + 12, y: y + 18 + bh / 2 + 5, class: 'tick' }),
                        'remaining ' + pct(100 - r.v)));
      bind(rect, fig, function () {
        return tipHTML(r.lab, [['Top six', pct(r.v)], ['All other items', pct(100 - r.v)]],
                       'Concentration ratio of the six largest published line items.');
      });
    });
    host.appendChild(s);
  }

  /* ================================================ FIGURE: the reversal */

  function chartInv() {
    var host = byId('chartInv');
    var fig = host.closest('.fig');
    var rows = D.investment_stocks.series;

    var series = [
      { k: 'aus_in_vnm_total', lab: 'Australia’s stock in Vietnam', c: AUS },
      { k: 'vnm_in_aus_total', lab: 'Vietnam’s stock in Australia', c: VNM }
    ];

    var W = 1100, H = 470, padL = 54, padR = 260, padT = 20, padB = 62;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var xMin = 2018, xMax = 2025, yMax = 3200;
    var ticks = [0, 800, 1600, 2400, 3200];

    function X(y) { return padL + (y - xMin) / (xMax - xMin) * plotW; }
    function Y(v) { return padT + plotH - v / yMax * plotH; }

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Investment stock between Australia and Vietnam in 2018, 2019, 2022 and 2025');

    ticks.forEach(function (tk) {
      var y = Y(tk);
      s.appendChild(svg('line', { x1: padL, x2: padL + plotW, y1: y, y2: y, class: tk === 0 ? 'axisline' : 'gridline' }));
      s.appendChild(txt(svg('text', { x: padL - 10, y: y + 4, class: 'tick tick--num', 'text-anchor': 'end' }), fmt(tk)));
    });
    // The unit lives in the figure subtitle, not floating in the plot — placing
    // it here collided with the topmost tick label.

    rows.forEach(function (r) {
      var x = X(r.year);
      s.appendChild(txt(svg('text', { x: x, y: padT + plotH + 26, class: 'tick tick--num', 'text-anchor': 'middle' }), r.year));
    });

    [[2019, 2022], [2022, 2025]].forEach(function (g) {
      var mid = (X(g[0]) + X(g[1])) / 2;
      s.appendChild(txt(svg('text', { x: mid, y: padT + plotH + 46, class: 'tick', 'text-anchor': 'middle' }),
                        (g[1] - g[0] - 1) + ' years not observed'));
    });

    series.forEach(function (sv) {
      var pts = rows.map(function (r) { return [X(r.year), Y(r[sv.k])]; });
      s.appendChild(svg('path', {
        d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' '),
        fill: 'none', stroke: sv.c, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }));

      rows.forEach(function (r, i) {
        var p = pts[i];
        s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 7, fill: '#fff' }));
        var dot = svg('circle', { cx: p[0], cy: p[1], r: 4.5, fill: sv.c, class: 'mark' });
        s.appendChild(dot);
        bind(dot, fig, function () {
          return tipHTML(sv.lab, [['Year', String(r.year)], ['Stock', aud(r[sv.k])]],
            r.source.map(function (id) { return SRC[id].label; }).join('; '));
        });
      });
    });

    // End labels, pushed apart — the two series finish only A$183m apart.
    var last = rows[rows.length - 1];
    [[series[0], last.aus_in_vnm_total, Y(last.aus_in_vnm_total) + 46],
     [series[1], last.vnm_in_aus_total, Y(last.vnm_in_aus_total) - 30]].forEach(function (e) {
      var sv = e[0], v = e[1], ly = e[2];
      var lx = X(2025) + 18;
      s.appendChild(svg('path', {
        d: 'M' + (X(2025) + 7) + ' ' + Y(v) + ' L' + (lx - 4) + ' ' + ly,
        fill: 'none', stroke: sv.c, 'stroke-width': 1
      }));
      s.appendChild(txt(svg('text', { x: lx, y: ly, class: 'serieslab', fill: sv.c }), sv.lab));
      s.appendChild(txt(svg('text', { x: lx, y: ly + 17, class: 'tick tick--num' }), aud(v)));
    });

    // The crossover is the point of the chart.
    var cx = X(2024.55), ya = Y(last.aus_in_vnm_total), yv = Y(last.vnm_in_aus_total);
    s.appendChild(svg('line', { x1: cx, x2: cx, y1: yv, y2: ya, stroke: '#171717', 'stroke-width': 1 }));
    s.appendChild(svg('path', {
      d: 'M' + cx + ' ' + (yv + 4) + ' L' + (cx - 3.5) + ' ' + (yv + 10) + ' L' + (cx + 3.5) + ' ' + (yv + 10) + ' Z', fill: '#171717'
    }));
    s.appendChild(svg('path', {
      d: 'M' + cx + ' ' + (ya - 4) + ' L' + (cx - 3.5) + ' ' + (ya - 10) + ' L' + (cx + 3.5) + ' ' + (ya - 10) + ' Z', fill: '#171717'
    }));
    // Park the callout in the empty upper-right of the plot and run a leader
    // down to the gap — at this scale the two 2025 points are too close to
    // label in place without sitting on the lines.
    var ax = X(2023.15), ay = Y(2320);
    s.appendChild(svg('path', {
      d: 'M' + ax + ' ' + (ay + 12) + ' Q' + (cx - 34) + ' ' + (ay + 90) + ' ' + (cx - 5) + ' ' + ((ya + yv) / 2),
      fill: 'none', stroke: '#171717', 'stroke-width': 1
    }));
    s.appendChild(txt(svg('text', { x: ax, y: ay - 4, class: 'annot annot--b' }),
                      'Vietnam overtakes Australia'));
    s.appendChild(txt(svg('text', { x: ax, y: ay + 13, class: 'annot' }),
                      'ahead by A$183m in 2025'));

    host.appendChild(s);
    invTable();
  }

  function invTable() {
    var host = byId('tblInv');
    if (!host) return;
    var tbl = el('table', 'data');
    tbl.appendChild(el('caption', null,
      'Investment stock, benchmark years (A$ million, end December, ABS basis). "np" = not published by the ABS for confidentiality.'));
    var thead = el('thead'), hr = el('tr');
    ['Year', 'Australia in Vietnam', 'of which FDI', 'Vietnam in Australia', 'of which FDI', 'Two-way'].forEach(function (h) {
      hr.appendChild(el('th', null, h));
    });
    thead.appendChild(hr); tbl.appendChild(thead);
    var tb = el('tbody');
    D.investment_stocks.series.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', 'num', String(r.year)));
      tr.appendChild(el('td', 'num', fmt(r.aus_in_vnm_total)));
      tr.appendChild(el('td', 'num', r.aus_in_vnm_fdi === null ? 'np' : fmt(r.aus_in_vnm_fdi)));
      tr.appendChild(el('td', 'num', fmt(r.vnm_in_aus_total)));
      tr.appendChild(el('td', 'num', r.vnm_in_aus_fdi === null ? 'np' : fmt(r.vnm_in_aus_fdi)));
      tr.appendChild(el('td', 'num', fmt(r.aus_in_vnm_total + r.vnm_in_aus_total)));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    host.appendChild(tbl);
  }

  /* ================================================== FIGURE: partners */

  function chartPartners() {
    var host = byId('chartPartners');
    var fig = host.closest('.fig');
    var p = D.vietnam_partners_2025;

    var panels = [
      { title: 'Where Vietnam’s exports go', rows: p.export_destinations },
      { title: 'Where Vietnam’s imports come from', rows: p.import_sources }
    ];

    var W = 1100, gapX = 80, colW = (W - gapX) / 2;
    var labelW = 176, padR = 74, rowH = 36, headH = 30;
    var plotW = colW - labelW - padR, max = 42;
    var H = headH + 6 * rowH + 10;

    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    s.setAttribute('aria-label', 'Vietnam’s top five trading partners in each direction, with Australia shown for comparison');

    panels.forEach(function (pan, pi) {
      var ox = pi * (colW + gapX);
      s.appendChild(txt(svg('text', { x: ox, y: 12, class: 'serieslab', fill: '#171717' }), pan.title));

      pan.rows.forEach(function (r, i) {
        var y = headH + i * rowH, bh = rowH - 14;
        var w = Math.max(2, r.share / max * plotW);
        var hi = !!r.highlight;

        var lab = txt(svg('text', { x: ox + labelW - 12, y: y + bh / 2 + 5, class: 'cat', 'text-anchor': 'end' }), r.partner);
        if (hi) { lab.setAttribute('fill', '#171717'); lab.setAttribute('font-weight', '700'); }
        s.appendChild(lab);

        var rect = svg('rect', { x: ox + labelW, y: y, width: w, height: bh, fill: hi ? AUS : NEU, class: 'mark' });
        s.appendChild(rect);

        var v = txt(svg('text', { x: ox + labelW + w + 9, y: y + bh / 2 + 5, class: 'val' }), pct(r.share));
        if (!hi) v.setAttribute('fill', '#5A5A5A');
        s.appendChild(v);

        s.appendChild(txt(svg('text', {
          x: ox + colW - padR + 62, y: y + bh / 2 + 5, class: 'tick tick--num', 'text-anchor': 'end'
        }), '#' + r.rank));

        bind(rect, fig, function () {
          return tipHTML(r.partner, [['Share', pct(r.share)], ['Rank', '#' + r.rank]],
            hi ? 'Ranks 6 to ' + (r.rank - 1) + ' are omitted.' : null);
        });
      });
    });

    host.appendChild(s);
  }

  /* ===================================================== DOM: stat strips */

  function statStrip(host, items) {
    items.forEach(function (t) {
      var n = el('div', 'stat');
      var v = el('div', 'stat__val');
      v.appendChild(document.createTextNode(t.value));
      if (t.unit) v.appendChild(el('small', null, ' ' + t.unit));
      n.appendChild(v);
      n.appendChild(el('div', 'stat__lab', t.label));
      if (t.note) n.appendChild(el('div', 'stat__note', t.note));
      host.appendChild(n);
    });
  }

  function macroStats() {
    var host = byId('macroStats');
    // DFAT publishes all six of these to one decimal — keep that precision
    // rather than letting 8.0 render as "8".
    statStrip(host, D.vietnam_macro_2025.indicators.map(function (i) {
      var arrow = i.direction === 'up' ? '▲' : i.direction === 'down' ? '▼' : '—';
      return {
        value: fmt(i.value, 1),
        unit: i.unit.replace('US$ billion', 'US$bn').replace('% labour force', '%').replace('% yoy', '%'),
        label: i.name,
        note: arrow + ' from ' + fmt(i.prior, 1) + ' in 2024'
      };
    }));
  }

  function peopleStats() {
    var host = byId('peopleStats');
    statStrip(host, D.people_2025.items.map(function (i) {
      return {
        value: fmt(i.value), unit: '', label: i.name,
        note: i.change_pct !== null ? signed(i.change_pct) + ' on 2024 · ' + i.rank_label : i.rank_label
      };
    }));
  }

  function invDeltas() {
    var host = byId('invDeltas');
    var d = D.derived;
    statStrip(host, [
      { value: signed(d.aus_stock_change_2019_2025), unit: '', label: 'Australia in Vietnam, 2019 → 2025', note: 'A$2,927m → A$921m' },
      { value: signed(d.vnm_stock_change_2022_2025), unit: '', label: 'Vietnam in Australia, 2022 → 2025', note: 'A$437m → A$1,104m' },
      { value: 'US$27.6bn', unit: '', label: 'Vietnam’s realised FDI, 2025', note: 'Highest in five years. Australia is not among the leading sources.' },
      { value: '2.06×', unit: '', label: 'Hanoi’s figure vs Canberra’s', note: 'Registered capital versus balance-of-payments stock.' }
    ]);
    var vals = host.querySelectorAll('.stat__val');
    if (vals[0]) vals[0].style.color = VNM;
    if (vals[1]) vals[1].style.color = AUS;
  }

  /* ========================================================== DOM: prose */

  function rbaBody() {
    var a = D.australia_macro_2026, host = byId('rbaBody');
    var p1 = el('p');
    p1.innerHTML = 'The Reserve Bank held the cash rate at <strong>' + a.cash_rate.toFixed(2) +
      '%</strong> on ' + a.decision_date + ', after <strong>' + a.hikes_this_year +
      ' increases</strong> since the start of the year. Inflation picked up materially through the ' +
      'second half of 2025 and headline inflation is still too high.';
    host.appendChild(p1);
    var p2 = el('p', null, a.points[2] + ' ' + a.points[4] + ' ' + a.points[7]);
    host.appendChild(p2);
    var p3 = el('p');
    p3.innerHTML = '<span style="font-size:.82rem;color:var(--ink-3)">Source: Reserve Bank of Australia, ' +
      'Statement by the Monetary Policy Board, ' + a.decision_date + '.</span>';
    host.appendChild(p3);
  }

  function vlmaBody() {
    var v = D.labour_mobility, host = byId('vlmaBody');
    var p1 = el('p');
    p1.innerHTML = 'Labour mobility was institutionalised through the <strong>' + v.name +
      '</strong>, signed ' + v.signed + ' — six days before the Comprehensive Strategic Partnership. ' +
      'It supports up to <strong>' + fmt(v.cap) + ' Vietnamese workers</strong> in ' +
      v.skill_levels.toLowerCase() + ' roles for up to <strong>' + v.max_years + ' years</strong>, across ' +
      v.sectors.join(', ').toLowerCase() + '.';
    host.appendChild(p1);
    var p2 = el('p', null, v.administration + ' ' + v.protections);
    host.appendChild(p2);
    var p3 = el('p');
    p3.innerHTML = 'A thousand-worker ceiling is symbolically significant and economically marginal: ' +
      'set against 36,595 students and a 326,630-strong Vietnamese-born community, it is the ' +
      'smallest of the people flows by two orders of magnitude.';
    host.appendChild(p3);
  }

  function pillar(hostId, id) {
    var p = D.pillars.filter(function (x) { return x.id === id; })[0];
    var host = byId(hostId);

    var sop = el('div', 'sop');
    sop.appendChild(el('div', 'sop__h', 'State of play'));
    sop.appendChild(el('p', null, p.state_of_play));
    host.appendChild(sop);

    var ad = el('div', 'ad');
    [['Advantages', p.advantages, 'plus'], ['Disadvantages', p.disadvantages, 'minus']].forEach(function (side) {
      var col = el('div');
      col.appendChild(el('h4', 'ad__h ad__h--' + side[2], side[0]));
      var ul = el('ul');
      side[1].forEach(function (x) {
        var li = el('li');
        li.innerHTML = '<b>' + x.head + '</b>' + x.body;
        ul.appendChild(li);
      });
      col.appendChild(ul);
      ad.appendChild(col);
    });
    host.appendChild(ad);
  }

  function ledgers() {
    var host = byId('ledgers');
    var abs = D.trade_2025_abs, vn = D.trade_vietnamese_ledger, vinv = D.investment_vietnamese_ledger;
    var i25 = D.investment_stocks.series[D.investment_stocks.series.length - 1];

    [{
      cls: 'ledger--a', label: 'Australian ledger · DFAT / ABS', fig: 'A$30.0bn',
      meta: 'Two-way trade in goods <strong>and services</strong>, calendar 2025.',
      rows: [['Australian exports', aud(abs.exports_total, 1)],
             ['Australian imports', aud(abs.imports_total, 1)],
             ['Balance', 'Australia −A$' + fmt(Math.abs(D.derived.trade_balance_aus), 1) + 'm'],
             ['Australia’s stock in Vietnam', aud(i25.aus_in_vnm_total)],
             ['Vietnam’s stock in Australia', aud(i25.vnm_in_aus_total)]]
    }, {
      cls: 'ledger--v', label: 'Vietnamese ledger · Customs / MoF', fig: 'US$14bn',
      meta: 'Two-way trade in <strong>merchandise only</strong>, 2025.',
      rows: [['Vietnamese exports', 'US$' + vn.year_2025.vnm_exports_to_aus.toFixed(1) + 'bn'],
             ['Vietnamese imports', 'US$' + vn.year_2025.vnm_imports_from_aus.toFixed(1) + 'bn'],
             ['Balance', 'Vietnam −US$0.4bn'],
             ['Australian registered capital', 'US$' + fmt(vinv.aus_in_vnm_usd_m) + 'm'],
             ['Vietnamese registered capital', 'US$' + fmt(vinv.vnm_in_aus_usd_m) + 'm']]
    }].forEach(function (c) {
      var n = el('div', 'ledger ' + c.cls);
      n.appendChild(el('div', 'ledger__label', c.label));
      n.appendChild(el('div', 'ledger__fig', c.fig));
      var m = el('div', 'ledger__meta'); m.innerHTML = c.meta; n.appendChild(m);
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

    var lr = byId('ledgerRatio');
    if (lr) lr.textContent = D.derived.ledger_ratio + '×';
  }

  function score() {
    var d = D.derived, host = byId('score');
    [{
      g: 'Become top-ten trading partners', prog: 10 / 13 * 100, c: AUS, state: 'on',
      v: 'Close — three places short',
      d: 'Vietnam is Australia’s 13th largest export destination and 13th largest import source for goods and services in 2025.'
    }, {
      g: 'Double two-way investment', prog: d.eees_progress_pct, c: VNM, state: 'off',
      v: 'Off track — below its own baseline',
      d: 'Doubling the A$2.2bn recorded for 2022 implies A$4.4bn. The 2025 outturn is A$2.0bn — ' +
         pct(d.eees_progress_pct) + ' of target, and A$' + fmt(d.eees_shortfall) + 'm short.'
    }, {
      g: 'Reach US$20bn in two-way trade', prog: 14 / 20 * 100, c: NEU_DK, state: 'on',
      v: '70% of the way on the merchandise ledger',
      d: 'Vietnamese customs recorded about US$14bn in 2025. Trade in the first two months of 2026 was up 14.7% year on year.'
    }].forEach(function (it) {
      var n = el('div', 'score__i');
      n.appendChild(el('div', 'score__g', it.g));
      n.appendChild(el('div', 'score__d', it.d));
      var tr = el('div', 'score__track');
      var f = el('div', 'score__fill');
      f.style.background = it.c; f.style.width = '0%';
      tr.appendChild(f); n.appendChild(tr);
      n.appendChild(el('div', 'score__v score__v--' + it.state, it.v));
      host.appendChild(n);
      requestAnimationFrame(function () {
        f.style.transition = 'width .9s cubic-bezier(.22,1,.36,1)';
        f.style.width = Math.min(100, it.prog) + '%';
      });
    });
  }

  function recs() {
    var host = byId('recs');
    // Keep the two scales the outline distinguishes — the numbering is only
    // meaningful inside a group, not across the whole set of eight.
    var n = 0;
    [D.recommendations.large_scale, D.recommendations.small_scale].forEach(function (grp, gi) {
      var head = el('h4', 'recs__group', grp.label);
      head.style.cssText = 'grid-column:1/-1;font-family:var(--sans);font-size:.72rem;font-weight:700;' +
        'letter-spacing:.12em;text-transform:uppercase;color:' + (gi ? VNM : AUS) +
        ';padding:' + (gi ? '1.75rem' : '1.1rem') + ' 0 .5rem;border-top:' +
        (gi ? '1px solid var(--rule)' : '0') + ';margin-top:' + (gi ? '.5rem' : '0') + ';';
      host.appendChild(head);

      grp.items.forEach(function (it) {
        n += 1;
        var c = el('div', 'rec');
        c.appendChild(el('div', 'rec__n', String(n).padStart(2, '0')));
        c.appendChild(el('h4', null, it.head));
        c.appendChild(el('p', null, it.body));
        var g = el('div', 'rec__g');
        g.innerHTML = '<b>Grounded in:</b> ' + it.grounded_in;
        c.appendChild(g);
        host.appendChild(c);
      });
    });
  }

  function timeline() {
    var host = byId('timeline');
    D.timeline.forEach(function (t) {
      var key = t.kind === 'milestone' || t.kind === 'horizon';
      var n = el('div', 'tl__i' + (key ? ' tl__i--key' : ''));
      n.appendChild(el('div', 'tl__d', t.date));
      var b = el('div');
      b.appendChild(el('div', 'tl__e', t.event));
      b.appendChild(el('div', 'tl__x', t.detail));
      n.appendChild(b);
      host.appendChild(n);
    });
  }

  function conclusion() {
    var host = byId('conclusion');
    D.conclusion.forEach(function (p, i) {
      var n = el('p', null, p);
      if (i === D.conclusion.length - 1) { n.style.fontWeight = '700'; n.style.color = 'var(--ink)'; }
      host.appendChild(n);
    });
  }

  /* ======================================================= DOM: apparatus */

  var LIC = {
    'cc-by-4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'cc-by-sa-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'cc-by-sa-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/'
  };

  function credits() {
    var list = D.credits || [];
    if (!list.length) return;
    var bySlug = {};
    list.forEach(function (c) { bySlug[c.slug] = c; });

    [].forEach.call(document.querySelectorAll('[data-credit]'), function (n) {
      var c = bySlug[n.getAttribute('data-credit')];
      if (!c) return;
      var href = LIC[c.licence_code];
      n.innerHTML = (c.author ? c.author + ' · ' : '') +
        (href ? '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + c.licence + '</a>' : c.licence) +
        ' · <a href="' + c.page + '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>';
    });

    var host = byId('credits');
    if (!host) return;
    list.forEach(function (c) {
      var n = el('div', 'credit');
      n.innerHTML = '<b>' + c.file + '</b>' + (c.author ? c.author + '<br>' : '') + c.licence +
        '<br><a href="' + c.page + '" target="_blank" rel="noopener noreferrer">Source</a>';
      host.appendChild(n);
    });
  }

  function sources() {
    var host = byId('sources');
    var i = 1;
    Object.keys(SRC).forEach(function (k) {
      var s = SRC[k];
      var row = el('div', 'src');
      row.appendChild(el('div', 'src__n', String(i++)));
      var b = el('div');
      var a = el('a', null, s.label);
      a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      b.appendChild(a);
      b.appendChild(el('div', 'src__p', s.publisher));
      row.appendChild(b);
      host.appendChild(row);
    });
  }

  function inlineFigures() {
    var d = D.derived;
    var set = function (id, v) { var n = byId(id); if (n) n.textContent = v; };
    set('pullRatio', d.trade_to_investment_ratio + '×');
    set('coalShare', pct(d.coal_share));
    set('resValue', 'A$' + fmt(d.resources_value, 1) + 'm');
    set('resShare', pct(d.resources_share));
    set('eduShare', pct(d.education_share));
    set('crAus', pct(d.exports_cr6));
    set('crVnm', pct(d.imports_cr6));
  }

  function controls() {
    [].forEach.call(document.querySelectorAll('[data-table]'), function (btn) {
      btn.addEventListener('click', function () {
        var t = byId(btn.getAttribute('data-table'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        t.hidden = open;
        btn.textContent = open ? 'Show table' : 'Hide table';
      });
    });
  }

  /* ---------------------------------------------------------------- init */

  function safe(name, fn) {
    try { fn(); }
    catch (e) {
      if (window.console && console.warn) console.warn('[av] "' + name + '" skipped:', e && e.message);
    }
  }

  safe('paradox', chartParadox);
  safe('macroStats', macroStats);
  safe('rbaBody', rbaBody);
  safe('trade', chartTrade);
  safe('conc', chartConc);
  safe('ledgers', ledgers);
  safe('inv', chartInv);
  safe('invDeltas', invDeltas);
  safe('pillarInvestment', function () { pillar('pillarInvestment', 'investment'); });
  safe('peopleStats', peopleStats);
  safe('vlmaBody', vlmaBody);
  safe('pillarLabour', function () { pillar('pillarLabour', 'labour'); });
  safe('partners', chartPartners);
  safe('score', score);
  safe('recs', recs);
  safe('timeline', timeline);
  safe('conclusion', conclusion);
  safe('credits', credits);
  safe('sources', sources);
  safe('inlineFigures', inlineFigures);
  safe('controls', controls);

  /* A viewBox scales type down with the chart, so on a phone a 1100-unit
     figure would render 13px labels at about 4px. Give every figure a minimum
     width and let its container scroll instead — the label stays legible and
     the page body still never scrolls sideways. */
  safe('chartFloor', function () {
    [].forEach.call(document.querySelectorAll('.fig svg'), function (s) {
      var vb = s.viewBox.baseVal;
      if (vb && vb.width) s.style.minWidth = Math.min(vb.width, 820) + 'px';
    });
  });

  // Drop nav links whose section is absent from this build.
  [].forEach.call(document.querySelectorAll('.masthead__nav a[href^="#"]'), function (a) {
    if (!byId(a.getAttribute('href').slice(1))) a.remove();
  });

  window.addEventListener('scroll', hideTip, { passive: true });
})();
