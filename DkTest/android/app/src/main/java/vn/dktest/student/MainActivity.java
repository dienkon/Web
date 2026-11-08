package vn.dktest.student;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OfflineSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
