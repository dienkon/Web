package vn.dktest.student;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "DkNotifications",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class DkNotificationsPlugin extends Plugin {
    public static final String CHANNEL_ID = "dktest_alerts";
    public static final String PREFS_NAME = "dktest_notifications_prefs";
    public static final String KEY_API_BASE = "api_base_url";
    public static final String KEY_LAST_MS = "last_seen_ms";

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Thông báo Sự kiện & Đơn hàng DkTEST",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Nhận thông báo Minigame phát quà, đơn Acc AI hoàn tất và cập nhật mới nhất từ DkTEST.");
                channel.enableVibration(true);
                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void postSystemNotification(
        Context context,
        int id,
        String title,
        String body,
        String route
    ) {
        ensureChannel(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                return;
            }
        }

        String safeRoute = (route != null && route.startsWith("/")) ? route : "/";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://dk-test-v3.vercel.app" + safeRoute));
        intent.setClass(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(context, id, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.dktest_logo)
            .setContentTitle(title != null ? title : "Thông báo DkTEST")
            .setContentText(body != null ? body : "")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent);

        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException ignored) {
            // Permission revoked concurrently
        }
    }

    @Override
    public void load() {
        ensureChannel(getContext());
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
            result.put("permission", enabled ? "granted" : "denied");
            call.resolve(result);
            return;
        }
        int state = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS);
        if (state == PackageManager.PERMISSION_GRANTED) {
            result.put("permission", "granted");
        } else {
            PermissionState capState = getPermissionState("notifications");
            if (capState == PermissionState.DENIED) {
                result.put("permission", "denied");
            } else {
                result.put("permission", "prompt");
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        ensureChannel(getContext());
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("permission", "granted");
            call.resolve(result);
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("permission", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
    }

    @PermissionCallback
    private void notificationsPermsCallback(PluginCall call) {
        JSObject result = new JSObject();
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            result.put("permission", "granted");
            NotificationPollWorker.schedule(getContext());
        } else {
            result.put("permission", "denied");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void showLocalNotification(PluginCall call) {
        int id = call.getInt("id", (int) (System.currentTimeMillis() % 100000));
        String title = call.getString("title", "Thông báo DkTEST");
        String body = call.getString("body", "");
        String route = call.getString("route", "/");
        postSystemNotification(getContext(), id, title, body, route);
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        if (now > prefs.getLong(KEY_LAST_MS, 0L)) {
            prefs.edit().putLong(KEY_LAST_MS, now).apply();
        }
        call.resolve();
    }

    @PluginMethod
    public void configureBackgroundPoll(PluginCall call) {
        String apiBaseUrl = call.getString("apiBaseUrl", "https://dk-test-v3.vercel.app");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_API_BASE, apiBaseUrl);
        if (prefs.getLong(KEY_LAST_MS, 0L) == 0L) {
            editor.putLong(KEY_LAST_MS, System.currentTimeMillis());
        }
        editor.apply();
        NotificationPollWorker.schedule(getContext());
        call.resolve();
    }
}
