package vn.dktest.student;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;

/** WorkManager retries on connectivity, survives process death and device reboot. */
public class OfflineSyncWorker extends Worker {
    public OfflineSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }
    static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        WorkManager manager = WorkManager.getInstance(context);
        manager.enqueueUniqueWork("dktest-sync-now", ExistingWorkPolicy.KEEP,
            new OneTimeWorkRequest.Builder(OfflineSyncWorker.class).setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build());
        // Also closes the small enqueue-versus-worker-completion race and recovers after reboot.
        manager.enqueueUniquePeriodicWork("dktest-sync-periodic", ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(OfflineSyncWorker.class, 15, TimeUnit.MINUTES).setConstraints(constraints).build());
    }
    @NonNull @Override public Result doWork() {
        boolean retry = false;
        try {
            JSONObject session = OfflineState.session(getApplicationContext());
            if (session == null) return Result.success();
            String uid = session.getString("uid");
            String token = null;
            for (JSONObject value : OfflineState.all(getApplicationContext())) {
                if (isStopped()) return Result.retry();
                if (!uid.equals(value.getString("uid")) || "synced".equals(value.optString("state"))) continue;
                JSONObject currentSession = OfflineState.session(getApplicationContext());
                if (currentSession == null || !uid.equals(currentSession.getString("uid"))) return Result.success();
                try {
                    if (token == null) {
                        JSONObject refreshed = request("POST", "https://securetoken.googleapis.com/v1/token?key=" + session.getString("apiKey"),
                            "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(currentSession.getString("refreshToken"), "UTF-8"), null, "application/x-www-form-urlencoded");
                        token = refreshedToken(uid, refreshed);
                        // Re-read under the same lock so logout/account switching cannot be undone by a slow refresh.
                        synchronized (OfflineState.class) {
                            JSONObject active = OfflineState.session(getApplicationContext());
                            if (active == null || !uid.equals(active.getString("uid"))) return Result.success();
                            OfflineState.setSession(getApplicationContext(), active.put("refreshToken", refreshed.getString("refresh_token")));
                        }
                    }
                    upload(session.getString("projectId"), token, value);
                    OfflineState.mark(getApplicationContext(), value.getString("id"), "synced", "");
                } catch (Exception error) {
                    retry = true;
                    String message = error instanceof HttpError && ((HttpError) error).status == 403
                        ? "Máy chủ từ chối quyền ghi. Hãy đăng nhập lại hoặc liên hệ quản trị viên."
                        : error instanceof HttpError && ((HttpError) error).status == 400
                            ? "Máy chủ chưa nhận bài. Kiểm tra phiên đăng nhập hoặc kích thước bài làm."
                            : "Chưa gửi được. Bài làm vẫn trên máy và sẽ tự thử lại.";
                    OfflineState.mark(getApplicationContext(), value.getString("id"), "error", message);
                }
            }
            return retry ? Result.retry() : Result.success();
        } catch (Exception error) { return Result.retry(); }
    }
    static String refreshedToken(String uid, JSONObject response) throws Exception {
        // Secure Token binds the refresh token to the API key's project. Its project_id
        // response can be the numeric project number, not the Firestore project ID.
        if (!uid.equals(response.getString("user_id"))) throw new Exception("Phiên đăng nhập không khớp tài khoản.");
        return response.getString("id_token");
    }
    private void upload(String project, String token, JSONObject value) throws Exception {
        String name = "projects/" + project + "/databases/(default)/documents/submissions/" + value.getString("id");
        JSONObject submission = new JSONObject(value.getJSONObject("submission").toString());
        JSONObject write = createWrite(project, value, System.currentTimeMillis());
        try {
            request("POST", "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents:commit",
                new JSONObject().put("writes", new JSONArray().put(write)).toString(), token, "application/json");
        } catch (HttpError error) {
            if (error.status != 409 && error.status != 412) throw error;
            // Lost ACK / retry: confirm identity, never overwrite an already graded server document.
            JSONObject existing = request("GET", "https://firestore.googleapis.com/v1/" + name, null, token, "application/json").getJSONObject("fields");
            if (!value.getString("uid").equals(existing.getJSONObject("studentUid").getString("stringValue"))
                || !submission.getString("attemptId").equals(existing.getJSONObject("attemptId").getString("stringValue"))) {
                throw new Exception("Mã bài nộp đã thuộc bài làm khác.");
            }
        }
    }
    static JSONObject createWrite(String project, JSONObject value, long syncedAt) throws Exception {
        String name = "projects/" + project + "/databases/(default)/documents/submissions/" + value.getString("id");
        JSONObject submission = new JSONObject(value.getJSONObject("submission").toString());
        JSONObject fields = fields(submission);
        fields.put("submittedAt", new JSONObject().put("timestampValue", timestamp(value.getLong("savedAt"))));
        fields.put("syncedAt", new JSONObject().put("timestampValue", timestamp(syncedAt)));
        fields.put("offlineSubmission", new JSONObject().put("booleanValue", true));
        return new JSONObject().put("update", new JSONObject().put("name", name).put("fields", fields))
            .put("currentDocument", new JSONObject().put("exists", false));
    }
    private static String timestamp(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }
    static JSONObject fields(JSONObject object) throws Exception {
        JSONObject result = new JSONObject();
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) { String key = keys.next(); result.put(key, typed(object.get(key))); }
        return result;
    }
    static JSONObject typed(Object value) throws Exception {
        JSONObject result = new JSONObject();
        if (value == JSONObject.NULL) return result.put("nullValue", JSONObject.NULL);
        if (value instanceof Boolean) return result.put("booleanValue", value);
        if (value instanceof Number) return result.put("doubleValue", value);
        if (value instanceof JSONArray) {
            JSONArray values = new JSONArray();
            for (int i = 0; i < ((JSONArray) value).length(); i++) values.put(typed(((JSONArray) value).get(i)));
            return result.put("arrayValue", new JSONObject().put("values", values));
        }
        if (value instanceof JSONObject) return result.put("mapValue", new JSONObject().put("fields", fields((JSONObject) value)));
        return result.put("stringValue", value.toString());
    }
    private static class HttpError extends Exception { final int status; HttpError(int status) { this.status = status; } }
    private static JSONObject request(String method, String url, String body, String token, String contentType) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        try {
            connection.setConnectTimeout(20000); connection.setReadTimeout(30000);
            connection.setRequestMethod(method); connection.setRequestProperty("Content-Type", contentType);
            if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
            if (body != null) {
                connection.setDoOutput(true);
                try (java.io.OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
            }
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new HttpError(status);
            try (InputStream input = connection.getInputStream()) {
                java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                return new JSONObject(output.toString("UTF-8"));
            }
        } finally { connection.disconnect(); }
    }
}
