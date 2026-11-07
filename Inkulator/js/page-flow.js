(function (root) {
  "use strict";
  const GAP = 0,
    PAD = 20;
  let bar,
    expected = 0,
    cachedLayout = null,
    cachedLayoutBookId = "",
    cachedLayoutVersion = 0,
    lastUpdateState = "";
  function enabled() {
    return true;
  }
  function invalidateLayout() {
    cachedLayout = null;
    lastUpdateState = "";
  }
  function layout() {
    const book = Store.book();
    const pages = book.pages;
    if (
      cachedLayout &&
      cachedLayoutBookId === book.id &&
      cachedLayoutVersion === pages.length &&
      cachedLayout.items[0]?.page === pages[0]
    ) {
      return cachedLayout;
    }
    let width = 0;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].width > width) width = pages[i].width;
    }
    let y = 0;
    const items = new Array(pages.length);
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      items[i] = { page, index: i, x: (width - page.width) / 2, y };
      y += page.height + GAP;
    }
    cachedLayout = { items, height: y - GAP, width };
    cachedLayoutBookId = book.id;
    cachedLayoutVersion = pages.length;
    return cachedLayout;
  }
  function reanchor(index, l = layout()) {
    const state = Store.state;
    if (index === state.pageIndex || !l.items[index]) return;
    finishUI();
    l = layout();
    const old = l.items[state.pageIndex],
      next = l.items[index];
    if (!next || index === state.pageIndex) return;
    state.viewport.x += (next.x - old.x) * state.viewport.zoom;
    state.viewport.y += (next.y - old.y) * state.viewport.zoom;
    state.pageIndex = index;
    state.selection = [];
    root.TeacherGeometry?.cancel();
    Store.emit();
  }
  function finishUI() {
    root.PenKeyboard?.hide();
    root.App?.closePopover();
    root.App?.closePanel();
  }
  function visible() {
    const l = layout(),
      v = Store.state.viewport,
      active = l.items[Store.state.pageIndex],
      w = Renderer.area.clientWidth / v.zoom,
      h = Renderer.area.clientHeight / v.zoom;
    return l.items
      .map((item) => ({ ...item, x: item.x - active.x, y: item.y - active.y }))
      .filter(
        (item) =>
          item.y + item.page.height >= -v.y / v.zoom &&
          item.y <= -v.y / v.zoom + h &&
          item.x + item.page.width >= -v.x / v.zoom &&
          item.x <= -v.x / v.zoom + w,
      );
  }
  function activateAt(clientX, clientY) {
    if (!enabled()) return;
    const l = layout(),
      v = Store.state.viewport,
      a = l.items[Store.state.pageIndex],
      r = Renderer.area.getBoundingClientRect(),
      x = (clientX - r.left - v.x) / v.zoom + a.x,
      y = (clientY - r.top - v.y) / v.zoom + a.y;
    const target = l.items.find(
      (t) =>
        x >= t.x &&
        x <= t.x + t.page.width &&
        y >= t.y &&
        y <= t.y + t.page.height,
    );
    if (target) reanchor(target.index, l);
  }
  function appendUntil(bottom, record = true) {
    if (Store.state.settings.autoPages === false) return 0;
    invalidateLayout();
    let l = layout(),
      added = 0;
    const append = () => {
      while (
        l.height <= bottom &&
        Store.book().pages.length < 300 &&
        added < 10
      ) {
        const last = Store.book().pages.at(-1),
          page = Store.page();
        Object.assign(page, {
          paper: last.paper,
          width: last.width,
          height: last.height,
          showTitle: false,
        });
        Store.book().pages.push(page);
        added++;
        invalidateLayout();
        l = layout();
      }
    };
    if (l.height > bottom || Store.book().pages.length >= 300) return 0;
    if (record) Store.transaction(append);
    else {
      append();
      if (added) Store.emit();
    }
    return added;
  }
  function ensureInk(points, index) {
    if (!points || !points.length) return;
    const l = layout();
    const origin = l.items[index];
    if (!origin) return;
    const lastPoint = points[points.length - 1];
    if (lastPoint && lastPoint[1] <= origin.page.height) return;
    let maxY = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i][1] > maxY) maxY = points[i][1];
    }
    if (origin.y + maxY <= l.height) return;
    appendUntil(origin.y + maxY + 0.001, false);
  }
  function splitInk(points, index) {
    const l = layout(),
      origin = l.items[index],
      parts = [];
    if (!origin || !points.length) return parts;
    let withinOrigin = true;
    const pw = origin.page.width,
      ph = origin.page.height;
    for (let i = 0; i < points.length; i++) {
      const x = points[i][0],
        y = points[i][1];
      if (x < 0 || x > pw || y < 0 || y > ph) {
        withinOrigin = false;
        break;
      }
    }
    if (withinOrigin) {
      return [{ page: origin.page, index: origin.index, points }];
    }
    const global = points.map((p) => [
      p[0] + origin.x,
      p[1] + origin.y,
      p[2] ?? 0.5,
    ]);
    if (points.length === 1) {
      const P = global[0],
        item = l.items.find(
          (t) =>
            P[0] >= t.x &&
            P[0] <= t.x + t.page.width &&
            P[1] >= t.y &&
            (P[1] < t.y + t.page.height ||
              (t.index === l.items.length - 1 && P[1] <= t.y + t.page.height)),
        );
      if (item)
        parts.push({
          page: item.page,
          index: item.index,
          points: [[P[0] - item.x, P[1] - item.y, P[2]]],
        });
      return parts;
    }
    for (let i = 1; i < global.length; i++) {
      const A = global[i - 1],
        B = global[i],
        intervals = [];
      for (const item of l.items) {
        if (
          Math.max(A[1], B[1]) < item.y ||
          Math.min(A[1], B[1]) > item.y + item.page.height
        )
          continue;
        let low = 0,
          high = 1;
        for (let axis = 0; axis < 2; axis++) {
          const min = axis ? item.y : item.x,
            max = min + (axis ? item.page.height : item.page.width),
            delta = B[axis] - A[axis];
          if (Math.abs(delta) < 1e-10) {
            if (A[axis] < min || A[axis] > max) {
              high = -1;
              break;
            }
          } else {
            const a = (min - A[axis]) / delta,
              b = (max - A[axis]) / delta;
            low = Math.max(low, Math.min(a, b));
            high = Math.min(high, Math.max(a, b));
          }
        }
        if (high - low <= 1e-10) continue;
        const at = (t) => [
          A[0] + (B[0] - A[0]) * t - item.x,
          A[1] + (B[1] - A[1]) * t - item.y,
          A[2] + (B[2] - A[2]) * t,
        ];
        intervals.push({
          page: item.page,
          index: item.index,
          points: [at(low), at(high)],
          t: low,
        });
      }
      intervals.sort((a, b) => a.t - b.t);
      for (const piece of intervals) {
        const last = parts.at(-1),
          P = last?.points.at(-1),
          Q = piece.points[0];
        if (
          last?.index === piece.index &&
          Math.hypot(P[0] - Q[0], P[1] - Q[1]) < 1e-7
        )
          last.points.push(piece.points[1]);
        else parts.push(piece);
      }
    }
    return parts;
  }
  function moveAcross(ids, index) {
    let l = layout(),
      origin = l.items[index];
    if (!origin) return null;
    const objects = origin.page.objects.filter((o) => ids.includes(o.id));
    if (!objects.length) return null;
    appendUntil(
      origin.y +
        Math.max(...objects.map((o) => o.position.y + o.size.h / 2)) +
        0.001,
      false,
    );
    l = layout();
    let destination = null;
    for (const o of objects) {
      const x = origin.x + o.position.x + o.size.w / 2,
        y = origin.y + o.position.y + o.size.h / 2,
        target = l.items.find(
          (t) =>
            x >= t.x &&
            x <= t.x + t.page.width &&
            y >= t.y &&
            y < t.y + t.page.height,
        );
      if (!target || target.index === index) continue;
      origin.page.objects = origin.page.objects.filter((p) => p.id !== o.id);
      o.position.x += origin.x - target.x;
      o.position.y += origin.y - target.y;
      o.zIndex = target.page.objects.length;
      target.page.objects.push(o);
      destination ??= target.index;
    }
    return destination;
  }
  function selectMoved(index, ids) {
    reanchor(index);
    Store.state.selection = Store.current()
      .objects.filter((o) => ids.includes(o.id))
      .map((o) => o.id);
    Store.emit();
  }
  function settle({ extend = false } = {}) {
    if (!enabled() || root.CanvasEngine?.interacting) return;
    if (extend) {
      const l = layout(),
        v = Store.state.viewport,
        a = l.items[Store.state.pageIndex],
        margin = Math.min(200, (Renderer.area.clientHeight / v.zoom) * 0.2);
      appendUntil(a.y + (Renderer.area.clientHeight - v.y) / v.zoom + margin);
    }
    const l = layout(),
      v = Store.state.viewport,
      a = l.items[Store.state.pageIndex],
      height = Renderer.area.clientHeight;
    const scroll = Math.max(
      0,
      Math.min(
        Math.max(0, l.height * v.zoom + 2 * PAD - height),
        a.y * v.zoom + PAD - v.y,
      ),
    );
    v.y = a.y * v.zoom + PAD - scroll;
    const center = (scroll + height / 2 - PAD) / v.zoom;
    const next =
      l.items.find((t) => center < t.y + t.page.height + GAP / 2) ||
      l.items.at(-1);
    reanchor(next.index, l);
    update();
  }
  function update() {
    if (!bar) return;
    bar.hidden = !enabled();
    if (bar.hidden) return;
    const book = Store.book();
    const l = layout(),
      v = Store.state.viewport;
    const stateKey = `${Store.state.pageIndex}|${book.pages.length}|${v.x}|${v.y}|${v.zoom}|${l.height}`;
    if (stateKey === lastUpdateState) return;
    lastUpdateState = stateKey;
    const prevBtn = document.querySelector('[data-action="previous-page"]');
    if (prevBtn) prevBtn.disabled = Store.state.pageIndex === 0;
    const nextBtn = document.querySelector('[data-action="next-page"]');
    if (nextBtn)
      nextBtn.disabled = Store.state.pageIndex === book.pages.length - 1;
    bar.firstElementChild.style.height = l.height * v.zoom + 2 * PAD + "px";
    expected = Math.max(
      0,
      l.items[Store.state.pageIndex].y * v.zoom + PAD - v.y,
    );
    if (Math.abs(bar.scrollTop - expected) > 0.5) bar.scrollTop = expected;
    expected = bar.scrollTop;
  }
  function go(index) {
    if (index < 0 || index >= Store.book().pages.length) return;
    const v = { ...Store.state.viewport }, mode = Store.state.viewMode;
    finishUI();
    CanvasEngine.cancelActive();
    TeacherGeometry.cancel();
    Store.switchPage(index);
    if (enabled() && mode === "manual") {
      Store.state.viewport = { x: v.x, y: PAD, zoom: v.zoom };
      Store.state.viewMode = "manual";
      Store.emit();
    } else fit(mode || "page");
  }
  function fit(mode = "page") {
    if (!root.Renderer?.area) return;
    const area = Renderer.area, p = Store.current(), w = area.clientWidth, h = area.clientHeight;
    if (!w || !h) return;
    const z = Math.max(.1, Math.min(4, (w - 48) / p.width,
      mode === "width" ? 4 : (h - 88) / p.height));
    Store.state.viewMode = mode;
    Store.state.viewport = { x: (w - p.width*z) / 2,
      y: mode === "width" ? PAD : Math.max(PAD, (h - 48 - p.height*z) / 2), zoom: z };
    update();
    root.App?.updateZoom();
    Renderer.request();
  }
  function init() {
    bar = document.getElementById("document-scroll");
    bar.addEventListener("scroll", () => {
      if (bar.hidden || Math.abs(bar.scrollTop - expected) < 0.5) return;
      const downward = bar.scrollTop > expected;
      Store.state.viewMode = "manual";
      CanvasEngine.cancelActive();
      const l = layout(),
        v = Store.state.viewport;
      v.y = l.items[Store.state.pageIndex].y * v.zoom + PAD - bar.scrollTop;
      settle({ extend: downward });
      Renderer.request();
    });
    document.addEventListener("statechange", () => {
      invalidateLayout();
      update();
    });
    update();
  }
  root.PageFlow = {
    invalidateLayout,
    fit,
    init,
    enabled,
    layout,
    visible,
    activateAt,
    settle,
    update,
    go,
    appendUntil,
    ensureInk,
    splitInk,
    moveAcross,
    selectMoved,
  };
})(window);
