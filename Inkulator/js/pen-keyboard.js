(function (root) {
  "use strict";
  let pane,
    target = null,
    mode = "math",
    caps = false,
    enabled = false,
    numberField = null,
    dirty = false;
  const numberBackups = new WeakMap();
  const editable = (el) =>
    el?.matches?.(
      "textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit])",
    ) &&
    !el.readOnly &&
    !el.disabled;
  function numeric(el) {
    if (el.type === "number") {
      numberBackups.set(el, el.value);
      el.type = "text";
      el.inputMode = "decimal";
      numberField = el;
    }
  }
  function commit() {
    if (!target?.isConnected) return;
    const wasNumber = numberField === target;
    if (wasNumber) {
      const old = numberBackups.get(target) || "",
        raw = target.value.trim().replace(",", "."),
        number = Number(raw);
      let value = raw;
      if (!raw || !Number.isFinite(number)) value = old;
      else {
        const low = target.min !== "" ? Number(target.min) : -Infinity,
          high = target.max !== "" ? Number(target.max) : Infinity;
        value = String(Math.min(high, Math.max(low, number)));
      }
      target.type = "number";
      target.value = value;
      numberField = null;
    }
    if (dirty || wasNumber)
      target.dispatchEvent(new Event("change", { bubbles: true }));
    dirty = false;
  }
  function focus(el) {
    if (target && target !== el) commit();
    target = el;
    if (el.type === "number") mode = "numbers";
    else if (/formula|graph|calc|advanced-input|math-entry/.test(el.id))
      mode = "math";
    else if (/title/.test(el.id) || ["title", "folder"].includes(el.name))
      mode = "abc";
    if (enabled || Store.state.penMode) {
      numeric(el);
      el.inputMode = "none";
    }
    render();
  }
  function show() {
    enabled = true;
    if (!pane) return;
    const current = document.activeElement,
      dialog = document.getElementById("dialog");
    if (editable(current)) focus(current);
    if (dialog.open && !dialog.contains(target)) target = null;
    if (dialog.open) {
      dialog.append(pane);
      dialog.classList.add("keyboard-open");
    } else {
      document.body.append(pane);
      dialog.classList.remove("keyboard-open");
    }
    pane.hidden = false;
    pane.classList.toggle(
      "keyboard-left",
      !dialog.open &&
        innerWidth >= 1000 &&
        !!target?.isConnected &&
        target.getBoundingClientRect().left > innerWidth / 2,
    );
    render();
    document.documentElement.style.setProperty(
      "--keyboard-height",
      pane.offsetHeight + "px",
    );
  }
  function hide({ keepEnabled = false } = {}) {
    commit();
    enabled = keepEnabled;
    pane.hidden = true;
    document.getElementById("dialog").classList.remove("keyboard-open");
    if (pane.parentElement !== document.body) document.body.append(pane);
  }
  function insert(text, back = 0) {
    if (!target?.isConnected) return App.toast("Chạm vào ô cần nhập trước.");
    numeric(target);
    const a = target.selectionStart ?? target.value.length,
      b = target.selectionEnd ?? a;
    target.setRangeText(text, a, b, "end");
    if (back)
      target.setSelectionRange(a + text.length + back, a + text.length + back);
    dirty = true;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.focus({ preventScroll: true });
  }
  function tone(mark) {
    if (!target?.isConnected) return;
    const value = target.value,
      pos = target.selectionStart ?? value.length,
      prefix = value.slice(0, pos),
      matches = [
        ...prefix.matchAll(
          /[aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ]/gi,
        ),
      ],
      last = matches.at(-1);
    if (!last) return;
    const index = last.index,
      clean = last[0]
        .normalize("NFD")
        .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, ""),
      replacement = (clean + mark).normalize("NFC");
    target.setRangeText(replacement, index, index + last[0].length, "end");
    target.setSelectionRange(
      pos + replacement.length - last[0].length,
      pos + replacement.length - last[0].length,
    );
    dirty = true;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function next() {
    commit();
    const scope = document.getElementById("dialog").open
        ? document.getElementById("dialog")
        : target?.closest("#panel,#calculator") || document,
      inputs = [...scope.querySelectorAll("input,textarea")].filter(
        (el) =>
          editable(el) && el.getClientRects().length && !pane.contains(el),
      );
    if (!inputs.length) return;
    const i = inputs.indexOf(target);
    inputs[(i + 1) % inputs.length].focus();
  }
  function special(key) {
    if (key === "close") {
      hide();
      return;
    }
    if (key === "next") {
      next();
      return;
    }
    if (key === "space") {
      insert(" ");
      return;
    }
    if (key === "newline") {
      if (target?.tagName === "TEXTAREA") insert("\n");
      else {
        commit();
        target?.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            bubbles: true,
          }),
        );
      }
      return;
    }
    if (!target?.isConnected) return;
    numeric(target);
    const a = target.selectionStart ?? target.value.length,
      b = target.selectionEnd ?? a;
    if (key === "backspace") {
      target.setRangeText("", a === b ? Math.max(0, a - 1) : a, b, "end");
      dirty = true;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (key === "selectall") {
      target.setSelectionRange(0, target.value.length);
    } else if (key === "left" || key === "right") {
      const p = Math.max(
        0,
        Math.min(target.value.length, key === "left" ? a - 1 : b + 1),
      );
      target.setSelectionRange(p, p);
    }
    target.focus({ preventScroll: true });
  }
  function entries() {
    if (mode === "abc")
      return [..."qwertyuiopasdfghjklzxcvbnm"]
        .map((x) => ({
          label: caps ? x.toUpperCase() : x,
          text: caps ? x.toUpperCase() : x,
        }))
        .concat(
          [
            ".",
            ",",
            "-",
            "_",
            "\\",
            "&",
            "%",
            "'",
            '"',
            "$",
            "#",
            "@",
            ":",
            ";",
          ].map((x) => ({ label: x, text: x })),
        );
    if (mode === "vietnamese")
      return ["ă", "â", "đ", "ê", "ô", "ơ", "ư", "a", "e", "i", "o", "u", "y"]
        .map((x) => ({
          label: caps ? x.toUpperCase() : x,
          text: caps ? x.toUpperCase() : x,
        }))
        .concat([
          { label: "Sắc ◌́", tone: "\u0301" },
          { label: "Huyền ◌̀", tone: "\u0300" },
          { label: "Hỏi ◌̉", tone: "\u0309" },
          { label: "Ngã ◌̃", tone: "\u0303" },
          { label: "Nặng ◌̣", tone: "\u0323" },
          { label: "Bỏ dấu", tone: "" },
        ]);
    const keys =
      mode === "numbers"
        ? [
            "7",
            "8",
            "9",
            "-",
            "+",
            "4",
            "5",
            "6",
            ".",
            "/",
            "1",
            "2",
            "3",
            "0",
            ",",
          ]
        : [
            "7",
            "8",
            "9",
            "/",
            "(",
            ")",
            "x",
            "y",
            "π",
            "sqrt()",
            "4",
            "5",
            "6",
            "*",
            "^",
            "^2",
            "sin(",
            "cos(",
            "tan(",
            "=",
            "1",
            "2",
            "3",
            "+",
            "-",
            "a",
            "b",
            "c",
            "{",
            "}",
            "0",
            ".",
            "<",
            ">",
            "≤",
            "≥",
            "∞",
            "[",
            "]",
            ",",
            ";",
            "i",
            "e",
            "!",
            "?",
            ":",
            "|",
            "\\frac{}{}",
            "\\int",
            "\\sum",
          ];
    return keys.map((x) => ({
      label:
        {
          "sqrt()": "√",
          "*": "×",
          "/": "÷",
          "^2": "x²",
          "\\frac{}{}": "a/b",
          "\\int": "∫",
          "\\sum": "Σ",
        }[x] || x,
      text: x,
      back: x === "sqrt()" ? -1 : x === "\\frac{}{}" ? -3 : 0,
    }));
  }
  function render() {
    if (!pane) return;
    const keys = entries();
    pane.innerHTML =
      '<div class="keyboard-heading"><span>⌨ BÀN PHÍM BÚT <small>' +
      App.escape(
        target?.isConnected
          ? target.getAttribute("aria-label") || target.name || "Ô đang nhập"
          : "Chạm một ô để nhập",
      ) +
      '</small></span><button data-keyboard-special="close" aria-label="Đóng bàn phím">×</button></div><div class="keyboard-modes">' +
      [
        ["math", "Toán"],
        ["abc", "ABC"],
        ["numbers", "123"],
        ["vietnamese", "Tiếng Việt"],
      ]
        .map(
          ([k, label]) =>
            '<button data-keyboard-mode="' +
            k +
            '" class="' +
            (mode === k ? "active" : "") +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      '<button id="keyboard-caps" class="' +
      (caps ? "active" : "") +
      '">⇧ Hoa</button></div><div class="keyboard-keys ' +
      (mode === "numbers" ? "numbers" : "") +
      '">' +
      keys
        .map(
          (key, i) =>
            '<button data-keyboard-key="' +
            i +
            '" aria-label="Nhập ' +
            App.escape(key.label) +
            '">' +
            App.escape(key.label) +
            "</button>",
        )
        .join("") +
      '</div><div class="keyboard-controls">' +
      [
        ["left", "←"],
        ["right", "→"],
        ["backspace", "⌫"],
        ["selectall", "Chọn hết"],
        ["space", "Dấu cách"],
        ["newline", "↵"],
        ["next", "Ô tiếp →"],
        ["close", "✓ Xong"],
      ]
        .map(
          ([key, label]) =>
            '<button data-keyboard-special="' +
            key +
            '">' +
            label +
            "</button>",
        )
        .join("") +
      "</div>";
    pane.querySelectorAll("[data-keyboard-key]").forEach(
      (b) =>
        (b.onclick = () => {
          const entry = keys[Number(b.dataset.keyboardKey)];
          if (entry.tone !== undefined) tone(entry.tone);
          else insert(entry.text, entry.back);
        }),
    );
    pane
      .querySelectorAll("[data-keyboard-special]")
      .forEach((b) => (b.onclick = () => special(b.dataset.keyboardSpecial)));
    pane.querySelectorAll("[data-keyboard-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          mode = b.dataset.keyboardMode;
          render();
        }),
    );
    pane.querySelector("#keyboard-caps").onclick = () => {
      caps = !caps;
      render();
    };
    if (!pane.hidden)
      document.documentElement.style.setProperty(
        "--keyboard-height",
        pane.offsetHeight + "px",
      );
  }
  function init() {
    pane = document.getElementById("pen-keyboard");
    pane.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) e.preventDefault();
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "touch" && CanvasEngine.penActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (e.pointerType === "pen") {
          Store.state.penMode = true;
          document.body.classList.add("pen-mode");
          if (editable(e.target)) e.target.inputMode = "none";
        }
        if (e.target.id === "ink-canvas" && !pane.hidden) hide();
      },
      true,
    );
    document.addEventListener("focusin", (e) => {
      if (!editable(e.target) || pane.contains(e.target)) return;
      focus(e.target);
      if (e.target.id === "calc-input" && !enabled) return;
      if (enabled || Store.state.penMode) show();
    });
    document.getElementById("dialog").addEventListener("close", () => {
      if (!pane.hidden) hide();
      target = null;
    });
    render();
  }
  root.PenKeyboard = {
    init,
    show,
    hide,
    insert,
    commit,
    get target() {
      return target;
    },
    get visible() {
      return pane && !pane.hidden;
    },
  };
})(window);
