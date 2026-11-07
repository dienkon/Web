"use strict";
const { app, BrowserWindow, Menu, ipcMain, dialog, session } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const entry = path.join(__dirname, "../index.html");
let mainWindow;
const testProfile = process.env.INKULATOR_TEST_PROFILE;
if (testProfile) app.setPath("userData", path.resolve(testProfile));
app.setName("Inkulator");
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === "clipboard-sanitized-write" || permission === "clipboard-read");
    });
    // Renderer stays offline. Explicit Gemini requests use the narrow main-process bridge.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_details, callback) => callback({ cancel: true }));
    mainWindow = new BrowserWindow({
      width: 1360, height: 900, minWidth: 640, minHeight: 480,
      backgroundColor: "#f4f7f3", title: "Inkulator", show: false,
      icon: path.join(__dirname, "../assets/icon.ico"),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false, contextIsolation: true, sandbox: true,
        webSecurity: true, spellcheck: false,
      },
    });
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (url !== pathToFileURL(entry).href) event.preventDefault();
    });
    mainWindow.webContents.on("will-prevent-unload", (event) => {
      const answer = dialog.showMessageBoxSync(mainWindow, {
        type: "warning", buttons: ["Quay lại để lưu", "Đóng ứng dụng"], defaultId: 0, cancelId: 0,
        title: "Chưa lưu được sổ tay", message: "Không thể tự lưu. Hãy quay lại và dùng Ctrl+S để tải bản sao lưu trước khi đóng.",
      });
      if (answer === 1) event.preventDefault();
    });
    mainWindow.once("ready-to-show", () => mainWindow.show());
    require("./capture.cjs")(mainWindow);
    require("./document-files.cjs")(mainWindow);
    require("./gemini.cjs")(mainWindow);
    require("./native-calculators.cjs")(mainWindow);
    let allowClose=false,preparingClose=false,closeTimer;
    const failedClose=()=>{
      clearTimeout(closeTimer);preparingClose=false;
      const choice=dialog.showMessageBoxSync(mainWindow,{type:"warning",title:"Tài liệu chưa lưu xong",message:"Chưa hoàn tất ghi tài liệu trên máy. Quay lại để kiểm tra hoặc xuất bản snapshot trước khi đóng.",buttons:["Quay lại","Đóng ứng dụng"],defaultId:0,cancelId:0});
      if(choice===1){allowClose=true;mainWindow.close();}
    };
    mainWindow.on("close",event=>{
      if(allowClose)return;
      event.preventDefault();
      if(preparingClose)return;
      preparingClose=true;
      mainWindow.webContents.send("inkulator:prepare-close");
      closeTimer=setTimeout(failedClose,20000);
    });
    ipcMain.on("inkulator:close-ready",(event,ok)=>{
      if(event.sender!==mainWindow.webContents||event.senderFrame!==mainWindow.webContents.mainFrame||!preparingClose)return;
      preparingClose=false;
      clearTimeout(closeTimer);
      if(ok===true){allowClose=true;mainWindow.close();}else failedClose();
    });
    mainWindow.loadFile(entry);
    ipcMain.handle("inkulator:flush", async (event) => {
      if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return false;
      await session.defaultSession.flushStorageData();
      return true;
    });
    app.on("activate", () => { mainWindow?.show(); });
  });
  app.on("window-all-closed", () => app.quit());
}
