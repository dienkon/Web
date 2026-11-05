(function (root) {
  "use strict";
  const GAP = 24,
    PAD = 20;
  let bar,
    expected = 0;
  function enabled() {
    return Store.book().pages.some((p) =>
      p.objects.some((o) => o.type === "pdf"),
    );
  }
  function layout() {
    const pages = Store.book().pages,
      width = Math.max(...pages.map((p) => p.width));
    let y = 0;
    const items = pages.map((page, index) => {
      const item = { page, index, x: (width - page.width) / 2, y };
      y += page.height + GAP;
      return item;
    });
    return { items, height: y - GAP, width };
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
  function settle() {
    if (!enabled() || root.CanvasEngine?.interacting) return;
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
    document.querySelector('[data-action="previous-page"]').disabled =
      Store.state.pageIndex === 0;
    document.querySelector('[data-action="next-page"]').disabled =
      Store.state.pageIndex === Store.book().pages.length - 1;
    if (bar.hidden) return;
    const l = layout(),
      v = Store.state.viewport;
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
    const v = { ...Store.state.viewport };
    finishUI();
    CanvasEngine.cancelActive();
    TeacherGeometry.cancel();
    Store.switchPage(index);
    if (enabled()) {
      Store.state.viewport = { x: v.x, y: PAD, zoom: v.zoom };
      Store.emit();
    }
  }
  function init() {
    bar = document.getElementById("document-scroll");
    bar.addEventListener("scroll", () => {
      if (bar.hidden || Math.abs(bar.scrollTop - expected) < 0.5) return;
      CanvasEngine.cancelActive();
      const l = layout(),
        v = Store.state.viewport;
      v.y = l.items[Store.state.pageIndex].y * v.zoom + PAD - bar.scrollTop;
      settle();
      Renderer.request();
    });
    document.addEventListener("statechange", update);
    update();
  }
  root.PageFlow = {
    init,
    enabled,
    layout,
    visible,
    activateAt,
    settle,
    update,
    go,
  };
})(window);
