package vn.dktest.student;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Private, atomic files survive process death. Auth tokens are encrypted by Android Keystore. */
final class OfflineState {
    private static final String KEY_ALIAS = "dktest-offline-auth-v1";
    private static File folder(Context context) {
        File dir = new File(context.getNoBackupFilesDir(), "offline-submissions");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Không tạo được kho bài làm.");
        return dir;
    }
    private static AtomicFile item(Context context, String id) {
        if (!id.matches("[a-zA-Z0-9_-]{1,240}")) throw new IllegalArgumentException("Mã bài nộp không hợp lệ.");
        return new AtomicFile(new File(folder(context), id + ".json"));
    }
    static synchronized void write(Context context, JSONObject value) throws Exception {
        AtomicFile file = item(context, value.getString("id"));
        FileOutputStream out = null;
        try {
            out = file.startWrite();
            out.write(value.toString().getBytes(StandardCharsets.UTF_8));
            file.finishWrite(out);
        } catch (Exception error) { if (out != null) file.failWrite(out); throw error; }
    }
    static synchronized JSONObject read(Context context, String id) throws Exception {
        AtomicFile file = item(context, id);
        return file.getBaseFile().exists() ? new JSONObject(new String(file.readFully(), StandardCharsets.UTF_8)) : null;
    }
    static synchronized List<JSONObject> all(Context context) throws Exception {
        List<JSONObject> values = new ArrayList<>();
        File[] files = folder(context).listFiles((dir, name) -> name.endsWith(".json"));
        if (files != null) for (File file : files) {
            values.add(read(context, file.getName().substring(0, file.getName().length() - 5)));
        }
        return values;
    }
    static synchronized void mark(Context context, String id, String state, String error) throws Exception {
        JSONObject value = read(context, id);
        if (value != null) { value.put("state", state); value.put("error", error); write(context, value); }
    }
    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return (SecretKey) store.getKey(KEY_ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    static synchronized void setSession(Context context, JSONObject session) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        JSONObject encrypted = new JSONObject()
            .put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
            .put("data", Base64.encodeToString(cipher.doFinal(session.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP));
        AtomicFile file = new AtomicFile(new File(context.getNoBackupFilesDir(), "offline-auth.json"));
        FileOutputStream out = null;
        try { out = file.startWrite(); out.write(encrypted.toString().getBytes(StandardCharsets.UTF_8)); file.finishWrite(out); }
        catch (Exception error) { if (out != null) file.failWrite(out); throw error; }
    }
    static synchronized JSONObject session(Context context) throws Exception {
        AtomicFile file = new AtomicFile(new File(context.getNoBackupFilesDir(), "offline-auth.json"));
        if (!file.getBaseFile().exists()) return null;
        JSONObject encrypted = new JSONObject(new String(file.readFully(), StandardCharsets.UTF_8));
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(encrypted.getString("iv"), Base64.NO_WRAP)));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(encrypted.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8));
    }
    static synchronized void clearSession(Context context) {
        new AtomicFile(new File(context.getNoBackupFilesDir(), "offline-auth.json")).delete();
    }
}
