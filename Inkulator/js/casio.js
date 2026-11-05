(function(root) {
  "use strict";
  const channel = "inkulator-casio-v1";
  let win, frame, token, ready = false, restore = null, captureBusy = false;
  function send(type) {
    if (ready) frame.contentWindow.postMessage({ channel, token, type }, "*");
  }
  function rect(r) {
    const width = Math.min(innerWidth, Math.max(Math.min(300, innerWidth), r.width));
    const height = Math.min(innerHeight, Math.max(Math.min(260, innerHeight), r.height));
    const visibleHeight = win.classList.contains("minimized") ? 40 : height;
    Object.assign(win.style, { width: width + "px", height: height + "px", left: Math.max(0, Math.min(innerWidth - width, r.left)) + "px", top: Math.max(0, Math.min(innerHeight - visibleHeight, r.top)) + "px" });
  }
  function maximize() {
    win.classList.remove("minimized");
    if (restore) {
      rect(restore);
      restore = null;
    } else {
      restore = win.getBoundingClientRect().toJSON();
      rect({ width: innerWidth, height: innerHeight, left: 0, top: 0 });
    }
  }
  function gesture(handle, resize) {
    let start;
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button") || win.classList.contains("pinned")) return;
      e.preventDefault();
      restore = null;
      start = { x: e.clientX, y: e.clientY, r: bounds() };
      win.classList.add("adjusting");
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y, r = start.r;
      rect(resize ? { left: r.left, top: r.top, width: r.width + dx, height: r.height + dy } : { left: r.left + dx, top: r.top + dy, width: r.width, height: r.height });
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) handle.addEventListener(type, () => {
      start = null;
      win.classList.remove("adjusting");
    });
  }
  // Inline dimensions survive display:none and the minimized header's CSS height.
  function bounds() {
    return Object.fromEntries(["left", "top", "width", "height"].map(key => [key, parseFloat(win.style[key])]));
  }
  function create() {
    token = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join("");
    win = document.createElement("section");
    win.id = "casio-calculator";
    win.className = "casio-window";
    win.hidden = true;
    win.setAttribute("aria-label", "Máy tính Casio fx-580VN X");
    win.innerHTML = '<header class="casio-heading"><strong>Casio fx-580VN X</strong><nav><button data-casio="smaller" title="Thu nhỏ kích thước">−</button><button data-casio="larger" title="Tăng kích thước">+</button><button data-casio="pin" title="Ghim vị trí" aria-pressed="false">⌖</button><button data-casio="minimize" title="Thu gọn / mở lại">▁</button><button data-casio="maximize" title="Phóng to / khôi phục">⛶</button><button data-casio="close" title="Đóng">×</button></nav></header><iframe id="casio-frame" title="Casio fx-580VN X ngoại tuyến" sandbox="allow-scripts allow-downloads"></iframe><footer class="casio-footer"><button data-casio="result" title="Chèn biểu thức và kết quả vào trang">Chèn kết quả</button><button data-casio="lcd" title="Chèn ảnh màn hình Casio vào trang">Chèn ảnh LCD</button><button data-casio="tools" title="Mở công cụ tính toán và đồ thị của sổ tay">Công cụ sổ tay</button></footer><div class="casio-resize" title="Kéo để đổi kích thước" aria-label="Đổi kích thước Casio"></div>';
    document.body.append(win);
    const miniLabels={result:'=',lcd:'▣',tools:'ƒx'};
    win.querySelectorAll('button').forEach(button=>{
      button.setAttribute('aria-label',button.title);
      if(miniLabels[button.dataset.casio])button.textContent=miniLabels[button.dataset.casio];
    });
    const loading=document.createElement('div');
    loading.className='casio-loading';loading.setAttribute('role','status');loading.textContent='Đang mở Casio…';win.append(loading);
    frame = win.querySelector("iframe");
    frame.src = "vendor/casio-fx580vnx/runtime.html#" + token;
    const h = Math.min(810, innerHeight - 24), w = Math.min(innerWidth, Math.max(300, Math.min(360, h * 0.43)));
    rect({ left: innerWidth - w - 16, top: Math.min(85, innerHeight - h), width: w, height: h });
    gesture(win.querySelector("header"), false);
    gesture(win.querySelector(".casio-resize"), true);
    win.addEventListener("click", (e) => {
      const b = e.target.closest("[data-casio]");
      if (!b) return;
      switch (b.dataset.casio) {
        case "close":
          hide();
          break;
        case "pin": {
          const on = win.classList.toggle("pinned");
          b.setAttribute("aria-pressed", on);
          break;
        }
        case "minimize":
          win.classList.toggle("minimized");
          rect(bounds());
          send("blur");
          break;
        case "maximize":
          maximize();
          break;
        case "smaller":
        case "larger": {
          win.classList.remove("minimized");
          restore = null;
          const r = win.getBoundingClientRect(), f = b.dataset.casio === "larger" ? 1.12 : 0.89;
          rect({ left: r.left, top: r.top, width: r.width * f, height: r.height * f });
          break;
        }
        case "result":
          if (ready) send("insert-result");
          else App.toast("Casio đang khởi tạo.");
          break;
        case "lcd":
          if (ready) send("insert-lcd");
          else App.toast("Casio đang khởi tạo.");
          break;
        case "tools":
          tools();
          break;
      }
    });
    window.addEventListener("resize", () => {
      if (restore) rect({ left: 0, top: 0, width: innerWidth, height: innerHeight });
      else rect(bounds());
    });
    window.addEventListener("message", async (e) => {
      const m = e.data;
      if (e.source !== frame.contentWindow || !m || m.channel !== channel || m.token !== token) return;
      if (m.type === "ready") {
        ready = true;
        win.dataset.ready='true';loading.remove();
        if (!win.hidden) send("focus");
      }
      if (m.type === "error") App.toast("Không khởi tạo được Casio. Hãy giải nén đầy đủ thư mục ứng dụng.");
      if (m.type === "maximize") maximize();
      if (m.type === "result" && typeof m.text === "string" && m.text.length <= 2e4) {
        App.insertText(m.text, true);
        App.toast("Đã chèn kết quả Casio vào trang.");
      }
      if (m.type === "lcd" && m.blob instanceof Blob && m.blob.type === "image/png" && m.blob.size > 0 && m.blob.size < 5 * 1024 * 1024 && !captureBusy) {
        captureBusy = true;
        try {
          if (m.operation === "insert") {
            await Exporter.importImage(new File([m.blob], "Casio-LCD.png", { type: "image/png" }));
            App.toast("Đã chèn ảnh LCD gốc.");
          } else {
            let copied = false;
            try {
              if (navigator.clipboard && root.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": m.blob })]);
                copied = true;
              }
            } catch (_) {
            }
            if (m.download || !copied) Exporter.download(m.blob, "Casio-LCD.png", "image/png");
            App.toast(copied ? "Đã sao chép ảnh LCD." : "Đã tải ảnh LCD PNG.");
          }
        } catch (err) {
          App.toast("Ảnh LCD: " + err.message);
        } finally {
          captureBusy = false;
        }
      }
    });
  }
  function hide() {
    if (win) {
      send("blur");
      win.hidden = true;
    }
  }
  function open() {
    const old = document.getElementById("calculator");
    if (old) old.hidden = true;
    if (!win) create();
    if (!win.hidden && !win.classList.contains("minimized")) {
      hide();
      return;
    }
    win.hidden = false;
    win.classList.remove("minimized");
    rect(bounds());
    send("focus");
  }
  function tools() {
    hide();
    const old = document.getElementById("calculator");
    if (old) old.hidden = true;
    Calculator.open();
  }
  root.CasioStudio = { open, hide, tools };
})(window);
