// Cấu hình bảo mật dùng chung cho pnd_master.html và admin.html.
// Sau khi đăng ký Web App trong Firebase App Check, dán site key
// reCAPTCHA Enterprise vào APP_CHECK_SITE_KEY rồi triển khai lại website.
export const APP_CHECK_SITE_KEY = "6Lfq110tAAAAAF81xL-iDoyIjLrhCUahHAjWGUvM";

// Chỉ bật khi phát triển trên localhost và đã đăng ký debug token
// hiển thị trong Console Firebase. Luôn để false trên production.
export const ENABLE_LOCAL_APP_CHECK_DEBUG = false;