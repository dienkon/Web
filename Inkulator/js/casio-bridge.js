(function() {
  "use strict";
  const channel = "inkulator-casio-v1", token = location.hash.slice(1);
  function send(type, data = {}) {
    parent.postMessage({ channel, token, type, ...data }, "*");
  }
  function init() {
    const ui = window.emulatorUI, app = window.casioApp;
    if (!ui || !app) {
      send("error", { message: "Không khởi tạo được Casio." });
      return;
    }
    const fitCustomLcd=()=>{
      const lcd=ui.lcdScreen;
      if(!lcd||!lcd.clientWidth)return;
      const scale=Math.min((lcd.clientWidth-6)/384,(lcd.clientHeight*.86-4)/120);
      lcd.style.setProperty('--casio-custom-fit',Math.max(.05,scale));
    };
    const lcdFitObserver=new ResizeObserver(fitCustomLcd);
    lcdFitObserver.observe(ui.lcdScreen);
    fitCustomLcd();
    try {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: void 0 });
    } catch (_) {
    }
    let operation = "capture", download = true, busy = false, delivered = false;
    const capture = ui.captureLcdScreen.bind(ui);
    ui.triggerDownload = (blob) => {
      delivered = true;
      send("lcd", { blob, operation, download });
    };
    ui.captureLcdScreen = async (value = true, purpose = "capture") => {
      if (busy) return;
      busy = true;
      download = value;
      operation = purpose;
      delivered = false;
      try {
        await capture(value);
        if (delivered) ui.showToast("Ảnh LCD đã được chuyển về sổ tay.");
      } finally {
        busy = false;
        operation = "capture";
      }
    };
    ui.openAppWindow = () => send("maximize");
    const workspace=document.getElementById('emulator-workspace');
    workspace.before(ui.popupWindow);
    ui.positionPopupDisplay=()=>{
      if(!ui.isPopupOpen)return;
      ui.setPopupZoom(Math.max(.4,(document.documentElement.clientWidth-8)/384));
    };
    window.addEventListener('resize',()=>ui.positionPopupDisplay());
    ui.checkForAppUpdate = () => ui.showCustomModal("Casio ngoại tuyến", "<p>Bản Casio được đóng gói cùng sổ tay, không kiểm tra hoặc tải cập nhật qua mạng.</p><p>Nguồn: Tikz-Physics/casio-fx580vnx · " + document.documentElement.dataset.upstreamCommit + "</p>");
    const update = document.getElementById("tb-btn-update");
    if (update) {
      update.title = "Thông tin bản ngoại tuyến";
      update.querySelector("span").textContent = "Offline";
    }
    document.getElementById("tb-btn-app-mode").title = "Phóng to / thu lại cửa sổ Casio trong sổ tay";
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (e.source !== parent || !m || m.channel !== channel || m.token !== token) return;
      if (m.type === "focus") window.focus();
      if (m.type === "blur") {
        app.stopKeyRepeat();
        document.querySelectorAll(".calc-btn.active").forEach((b) => b.classList.remove("active"));
      }
      if (m.type === "insert-result") {
        const lcd = document.getElementById("lcd-screen").innerText.trim(), normal = app.osState === "NORMAL";
        const text = normal ? [app.expression, app.displayResult].filter(Boolean).join("\n= ") : lcd;
        send("result", { text: text.slice(0, 2e4), mode: app.state.modeName });
      }
      if (m.type === "insert-lcd") ui.captureLcdScreen(false, "insert");
    });
    window.addEventListener("blur", () => app.stopKeyRepeat());
    document.fonts.ready.then(()=>send("ready", { mode: app.state.modeName }));
  }
  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", init);
  else init();
})();
