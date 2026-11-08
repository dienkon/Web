package vn.dktest.student;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

public class OfflineSyncWorkerTest {
    @Test public void refreshAcceptsNumericProjectNumberFromSecureToken() throws Exception {
        JSONObject response = new JSONObject().put("user_id", "student-a").put("project_id", "603672592444").put("id_token", "test-only-id-token");
        assertEquals("test-only-id-token", OfflineSyncWorker.refreshedToken("student-a", response));
    }
    @Test(expected = Exception.class) public void refreshRejectsAnotherStudent() throws Exception {
        OfflineSyncWorker.refreshedToken("student-a", new JSONObject().put("user_id", "student-b").put("id_token", "test-only-id-token"));
    }
    @Test public void mixedAnswersKeepTheirFirestoreTypes() throws Exception {
        JSONObject answers = new JSONObject().put("choice", "a").put("multi", new JSONArray().put("a").put("b"))
            .put("tf", new JSONObject().put("a", true).put("b", false)).put("essay", "Bài làm tự luận").put("empty", JSONObject.NULL);
        JSONObject encoded = OfflineSyncWorker.fields(answers);
        assertEquals("a", encoded.getJSONObject("choice").getString("stringValue"));
        assertEquals(2, encoded.getJSONObject("multi").getJSONObject("arrayValue").getJSONArray("values").length());
        assertFalse(encoded.getJSONObject("tf").getJSONObject("mapValue").getJSONObject("fields").getJSONObject("b").getBoolean("booleanValue"));
        assertEquals("Bài làm tự luận", encoded.getJSONObject("essay").getString("stringValue"));
        assertTrue(encoded.getJSONObject("empty").has("nullValue"));
    }
    @Test public void uploadIsCreateOnlyAndKeepsOfflineSubmissionTime() throws Exception {
        JSONObject record = new JSONObject().put("id", "sub_attempt_1800000000000").put("uid", "student-a").put("savedAt", 1800000000000L)
            .put("submission", new JSONObject().put("studentUid", "student-a").put("attemptId", "attempt_1800000000000").put("score", 8.5));
        JSONObject write = OfflineSyncWorker.createWrite("test-project", record, 1800000060000L);
        assertFalse(write.getJSONObject("currentDocument").getBoolean("exists"));
        assertTrue(write.getJSONObject("update").getString("name").endsWith("/submissions/sub_attempt_1800000000000"));
        JSONObject fields = write.getJSONObject("update").getJSONObject("fields");
        assertEquals("2027-01-15T08:00:00.000Z", fields.getJSONObject("submittedAt").getString("timestampValue"));
        assertEquals("2027-01-15T08:01:00.000Z", fields.getJSONObject("syncedAt").getString("timestampValue"));
        assertEquals(8.5, fields.getJSONObject("score").getDouble("doubleValue"), 0.001);
    }
}
