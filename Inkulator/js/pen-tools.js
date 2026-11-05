(function (root) {
  "use strict";
  function init() {
    const dock = document.getElementById("pen-dock");
    dock.innerHTML =
      '<button class="pen-dock-grip" data-action="toggle-dock" title="Thu gọn thanh bút">⋮</button>' +
      [
        ["pen", "✎", "Bút viết"],
        ["eraser", "▱", "Tẩy"],
        ["select", "↖", "Chọn / kéo hình"],
        ["pan", "✥", "Kéo trang"],
        ["lasso", "◌", "Khoanh nhiều đối tượng"],
      ]
        .map(
          ([tool, icon, title]) =>
            '<button data-action="tool" data-tool="' +
            tool +
            '" title="' +
            title +
            '" aria-label="' +
            title +
            '">' +
            icon +
            "</button>",
        )
        .join("") +
      '<span class="pen-dock-separator"></span><button data-action="paste-image" title="Dán ảnh từ bộ nhớ đệm" aria-label="Dán ảnh nhanh">▣</button><button data-action="pen-keyboard" title="Bàn phím trên màn hình" aria-label="Bàn phím bút">⌨</button><button data-action="pen-options" title="Thao tác không cần phím" aria-label="Tùy chọn thao tác bút">⋯</button>';
    document.addEventListener("statechange", update);
    dock.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) e.preventDefault();
    });
    const grip = dock.querySelector(".pen-dock-grip");
    let drag = null,
      moved = false;
    grip.onpointerdown = (e) => {
      const r = dock.getBoundingClientRect();
      drag = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        startX: e.clientX,
        startY: e.clientY,
      };
      moved = false;
      grip.setPointerCapture(e.pointerId);
    };
    grip.onpointermove = (e) => {
      if (!drag) return;
      moved =
        moved ||
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5;
      if (!moved) return;
      const a = Renderer.area.getBoundingClientRect();
      dock.style.left =
        Math.max(
          4,
          Math.min(a.width - dock.offsetWidth - 4, e.clientX - a.left - drag.x),
        ) + "px";
      dock.style.top =
        Math.max(
          4,
          Math.min(
            a.height - dock.offsetHeight - 4,
            e.clientY - a.top - drag.y,
          ),
        ) + "px";
    };
    grip.onpointerup = grip.onpointercancel = () => (drag = null);
    const clampDock = () => {
      const a = Renderer.area.getBoundingClientRect();
      for (const [prop, available, size] of [
        ["left", a.width, dock.offsetWidth],
        ["top", a.height, dock.offsetHeight],
      ]) {
        if (dock.style[prop])
          dock.style[prop] =
            Math.max(
              4,
              Math.min(available - size - 4, parseFloat(dock.style[prop])),
            ) + "px";
      }
    };
    new ResizeObserver(clampDock).observe(Renderer.area);
    grip.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true,
    );
  }
  function update() {
    document
      .querySelectorAll("#pen-dock [data-tool]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.tool === Store.state.tool),
      );
  }
  function options(anchor) {
    const s = Store.state,
      box = App.popover(
        anchor,
        '<h3>Thao tác bằng bút</h3><div class="tiny-buttons"><button data-action="select-all">Chọn tất cả</button><button data-action="finish-action">Bỏ chọn / hủy</button><button data-action="copy">Sao chép</button><button data-action="paste">Dán</button><button data-action="delete">Xóa chọn</button></div><label class="field-row"><input id="pen-multiselect" type="checkbox" ' +
          (s.multiSelect ? "checked" : "") +
          '><span>Chạm để chọn nhiều đối tượng</span></label><label class="field-row"><input id="pen-aspect" type="checkbox" ' +
          (s.aspectLocked ? "checked" : "") +
          '><span>Giữ tỷ lệ khi đổi kích thước</span></label><label class="field-row"><input id="pen-snap" type="checkbox" ' +
          (s.geometrySnap ? "checked" : "") +
          '><span>Bắt tọa độ đỉnh 0.5 / góc 15°</span></label><button class="menu-item" data-action="transform-selection">Vị trí, kích thước & xoay…</button><button class="menu-item" data-action="pen-keyboard">Bàn phím Toán / tiếng Việt</button><button class="menu-item" data-action="image">Chọn ảnh từ máy…</button>',
      );
    for (const [id, key] of [
      ["pen-multiselect", "multiSelect"],
      ["pen-aspect", "aspectLocked"],
      ["pen-snap", "geometrySnap"],
    ])
      box.querySelector("#" + id).onchange = (e) => {
        s[key] = e.target.checked;
        if (key === "multiSelect") {
          TeacherGeometry.cancel();
          App.setTool("select");
        }
        Store.emit();
      };
    const auto = document.createElement("label");
    auto.className = "field-row";
    auto.innerHTML =
      '<input id="pen-auto-pages" type="checkbox" ' +
      (s.settings.autoPages !== false ? "checked" : "") +
      "><span>Cuộn tới cuối tự thêm trang</span>";
    box.querySelector("#pen-snap").closest("label").after(auto);
    auto.querySelector("input").onchange = (e) => {
      s.settings.autoPages = e.target.checked;
      Store.save();
      Store.emit();
    };
  }
  function transform(anchor) {
    const objects = Store.selected().filter((o) => !o.locked);
    if (!objects.length)
      return App.toast("Chọn một ảnh hoặc hình trên trang trước.");
    const o = objects[0],
      box = App.popover(
        anchor || document.querySelector('[data-action="pen-options"]'),
        '<h3>Vị trí & kích thước</h3><div class="field-row"><label class="field"><span>Rộng</span><input id="transform-width" type="number" min="20" max="10000" step="1" value="' +
          Number(o.size.w.toFixed(2)) +
          '"></label><label class="field"><span>Cao</span><input id="transform-height" type="number" min="20" max="10000" step="1" value="' +
          Number(o.size.h.toFixed(2)) +
          '"></label></div><div class="field-row"><label class="field"><span>X</span><input id="transform-x" type="number" step="1" value="' +
          Number(o.position.x.toFixed(2)) +
          '"></label><label class="field"><span>Y</span><input id="transform-y" type="number" step="1" value="' +
          Number(o.position.y.toFixed(2)) +
          '"></label></div><label class="field-row"><input id="transform-ratio" type="checkbox" ' +
          (Store.state.aspectLocked ? "checked" : "") +
          '><span>Giữ tỷ lệ</span></label><div class="tiny-buttons"><button id="transform-smaller">− 10%</button><button id="transform-bigger">+ 10%</button><button id="transform-rotate-minus">↶ 15°</button><button id="transform-rotate-plus">↷ 15°</button><button id="transform-center">Đưa vào giữa vùng nhìn</button></div><button id="transform-apply" class="primary full">Áp dụng kích thước / vị trí</button>',
      );
    const w = box.querySelector("#transform-width"),
      h = box.querySelector("#transform-height");
    w.oninput = () => {
      if (box.querySelector("#transform-ratio").checked)
        h.value = Number(((Number(w.value) * o.size.h) / o.size.w).toFixed(2));
    };
    h.oninput = () => {
      if (box.querySelector("#transform-ratio").checked)
        w.value = Number(((Number(h.value) * o.size.w) / o.size.h).toFixed(2));
    };
    box.querySelector("#transform-ratio").onchange = (e) =>
      (Store.state.aspectLocked = e.target.checked);
    box.querySelector("#transform-apply").onclick = () => {
      const width = Number(w.value),
        height = Number(h.value),
        x = Number(box.querySelector("#transform-x").value),
        y = Number(box.querySelector("#transform-y").value);
      if (
        ![width, height, x, y].every(Number.isFinite) ||
        width < 20 ||
        height < 20 ||
        width > 10000 ||
        height > 10000
      )
        return App.toast("Kích thước cần từ 20 đến 10000.");
      Store.transaction(() => {
        o.size = { w: width, h: height };
        o.position = { x, y };
      });
      App.closePopover();
    };
    for (const [id, action] of [
      ["transform-smaller", "scale-down"],
      ["transform-bigger", "scale-up"],
      ["transform-rotate-minus", "rotate-left"],
      ["transform-rotate-plus", "rotate-right"],
    ])
      box.querySelector("#" + id).onclick = () => {
        App.dispatch(action, {});
        w.value = Number(o.size.w.toFixed(2));
        h.value = Number(o.size.h.toFixed(2));
      };
    box.querySelector("#transform-center").onclick = () => {
      Store.transaction(
        () => (o.position = App.insertPosition(o.size.w, o.size.h)),
      );
      box.querySelector("#transform-x").value = Number(o.position.x.toFixed(2));
      box.querySelector("#transform-y").value = Number(o.position.y.toFixed(2));
    };
  }
  root.PenTools = { init, update, options, transform };
})(window);
