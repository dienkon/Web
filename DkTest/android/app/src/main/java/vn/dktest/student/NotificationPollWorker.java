package vn.dktest.student;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Background Android WorkManager poller that checks DkTEST's broadcast notification feed
 * every 15 minutes when network is connected, posting native phone status-bar notifications
 * for new Minigame events, feature launches, and system alerts.
 */
public class NotificationPollWorker extends Worker {
    private static final String UNIQUE_WORK_NAME = "dktest_notification_poll";

    public NotificationPollWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    public static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            NotificationPollWorker.class,
            15,
            TimeUnit.MINUTES
        ).setConstraints(constraints).build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        );
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(
            DkNotificationsPlugin.PREFS_NAME,
            Context.MODE_PRIVATE
        );
        String baseUrl = prefs.getString(DkNotificationsPlugin.KEY_API_BASE, "https://dk-test-v3.vercel.app");
        long lastSeenMs = prefs.getLong(DkNotificationsPlugin.KEY_LAST_MS, 0L);
        if (lastSeenMs == 0L) {
            long now = System.currentTimeMillis();
            prefs.edit().putLong(DkNotificationsPlugin.KEY_LAST_MS, now).apply();
            return Result.success();
        }

        HttpURLConnection conn = null;
        try {
            URL url = new URL(baseUrl + "/api/notifications/feed?since=" + lastSeenMs + "&limit=5");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() != 200) {
                return Result.success();
            }

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
            )) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }

            JSONObject json = new JSONObject(sb.toString());
            JSONArray list = json.optJSONArray("notifications");
            if (list == null || list.length() == 0) {
                return Result.success();
            }

            long maxMs = lastSeenMs;
            int shown = 0;
            for (int i = list.length() - 1; i >= 0 && shown < 3; i--) {
                JSONObject item = list.optJSONObject(i);
                if (item == null) continue;
                long createdAtMs = item.optLong("createdAtMs", 0L);
                if (createdAtMs <= lastSeenMs) continue;
                String idStr = item.optString("id", String.valueOf(createdAtMs));
                String title = item.optString("title", "Thông báo mới từ DkTEST");
                String message = item.optString("message", "");
                String route = item.optString("route", "/");

                int notifId = Math.abs(idStr.hashCode() % 1_000_000) + 1000;
                DkNotificationsPlugin.postSystemNotification(context, notifId, title, message, route);
                shown++;
                if (createdAtMs > maxMs) maxMs = createdAtMs;
            }

            if (maxMs > lastSeenMs) {
                prefs.edit().putLong(DkNotificationsPlugin.KEY_LAST_MS, maxMs).apply();
            }
            return Result.success();
        } catch (Exception err) {
            return Result.success();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
