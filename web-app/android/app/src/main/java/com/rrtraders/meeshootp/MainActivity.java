package com.rrtraders.meeshootp;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MeeshoDirectPlugin.class);
        super.onCreate(savedInstanceState);

        // 1. Request Runtime Notification Permission (so user gets 24/7 return OTP alerts)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // 2. Request Battery Optimization Exemption so Android never kills the 24/7 OTP service
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            }
        } catch (Exception ignored) {}

        // 3. Immediately start background foreground service
        try {
            Intent serviceIntent = new Intent(this, MeeshoBackgroundService.class);
            ContextCompat.startForegroundService(this, serviceIntent);
        } catch (Exception ignored) {}

        // 4. Purge stale WebView cache to ensure 100% fresh local asset execution
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().clearCache(true);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        // Instant OTP fetch whenever user opens or returns to the app
        try {
            final Context appCtx = getApplicationContext();
            java.util.concurrent.Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    MeeshoBackgroundService.pollAllAccountsStatic(appCtx);
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}

        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                    "try { window.dispatchEvent(new Event('nativeAppResume')); } catch(e){}",
                    null
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(
                    "(function() { try { if (window.handleAndroidBackButton) { return window.handleAndroidBackButton(); } } catch(e){} return 'default'; })()",
                    value -> {
                        try {
                            if ("\"default\"".equals(value) || "null".equals(value) || value == null) {
                                runOnUiThread(() -> finish());
                            } else if ("\"exit\"".equals(value)) {
                                finishAffinity();
                            }
                        } catch (Exception ignored) {}
                    }
                );
                return;
            }
        } catch (Exception ignored) {}
        super.onBackPressed();
    }
}
