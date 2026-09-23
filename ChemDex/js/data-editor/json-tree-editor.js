/**
 * ChemDex Data Editor - Generic Recursive JSON Tree Editor (Visual Mode)
 */
import { state } from "./state.js";
import {
  getType,
  escapeHtml,
  sanitizeHtml,
  showConfirmModal,
  showPromptModal,
  deepClone,
} from "./utils.js";

const CHEM_SYMBOLS = ["₂", "₃", "₄", "⁺", "⁻", "→", "⇌", "↑", "↓", "°C", "Å"];

export class JsonTreeEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.collapsedPaths = new Set(); // tracks collapsed object/array paths
  }

  render(symbol) {
    if (!this.container) return;
    this.container.innerHTML = "";

    if (!symbol) {
      this.container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <i class="fa-solid fa-hand-pointer text-4xl mb-3 text-slate-500"></i>
          <p class="font-medium text-base text-slate-300">Chọn một nguyên tố từ Bảng Tuần Hoàn</p>
          <p class="text-xs text-slate-500 mt-1">Bấm vào bất kỳ ô nguyên tố nào để xem và chỉnh sửa dữ liệu JSON.</p>
        </div>
      `;
      return;
    }

    const workingData = state.getWorkingCopy(symbol);
    if (!workingData) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-400">
          <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-400"></i>
          <p class="text-sm">Đang tải dữ liệu của ${escapeHtml(symbol)}...</p>
        </div>
      `;
      return;
    }

    const rootWrapper = document.createElement("div");
    rootWrapper.className = "json-tree-container space-y-2 p-1";

    // Build the tree nodes recursively
    this.renderObjectFields(rootWrapper, workingData, [], symbol);

    this.container.appendChild(rootWrapper);
  }

  /**
   * Helper: navigates path in an object and returns parent reference and last key
   */
  resolvePath(rootObj, path) {
    let current = rootObj;
    for (let i = 0; i < path.length - 1; i++) {
      if (current[path[i]] == null) return null;
      current = current[path[i]];
    }
    return {
      parent: current,
      key: path[path.length - 1],
    };
  }

  /**
   * Recursive renderer for object fields
   */
  renderObjectFields(container, obj, currentPath, symbol) {
    const keys = Object.keys(obj);

    keys.forEach((key) => {
      const val = obj[key];
      const valType = getType(val);
      const nodePath = [...currentPath, key];
      const pathString = nodePath.join(".");

      const nodeRow = document.createElement("div");
      nodeRow.className = "tree-node";
      nodeRow.dataset.path = pathString;

      if (valType === "object") {
        this.renderObjectNode(nodeRow, key, val, nodePath, symbol);
      } else if (valType === "array") {
        this.renderArrayNode(nodeRow, key, val, nodePath, symbol);
      } else {
        this.renderPrimitiveNode(nodeRow, key, val, valType, nodePath, symbol);
      }

      container.appendChild(nodeRow);
    });

    // Button to add a new field to this object
    const addFieldRow = document.createElement("div");
    addFieldRow.className = "pt-1.5 pb-0.5";
    addFieldRow.innerHTML = `
      <button class="tree-btn text-blue-400 hover:text-blue-300 hover:bg-blue-900/30">
        <i class="fa-solid fa-plus text-xs"></i>
        <span>Thêm thuộc tính</span>
      </button>
    `;

    addFieldRow.querySelector("button").onclick = () => {
      this.promptAddField(symbol, currentPath);
    };

    container.appendChild(addFieldRow);
  }

  /**
   * Render Object Node
   */
  renderObjectNode(container, key, objVal, path, symbol) {
    const pathString = path.join(".");
    const isCollapsed = this.collapsedPaths.has(pathString);
    const keyCount = Object.keys(objVal).length;

    const header = document.createElement("div");
    header.className = "tree-node-row items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-lg px-2.5 py-1.5";

    header.innerHTML = `
      <div class="flex items-center gap-2">
        <button class="tree-toggle-btn ${isCollapsed ? "is-collapsed" : ""}">
          <i class="fa-solid fa-chevron-down text-xs"></i>
        </button>
        <span class="tree-key font-bold text-slate-200">
          <i class="fa-solid fa-cube text-indigo-400 text-xs"></i>
          ${escapeHtml(key)}
        </span>
        <span class="tree-type-badge">{ ${keyCount} }</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="tree-btn btn-danger delete-key-btn" title="Xóa object này">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;

    const toggleBtn = header.querySelector(".tree-toggle-btn");
    const childrenContainer = document.createElement("div");
    childrenContainer.className = `tree-children mt-1.5 space-y-1 ${isCollapsed ? "hidden" : ""}`;

    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.collapsedPaths.has(pathString)) {
        this.collapsedPaths.delete(pathString);
        childrenContainer.classList.remove("hidden");
        toggleBtn.classList.remove("is-collapsed");
      } else {
        this.collapsedPaths.add(pathString);
        childrenContainer.classList.add("hidden");
        toggleBtn.classList.add("is-collapsed");
      }
    };

    header.querySelector(".delete-key-btn").onclick = () => {
      this.confirmDeleteField(symbol, path, key);
    };

    this.renderObjectFields(childrenContainer, objVal, path, symbol);

    container.appendChild(header);
    container.appendChild(childrenContainer);
  }

  /**
   * Render Array Node
   */
  renderArrayNode(container, key, arrVal, path, symbol) {
    const pathString = path.join(".");
    const isCollapsed = this.collapsedPaths.has(pathString);

    const header = document.createElement("div");
    header.className = "tree-node-row items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-lg px-2.5 py-1.5";

    header.innerHTML = `
      <div class="flex items-center gap-2">
        <button class="tree-toggle-btn ${isCollapsed ? "is-collapsed" : ""}">
          <i class="fa-solid fa-chevron-down text-xs"></i>
        </button>
        <span class="tree-key font-bold text-emerald-300">
          <i class="fa-solid fa-layer-group text-emerald-400 text-xs"></i>
          ${escapeHtml(key)}
        </span>
        <span class="tree-type-badge">[ ${arrVal.length} ]</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="tree-btn add-item-btn text-emerald-400 hover:text-emerald-300" title="Thêm phần tử vào mảng">
          <i class="fa-solid fa-plus text-xs"></i> Thêm mục
        </button>
        <button class="tree-btn btn-danger delete-key-btn" title="Xóa mảng này">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;

    const toggleBtn = header.querySelector(".tree-toggle-btn");
    const childrenContainer = document.createElement("div");
    childrenContainer.className = `tree-children mt-1.5 space-y-2 ${isCollapsed ? "hidden" : ""}`;

    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.collapsedPaths.has(pathString)) {
        this.collapsedPaths.delete(pathString);
        childrenContainer.classList.remove("hidden");
        toggleBtn.classList.remove("is-collapsed");
      } else {
        this.collapsedPaths.add(pathString);
        childrenContainer.classList.add("hidden");
        toggleBtn.classList.add("is-collapsed");
      }
    };

    header.querySelector(".add-item-btn").onclick = () => {
      this.promptAddArrayItem(symbol, path, arrVal);
    };

    header.querySelector(".delete-key-btn").onclick = () => {
      this.confirmDeleteField(symbol, path, key);
    };

    // Render Array Items
    arrVal.forEach((item, index) => {
      const itemCard = document.createElement("div");
      itemCard.className = "array-item-card";
      const itemPath = [...path, index];
      const itemType = getType(item);

      const itemHeader = document.createElement("div");
      itemHeader.className = "array-item-header";
      itemHeader.innerHTML = `
        <span class="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5">
          <span class="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300">${index + 1}</span>
          <span>Item ${index + 1}</span>
        </span>
        <div class="flex items-center gap-1">
          <button class="tree-btn move-up-btn" title="Di chuyển lên" ${index === 0 ? "disabled style='opacity:0.4; cursor:not-allowed;'" : ""}>
            <i class="fa-solid fa-arrow-up text-[10px]"></i>
          </button>
          <button class="tree-btn move-down-btn" title="Di chuyển xuống" ${index === arrVal.length - 1 ? "disabled style='opacity:0.4; cursor:not-allowed;'" : ""}>
            <i class="fa-solid fa-arrow-down text-[10px]"></i>
          </button>
          <button class="tree-btn duplicate-btn text-cyan-400 hover:text-cyan-300" title="Nhân bản mục này">
            <i class="fa-solid fa-clone text-[10px]"></i>
          </button>
          <button class="tree-btn btn-danger delete-item-btn" title="Xóa mục này">
            <i class="fa-solid fa-trash text-[10px]"></i>
          </button>
        </div>
      `;

      if (index > 0) {
        itemHeader.querySelector(".move-up-btn").onclick = () => {
          this.reorderArrayItem(symbol, path, index, -1);
        };
      }
      if (index < arrVal.length - 1) {
        itemHeader.querySelector(".move-down-btn").onclick = () => {
          this.reorderArrayItem(symbol, path, index, 1);
        };
      }
      itemHeader.querySelector(".duplicate-btn").onclick = () => {
        this.duplicateArrayItem(symbol, path, index);
      };
      itemHeader.querySelector(".delete-item-btn").onclick = () => {
        this.deleteArrayItem(symbol, path, index);
      };

      itemCard.appendChild(itemHeader);

      // Render Item Content
      if (itemType === "object") {
        const itemContent = document.createElement("div");
        itemContent.className = "space-y-1 pl-1";
        this.renderObjectFields(itemContent, item, itemPath, symbol);
        itemCard.appendChild(itemContent);
      } else if (itemType === "array") {
        const itemContent = document.createElement("div");
        itemContent.className = "space-y-1 pl-1";
        this.renderArrayNode(itemContent, `[${index}]`, item, itemPath, symbol);
        itemCard.appendChild(itemContent);
      } else {
        // Primitive in array
        const itemContent = document.createElement("div");
        this.renderPrimitiveNode(itemContent, `[${index}]`, item, itemType, itemPath, symbol, false);
        itemCard.appendChild(itemContent);
      }

      childrenContainer.appendChild(itemCard);
    });

    container.appendChild(header);
    container.appendChild(childrenContainer);
  }

  /**
   * Render Primitive Node (String, Number, Boolean, Null)
   */
  renderPrimitiveNode(container, key, val, type, path, symbol, showDelete = true) {
    const isSpecialIdentity = path.length === 1 && (key === "number" || key === "symbol");

    const row = document.createElement("div");
    row.className = "tree-node-row items-start justify-between flex-wrap sm:flex-nowrap gap-2";

    const leftCol = document.createElement("div");
    leftCol.className = "flex items-center gap-1.5 min-w-[140px] pt-1";
    leftCol.innerHTML = `
      <span class="tree-key ${isSpecialIdentity ? "text-amber-300 font-bold" : ""}">
        ${escapeHtml(key)}
        ${isSpecialIdentity ? '<i class="fa-solid fa-lock text-[10px] text-amber-400" title="Trường định danh quan trọng"></i>' : ""}
      </span>
      <span class="tree-type-badge">${type}</span>
    `;

    const rightCol = document.createElement("div");
    rightCol.className = "flex-1 flex items-center gap-2 min-w-0";

    // 1. String Input
    if (type === "string") {
      const isLongText = val.length > 50 || val.includes("\n");
      const hasHtml = /<[a-z][\s\S]*>/i.test(val);

      if (isLongText || hasHtml) {
        // Multi-line Textarea with HTML Preview / Chem Tools
        const editorWrap = document.createElement("div");
        editorWrap.className = "w-full space-y-1";

        let htmlToggleHtml = "";
        if (hasHtml) {
          htmlToggleHtml = `
            <div class="flex items-center gap-1 mb-1">
              <button class="tree-btn tab-source-btn active bg-slate-700 text-white text-[10px]">Mã nguồn</button>
              <button class="tree-btn tab-preview-btn text-[10px]">Xem trước HTML</button>
            </div>
          `;
        }

        // Chemical shortcut buttons
        const chemBar = document.createElement("div");
        chemBar.className = "chem-symbol-toolbar";
        CHEM_SYMBOLS.forEach((symb) => {
          const btn = document.createElement("button");
          btn.className = "chem-symbol-btn";
          btn.type = "button";
          btn.textContent = symb;
          btn.onclick = () => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentVal = textarea.value;
            textarea.value = currentVal.substring(0, start) + symb + currentVal.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + symb.length;
            textarea.focus();
            updateStringValue(textarea.value);
          };
          chemBar.appendChild(btn);
        });

        editorWrap.innerHTML = htmlToggleHtml;
        editorWrap.appendChild(chemBar);

        const textarea = document.createElement("textarea");
        textarea.className = "tree-textarea-string";
        textarea.value = val;
        textarea.spellcheck = false;

        const previewBox = document.createElement("div");
        previewBox.className = "html-preview-box hidden";
        previewBox.innerHTML = sanitizeHtml(val);

        const updateStringValue = (newVal) => {
          state.updateWorkingCopy(symbol, (obj) => {
            const resolved = this.resolvePath(obj, path);
            if (resolved) resolved.parent[resolved.key] = newVal;
          });
          previewBox.innerHTML = sanitizeHtml(newVal);
        };

        textarea.oninput = (e) => {
          updateStringValue(e.target.value);
        };

        if (hasHtml) {
          const srcBtn = editorWrap.querySelector(".tab-source-btn");
          const prevBtn = editorWrap.querySelector(".tab-preview-btn");
          srcBtn.onclick = () => {
            srcBtn.classList.add("bg-slate-700", "text-white");
            prevBtn.classList.remove("bg-slate-700", "text-white");
            textarea.classList.remove("hidden");
            chemBar.classList.remove("hidden");
            previewBox.classList.add("hidden");
          };
          prevBtn.onclick = () => {
            prevBtn.classList.add("bg-slate-700", "text-white");
            srcBtn.classList.remove("bg-slate-700", "text-white");
            textarea.classList.add("hidden");
            chemBar.classList.add("hidden");
            previewBox.classList.remove("hidden");
          };
        }

        editorWrap.appendChild(textarea);
        editorWrap.appendChild(previewBox);
        rightCol.appendChild(editorWrap);
      } else {
        // Single line input
        const input = document.createElement("input");
        input.type = "text";
        input.className = "tree-input-string";
        input.value = val;
        input.oninput = (e) => {
          state.updateWorkingCopy(symbol, (obj) => {
            const resolved = this.resolvePath(obj, path);
            if (resolved) resolved.parent[resolved.key] = e.target.value;
          });
        };
        rightCol.appendChild(input);
      }
    }

    // 2. Number Input
    else if (type === "number") {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.className = "tree-input-number";
      input.value = val;
      input.oninput = (e) => {
        const raw = e.target.value;
        const num = raw === "" ? null : Number(raw);
        state.updateWorkingCopy(symbol, (obj) => {
          const resolved = this.resolvePath(obj, path);
          if (resolved) resolved.parent[resolved.key] = isNaN(num) ? raw : num;
        });
      };
      rightCol.appendChild(input);
    }

    // 3. Boolean Switch
    else if (type === "boolean") {
      const switchWrap = document.createElement("label");
      switchWrap.className = "tree-switch";
      switchWrap.innerHTML = `
        <input type="checkbox" ${val ? "checked" : ""}>
        <span class="tree-slider"></span>
      `;
      const checkbox = switchWrap.querySelector("input");
      checkbox.onchange = (e) => {
        state.updateWorkingCopy(symbol, (obj) => {
          const resolved = this.resolvePath(obj, path);
          if (resolved) resolved.parent[resolved.key] = e.target.checked;
        });
      };
      rightCol.appendChild(switchWrap);
    }

    // 4. Null
    else if (type === "null") {
      const nullWrap = document.createElement("div");
      nullWrap.className = "flex items-center gap-2";
      nullWrap.innerHTML = `
        <span class="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">null</span>
        <select class="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500">
          <option value="" disabled selected>Đổi kiểu...</option>
          <option value="string">String ("")</option>
          <option value="number">Number (0)</option>
          <option value="boolean">Boolean (false)</option>
          <option value="object">Object ({})</option>
          <option value="array">Array ([])</option>
        </select>
      `;
      const select = nullWrap.querySelector("select");
      select.onchange = (e) => {
        const targetType = e.target.value;
        let defaultVal = "";
        if (targetType === "number") defaultVal = 0;
        if (targetType === "boolean") defaultVal = false;
        if (targetType === "object") defaultVal = {};
        if (targetType === "array") defaultVal = [];

        state.updateWorkingCopy(symbol, (obj) => {
          const resolved = this.resolvePath(obj, path);
          if (resolved) resolved.parent[resolved.key] = defaultVal;
        });
        this.render(symbol);
      };
      rightCol.appendChild(nullWrap);
    }

    // Delete field button (if allowed)
    if (showDelete && !isSpecialIdentity) {
      const delBtn = document.createElement("button");
      delBtn.className = "tree-btn btn-danger flex-shrink-0 self-center";
      delBtn.title = `Xóa thuộc tính "${key}"`;
      delBtn.innerHTML = '<i class="fa-solid fa-trash-can text-xs"></i>';
      delBtn.onclick = () => {
        this.confirmDeleteField(symbol, path, key);
      };
      rightCol.appendChild(delBtn);
    }

    row.appendChild(leftCol);
    row.appendChild(rightCol);
    container.appendChild(row);
  }

  // --- ACTIONS ---

  promptAddField(symbol, parentPath) {
    showPromptModal({
      title: "Thêm thuộc tính mới",
      message: `Nhập tên trường muốn thêm vào ${parentPath.length ? parentPath.join(".") : "gốc"}:`,
      placeholder: "ví dụ: discoveryCountry, electronegativity, ...",
      typeOptions: [
        { label: "Chuỗi (String)", value: "string" },
        { label: "Số (Number)", value: "number" },
        { label: "Đúng / Sai (Boolean)", value: "boolean" },
        { label: "Đối tượng (Object)", value: "object" },
        { label: "Mảng (Array)", value: "array" },
        { label: "Giá trị rỗng (Null)", value: "null" },
      ],
      onConfirm: (keyName, chosenType) => {
        let initialVal = "";
        if (chosenType === "number") initialVal = 0;
        if (chosenType === "boolean") initialVal = false;
        if (chosenType === "object") initialVal = {};
        if (chosenType === "array") initialVal = [];
        if (chosenType === "null") initialVal = null;

        state.updateWorkingCopy(symbol, (obj) => {
          let target = obj;
          for (const seg of parentPath) {
            target = target[seg];
          }
          if (target && typeof target === "object") {
            target[keyName] = initialVal;
          }
        });

        this.render(symbol);
      },
    });
  }

  confirmDeleteField(symbol, path, key) {
    showConfirmModal({
      title: "Xóa thuộc tính",
      message: `Bạn có chắc chắn muốn xóa trường "${key}" (${path.join(".")})?`,
      confirmText: "Xóa ngay",
      cancelText: "Giữ lại",
      isDanger: true,
      onConfirm: () => {
        state.updateWorkingCopy(symbol, (obj) => {
          const resolved = this.resolvePath(obj, path);
          if (resolved && resolved.parent) {
            delete resolved.parent[resolved.key];
          }
        });
        this.render(symbol);
      },
    });
  }

  promptAddArrayItem(symbol, arrayPath, currentArr) {
    // Guess default type from first item in array if present
    let defaultType = "object";
    if (currentArr.length > 0) {
      defaultType = getType(currentArr[0]);
    }

    showPromptModal({
      title: "Thêm phần tử vào mảng",
      message: `Chọn kiểu dữ liệu cho phần tử mới trong mảng ${arrayPath.join(".")}:`,
      placeholder: "Tên phần tử hoặc mô tả...",
      typeOptions: [
        { label: "Đối tượng (Object)", value: "object" },
        { label: "Chuỗi (String)", value: "string" },
        { label: "Số (Number)", value: "number" },
        { label: "Đúng / Sai (Boolean)", value: "boolean" },
        { label: "Mảng (Array)", value: "array" },
      ],
      defaultValue: defaultType,
      onConfirm: (_, chosenType) => {
        let newVal = {};
        // If items are objects, clone the schema of first item with empty values
        if (chosenType === "object") {
          if (currentArr.length > 0 && typeof currentArr[0] === "object" && currentArr[0] !== null) {
            newVal = {};
            Object.keys(currentArr[0]).forEach((k) => {
              const t = getType(currentArr[0][k]);
              newVal[k] = t === "number" ? 0 : t === "boolean" ? false : "";
            });
          }
        } else if (chosenType === "string") {
          newVal = "";
        } else if (chosenType === "number") {
          newVal = 0;
        } else if (chosenType === "boolean") {
          newVal = false;
        } else if (chosenType === "array") {
          newVal = [];
        }

        state.updateWorkingCopy(symbol, (obj) => {
          const resolved = this.resolvePath(obj, arrayPath);
          if (resolved && Array.isArray(resolved.parent[resolved.key])) {
            resolved.parent[resolved.key].push(newVal);
          }
        });
        this.render(symbol);
      },
    });
  }

  duplicateArrayItem(symbol, arrayPath, index) {
    state.updateWorkingCopy(symbol, (obj) => {
      const resolved = this.resolvePath(obj, arrayPath);
      if (resolved && Array.isArray(resolved.parent[resolved.key])) {
        const arr = resolved.parent[resolved.key];
        const copy = deepClone(arr[index]);
        arr.splice(index + 1, 0, copy);
      }
    });
    this.render(symbol);
  }

  deleteArrayItem(symbol, arrayPath, index) {
    state.updateWorkingCopy(symbol, (obj) => {
      const resolved = this.resolvePath(obj, arrayPath);
      if (resolved && Array.isArray(resolved.parent[resolved.key])) {
        resolved.parent[resolved.key].splice(index, 1);
      }
    });
    this.render(symbol);
  }

  reorderArrayItem(symbol, arrayPath, index, offset) {
    state.updateWorkingCopy(symbol, (obj) => {
      const resolved = this.resolvePath(obj, arrayPath);
      if (resolved && Array.isArray(resolved.parent[resolved.key])) {
        const arr = resolved.parent[resolved.key];
        const targetIdx = index + offset;
        if (targetIdx >= 0 && targetIdx < arr.length) {
          const temp = arr[index];
          arr[index] = arr[targetIdx];
          arr[targetIdx] = temp;
        }
      }
    });
    this.render(symbol);
  }
}
