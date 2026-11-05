(function (root) {
  "use strict";
  let serial = 0,
    copyToken = "",
    queue = Promise.resolve(),
    lastPasteEvent = 0;
  function markInternal() {
    copyToken = "SCRBLE-MATH-STUDIO:" + Store.uid();
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(copyToken).catch(() => {});
    return copyToken;
  }
  function insertFile(file) {
    queue = queue
      .then(() => Exporter.importImage(file))
      .catch((e) => App.toast("Không dán được ảnh: " + e.message));
    return queue;
  }
  function nativeKey() {
    const tick = lastPasteEvent;
    setTimeout(() => {
      if (
        tick === lastPasteEvent &&
        Store.state.clipboard.length &&
        !document.getElementById("dialog").open
      )
        App.pasteInternal();
    }, 220);
  }
  function editing(target) {
    return App.isEditing(target) || document.getElementById("dialog").open;
  }
  function onPaste(e) {
    const receiver = e.target.closest?.("#clipboard-receiver");
    if (editing(e.target) && !receiver) return;
    lastPasteEvent++;
    const data = e.clipboardData;
    if (!data) return;
    const images = [...data.items]
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (!images.length)
      images.push(
        ...[...data.files].filter((f) => f.type.startsWith("image/")),
      );
    if (images.length) {
      e.preventDefault();
      if (receiver) document.getElementById("dialog").close("cancel");
      images.slice(0, 8).forEach(insertFile);
      return;
    }
    const text = data.getData("text/plain");
    if (receiver) {
      e.preventDefault();
      receiver.textContent = text
        ? "Bộ nhớ đệm hiện chứa văn bản. Hãy sao chép ảnh rồi chọn Dán."
        : "Chạm giữ tại đây rồi chọn Dán.";
      return;
    }
    if (text.startsWith("SCRBLE-MATH-STUDIO:")) {
      e.preventDefault();
      if (text === copyToken && Store.state.clipboard.length)
        App.pasteInternal();
      else
        App.toast(
          "Đối tượng sao chép thuộc phiên khác. Hãy sao chép lại trong sổ tay.",
        );
      return;
    }
    if (text.trim()) {
      e.preventDefault();
      App.insertText(text.slice(0, 20000));
      return;
    }
    if (Store.state.clipboard.length) {
      e.preventDefault();
      App.pasteInternal();
    }
  }
  async function read({ imagesOnly = false } = {}) {
    try {
      if (!navigator.clipboard?.read)
        throw Error("Trình duyệt không hỗ trợ đọc ảnh từ bộ nhớ đệm.");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const mime = item.types.find((t) =>
          ["image/png", "image/jpeg", "image/webp"].includes(t),
        );
        if (mime) {
          const blob = await item.getType(mime);
          return insertFile(
            new File(
              [blob],
              "clipboard-" + ++serial + "." + mime.split("/")[1],
              { type: mime },
            ),
          );
        }
      }
      if (!imagesOnly) {
        for (const item of items)
          if (item.types.includes("text/plain")) {
            const text = await (await item.getType("text/plain")).text();
            if (text === copyToken && Store.state.clipboard.length)
              return App.pasteInternal();
            if (text.trim() && !text.startsWith("SCRBLE-MATH-STUDIO:"))
              return App.insertText(text.slice(0, 20000));
          }
        if (Store.state.clipboard.length) return App.pasteInternal();
      }
      App.toast("Bộ nhớ đệm chưa có ảnh. Sao chép ảnh hoặc chọn tệp từ máy.");
      return fallback();
    } catch (_) {
      if (!imagesOnly && Store.state.clipboard.length)
        return App.pasteInternal();
      return fallback();
    }
  }
  function fallback() {
    const pending = App.dialog(
      "Dán ảnh từ bộ nhớ đệm",
      '<p class="hint">Trình duyệt chưa cho đọc trực tiếp bộ nhớ đệm. Chạm giữ trong ô bên dưới và chọn <b>Dán</b>; hoặc chọn ảnh đã lưu trên máy.</p><div id="clipboard-receiver" contenteditable="true" role="textbox" aria-label="Vùng dán ảnh" spellcheck="false">Chạm giữ ở đây → Dán</div><button type="button" id="clipboard-file" class="primary full">Chọn ảnh trong máy</button>',
      "Đóng",
    );
    document.getElementById("clipboard-file").onclick = () => {
      document.getElementById("dialog").close("cancel");
      document.getElementById("image-file").click();
    };
    return pending;
  }
  function init() {
    document.addEventListener("paste", onPaste);
    document.addEventListener("copy", (e) => {
      if (editing(e.target) || !Store.selected().length) return;
      e.preventDefault();
      if (!copyToken) markInternal();
      e.clipboardData?.setData("text/plain", copyToken);
    });
  }
  root.ClipboardStudio = {
    init,
    read,
    onPaste,
    nativeKey,
    markInternal,
    insertFile,
  };
})(window);
