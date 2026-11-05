/* Render only the visible PDF regions at the actual device-pixel scale. */
(function (root) {
  "use strict";
  const SIDE = 1024,
    BUDGET = 24 * 1024 * 1024,
    cache = new Map(),
    infos = new Map(),
    loading = new Map(),
    jobs = new Map(),
    wanted = new Set();
  let queue = [],
    active = 0,
    pixels = 0,
    rendered = 0,
    canceled = 0;
  function prefix(o) {
    return (
      Store.book().id +
      "|" +
      o.data.assetId +
      ":" +
      o.data.pageNumber +
      ":" +
      o.data.pageRotation
    );
  }
  function report(e) {
    if (e.name !== "RenderingCancelledException")
      App.toast("PDF: " + e.message, 6000);
  }
  function info(o) {
    const key = prefix(o),
      rotation = o.data.pageRotation,
      pageNumber = o.data.pageNumber;
    if (infos.has(key)) return infos.get(key);
    if (!loading.has(key)) {
      const task = PDFStudio.getDocument(o)
        .then((doc) => doc.getPage(pageNumber))
        .then((page) => {
          const v = page.getViewport({ scale: 1, rotation }),
            result = { width: v.width, height: v.height };
          infos.set(key, result);
          if (infos.size > 300) infos.delete(infos.keys().next().value);
          Renderer.request();
          return result;
        })
        .catch(report)
        .finally(() => loading.delete(key));
      loading.set(key, task);
    }
    return null;
  }
  function trim() {
    while (pixels > BUDGET && cache.size) {
      // Keep every visible region usable on very large displays; evict regions
      // outside the viewport first instead of repeatedly redrawing visible tiles.
      const key = [...cache.keys()].find((k) => !wanted.has(k));
      if (key === undefined) break;
      const c = cache.get(key);
      pixels -= c.width * c.height;
      cache.delete(key);
      c.width = c.height = 1;
    }
  }
  async function run(job) {
    active++;
    const c = document.createElement("canvas");
    try {
      if (job.book !== Store.book().id || job.canceled) return;
      const doc = await PDFStudio.getDocument(job.object),
        page = await doc.getPage(job.object.data.pageNumber);
      if (job.canceled) return;
      const viewport = page.getViewport({
        scale: job.scale,
        rotation: job.rotation,
      });
      c.width = Math.min(SIDE + 2, Math.ceil(viewport.width) - job.x);
      c.height = Math.min(SIDE + 2, Math.ceil(viewport.height) - job.y);
      if (c.width < 1 || c.height < 1) return;
      job.task = page.render({
        canvasContext: c.getContext("2d"),
        viewport,
        transform: [1, 0, 0, 1, -job.x, -job.y],
        background: "#ffffff",
      });
      await job.task.promise;
      if (job.canceled) return;
      cache.set(job.key, c);
      pixels += c.width * c.height;
      rendered++;
      trim();
      Renderer.request();
    } catch (e) {
      if (!job.canceled) report(e);
    } finally {
      if (!cache.has(job.key)) c.width = c.height = 1;
      jobs.delete(job.key);
      active--;
      drain();
      Renderer.request();
    }
  }
  function drain() {
    queue.sort((a, b) => a.priority - b.priority);
    while (active < 2 && queue.length) {
      const job = queue.shift();
      if (!job.canceled) run(job);
    }
  }
  function enqueue(job) {
    if (jobs.has(job.key)) return;
    jobs.set(job.key, job);
    queue.push(job);
  }
  function draw(ctx, o) {
    const source = info(o);
    if (!source) return;
    const m = ctx.getTransform(),
      inv = m.inverse(),
      corners = [
        [0, 0],
        [ctx.canvas.width, 0],
        [0, ctx.canvas.height],
        [ctx.canvas.width, ctx.canvas.height],
      ].map(([x, y]) => inv.transformPoint({ x, y }));
    const left = Math.max(0, Math.min(...corners.map((p) => p.x))),
      top = Math.max(0, Math.min(...corners.map((p) => p.y))),
      right = Math.min(o.size.w, Math.max(...corners.map((p) => p.x))),
      bottom = Math.min(o.size.h, Math.max(...corners.map((p) => p.y)));
    if (right <= left || bottom <= top) return;
    const ratio = Math.max(
        (Math.hypot(m.a, m.b) * o.size.w) / source.width,
        (Math.hypot(m.c, m.d) * o.size.h) / source.height,
      ),
      step = 2 ** Math.floor(Math.log2(ratio)) / 8,
      scale = Math.ceil(ratio / step) * step,
      width = source.width * scale,
      height = source.height * scale,
      keyPrefix = prefix(o) + "|" + scale + "|";
    const x0 = Math.floor(((left / o.size.w) * width) / SIDE),
      y0 = Math.floor(((top / o.size.h) * height) / SIDE),
      x1 = Math.min(
        Math.ceil(width / SIDE) - 1,
        Math.floor(((right / o.size.w) * width) / SIDE),
      ),
      y1 = Math.min(
        Math.ceil(height / SIDE) - 1,
        Math.floor(((bottom / o.size.h) * height) / SIDE),
      );
    for (let row = y0; row <= y1; row++)
      for (let col = x0; col <= x1; col++) {
        const key = keyPrefix + col + "," + row,
          x = col * SIDE,
          y = row * SIDE;
        wanted.add(key);
        const c = cache.get(key);
        if (c) {
          cache.delete(key);
          cache.set(key, c);
          ctx.drawImage(
            c,
            (x / width) * o.size.w,
            (y / height) * o.size.h,
            (c.width / width) * o.size.w,
            (c.height / height) * o.size.h,
          );
        } else
          enqueue({
            key,
            x,
            y,
            scale,
            rotation: o.data.pageRotation,
            object: o,
            book: Store.book().id,
            priority: Math.hypot(col - (x0 + x1) / 2, row - (y0 + y1) / 2),
          });
      }
  }
  function beginFrame() {
    wanted.clear();
  }
  function endFrame() {
    for (const job of jobs.values())
      if (!wanted.has(job.key)) {
        job.canceled = true;
        job.task?.cancel();
        canceled++;
        if (queue.includes(job)) jobs.delete(job.key);
      }
    queue = queue.filter((j) => !j.canceled);
    drain();
  }
  function stats() {
    return {
      active,
      queued: queue.length,
      pixels,
      rendered,
      canceled,
      keys: [...cache.keys()],
    };
  }
  root.PDFTiles = { draw, beginFrame, endFrame, stats };
})(window);
