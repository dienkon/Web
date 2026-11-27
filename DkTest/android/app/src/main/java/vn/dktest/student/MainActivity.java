package vn.dktest.student;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OfflineSyncPlugin.class);
        registerPlugin(DkNotificationsPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
                    if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) {
                        return;
                    }
                    try {
                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm == null) return;
                        String safeMime = (mimeType == null || mimeType.isEmpty()) ? "application/pdf" : mimeType;
                        String fileName = URLUtil.guessFileName(url, contentDisposition, safeMime);
                        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                        req.setMimeType(safeMime);
                        if (userAgent != null && !userAgent.isEmpty()) {
                            req.addRequestHeader("User-Agent", userAgent);
                        }
                        req.setTitle(fileName);
                        req.setDescription("Đang tải tệp về thiết bị...");
                        req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        try {
                            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                        } catch (Exception ignored) {
                            req.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, fileName);
                        }
                        dm.enqueue(req);
                        Toast.makeText(getApplicationContext(), "Đang tải tệp: " + fileName, Toast.LENGTH_SHORT).show();
                    } catch (Exception ignored) {}
                });
            }
        } catch (Exception ignored) {}
    }
}
