// URL Web App đã triển khai của google-apps-script.gs (Deploy > Web app > Anyone).
// Dùng một URL chung tại đây để mọi khách truy cập đều tải lên và xem lịch sử.
window.DRIVE_CONFIG = {
  rootId: "1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa",
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxlnelkWl_leSqa7e3XWQdonnAUzjjPfnW7B4pdmcPMX5mI_M_WkZD4UdBiNljLM7M2fg/exec",
  pollIntervalMs: 10 * 60 * 1000,
  treeRefreshIntervalMs: 6 * 60 * 60 * 1000,
  cacheMaxAgeMs: 10 * 60 * 60 * 1000,
  uploadChunkBytes: 2 * 1024 * 1024,
};
