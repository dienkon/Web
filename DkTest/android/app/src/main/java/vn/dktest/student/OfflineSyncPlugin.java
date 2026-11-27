package vn.dktest.student;

import android.app.DownloadManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import org.json.JSONObject;

@CapacitorPlugin(name = "OfflineSync")
public class OfflineSyncPlugin extends Plugin {
    private static String sanitizeFileName(String rawName, String defaultExt) {
        String base = (rawName == null ? "" : rawName.trim())
            .replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_")
            .replaceAll("\\s+", " ");
        if (base.isEmpty()) {
            base = "Tai_lieu_DkTEST";
        }
        if (defaultExt != null && !defaultExt.isEmpty() && !base.toLowerCase().endsWith("." + defaultExt.toLowerCase())) {
            base = base + "." + defaultExt;
        }
        return base;
    }

    @PluginMethod public void setSession(PluginCall call) {
        try {
            JSONObject value = call.getData();
            if (value.optString("uid").isEmpty() || value.optString("refreshToken").isEmpty()
                || value.optString("projectId").isEmpty() || value.optString("apiKey").isEmpty()) {
                call.reject("Thiếu phiên đăng nhập để đồng bộ."); return;
            }
            OfflineState.setSession(getContext(), value);
            call.resolve();
        } catch (Exception error) { call.reject("Không lưu được phiên đồng bộ bảo mật."); }
    }
    @PluginMethod public void clearSession(PluginCall call) {
        OfflineState.clearSession(getContext()); call.resolve();
    }
    @PluginMethod public void saveUserSnapshot(PluginCall call) {
        try {
            JSONObject value = call.getData();
            if (value == null || value.optString("uid").isEmpty()) {
                call.reject("Thiếu thông tin người dùng để lưu."); return;
            }
            OfflineState.saveUserSnapshot(getContext(), value);
            call.resolve();
        } catch (Exception error) { call.reject("Không thể lưu hồ sơ đăng nhập trên thiết bị."); }
    }
    @PluginMethod public void getUserSnapshot(PluginCall call) {
        try {
            JSONObject snapshot = OfflineState.getUserSnapshot(getContext());
            JSObject result = new JSObject();
            if (snapshot != null) {
                result.put("snapshot", snapshot.toString());
            }
            call.resolve(result);
        } catch (Exception error) { call.resolve(new JSObject()); }
    }
    @PluginMethod public void clearUserSnapshot(PluginCall call) {
        OfflineState.clearUserSnapshot(getContext()); call.resolve();
    }
    @PluginMethod public void enqueue(PluginCall call) {
        try {
            JSONObject value = call.getData();
            String id = value.getString("id");
            JSONObject submission = value.getJSONObject("submission");
            if (!id.equals(submission.getString("id")) || !value.getString("uid").equals(submission.getString("studentUid"))) {
                call.reject("Danh tính bài nộp không khớp."); return;
            }
            JSONObject existing = OfflineState.read(getContext(), id);
            if (existing != null && !existing.getString("uid").equals(value.getString("uid"))) {
                call.reject("Bài nộp thuộc tài khoản khác."); return;
            }
            if (existing == null) OfflineState.write(getContext(), value.put("state", "pending"));
            OfflineSyncWorker.schedule(getContext());
            call.resolve();
        } catch (Exception error) { call.reject("Không lưu được bài làm. Kiểm tra dung lượng máy rồi nộp lại."); }
    }
    @PluginMethod public void status(PluginCall call) {
        try {
            JSArray items = new JSArray();
            for (JSONObject value : OfflineState.all(getContext())) {
                items.put(new JSObject().put("id", value.getString("id")).put("uid", value.getString("uid"))
                    .put("state", value.getString("state")).put("error", value.optString("error")));
            }
            call.resolve(new JSObject().put("items", items));
        } catch (Exception error) { call.reject("Không đọc được hàng đợi bài làm."); }
    }
    @PluginMethod public void schedule(PluginCall call) {
        OfflineSyncWorker.schedule(getContext()); call.resolve();
    }

    @PluginMethod public void downloadFileUrl(PluginCall call) {
        try {
            String url = call.getString("url", "").trim();
            if (url.isEmpty() || !(url.startsWith("https://") || url.startsWith("http://"))) {
                call.reject("Đường dẫn tải tệp không hợp lệ."); return;
            }
            String mimeType = call.getString("mimeType", "application/pdf");
            String ext = mimeType.contains("pdf") ? "pdf" : "";
            String fileName = sanitizeFileName(call.getString("fileName", "Tai_lieu_DkTEST.pdf"), ext);
            String title = call.getString("title", fileName);
            String authHeader = call.getString("authorization", "");

            Context context = getContext();
            DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                call.reject("Thiết bị không hỗ trợ trình quản lý tải xuống."); return;
            }

            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setTitle(title);
            req.setDescription("Đang tải tài liệu từ DkTEST...");
            req.setMimeType(mimeType);
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setAllowedOverMetered(true);
            req.setAllowedOverRoaming(true);
            if (authHeader != null && !authHeader.isEmpty()) {
                req.addRequestHeader("Authorization", authHeader);
            }

            try {
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            } catch (Exception fallbackErr) {
                req.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName);
            }

            long downloadId = dm.enqueue(req);
            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            result.put("fileName", fileName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Không thể khởi tạo tải tệp trên thiết bị: " + error.getMessage());
        }
    }

    @PluginMethod public void saveBase64ToDownloads(PluginCall call) {
        try {
            String base64 = call.getString("base64", "");
            if (base64 == null || base64.isEmpty()) {
                call.reject("Không có dữ liệu tệp để lưu."); return;
            }
            int commaIdx = base64.indexOf(',');
            if (commaIdx >= 0) {
                base64 = base64.substring(commaIdx + 1);
            }
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            String mimeType = call.getString("mimeType", "application/pdf");
            String ext = mimeType.contains("pdf") ? "pdf" : "";
            String fileName = sanitizeFileName(call.getString("fileName", "Tai_lieu_DkTEST.pdf"), ext);

            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/DkTEST");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                Uri itemUri = resolver.insert(collection, values);
                if (itemUri == null) {
                    call.reject("Không thể tạo tệp trong thư mục Tệp tải xuống."); return;
                }
                try (OutputStream out = resolver.openOutputStream(itemUri)) {
                    if (out == null) throw new IllegalStateException("OutputStream null");
                    out.write(bytes);
                    out.flush();
                }
                ContentValues doneValues = new ContentValues();
                doneValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(itemUri, doneValues, null, null);

                JSObject result = new JSObject();
                result.put("fileName", fileName);
                result.put("uri", itemUri.toString());
                result.put("folder", "Downloads/DkTEST");
                call.resolve(result);
                return;
            }

            File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) dir = context.getFilesDir();
            if (!dir.exists()) dir.mkdirs();
            File target = new File(dir, fileName);
            try (FileOutputStream fos = new FileOutputStream(target)) {
                fos.write(bytes);
                fos.flush();
            }
            JSObject result = new JSObject();
            result.put("fileName", fileName);
            result.put("savedPath", target.getAbsolutePath());
            result.put("folder", "Downloads");
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Lưu tệp PDF vào máy thất bại: " + error.getMessage());
        }
    }
}
