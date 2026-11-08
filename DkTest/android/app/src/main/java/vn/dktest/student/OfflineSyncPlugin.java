package vn.dktest.student;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "OfflineSync")
public class OfflineSyncPlugin extends Plugin {
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
}
