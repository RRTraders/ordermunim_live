package com.rrtraders.meeshootp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class MeeshoBackgroundService extends Service {

    public static final String CHANNEL_SERVICE = "meesho_persistent_sync_v5";
    public static final String CHANNEL_ALERT = "meesho_otp_alert_channel";
    private static final int SERVICE_NOTIFICATION_ID = 9001;

    private static final AtomicBoolean isPollingInProgress = new AtomicBoolean(false);

    private ScheduledExecutorService scheduler;
    private SharedPreferences prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
        createNotificationChannels();

        Notification notification = buildServiceNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(SERVICE_NOTIFICATION_ID, notification);
        }

        startBackgroundPolling();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && PollAlarmReceiver.ACTION_POLL.equals(intent.getAction())) {
            // Triggered by OS AlarmManager broadcast
            Executors.newSingleThreadExecutor().execute(() -> {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                PowerManager.WakeLock wakeLock = null;
                if (pm != null) {
                    try {
                        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OrderMunim:AlarmExecLock");
                        wakeLock.acquire(20000);
                    } catch (Exception ignored) {}
                }
                try {
                    pollAllAccountsStatic(this);
                } finally {
                    if (wakeLock != null && wakeLock.isHeld()) {
                        try { wakeLock.release(); } catch (Exception ignored) {}
                    }
                }
            });
        }
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // User swiped app away from Recent Apps - schedule immediate OS alarm in 5s
        PollAlarmReceiver.scheduleNextAlarm(getApplicationContext(), 5);
    }

    @Override
    public void onDestroy() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        super.onDestroy();
        // If Android system destroys service, ensure AlarmManager triggers wakeup in 15 seconds!
        PollAlarmReceiver.scheduleNextAlarm(getApplicationContext(), 15);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Delete legacy channels so Android clears out any old settings
            try {
                nm.deleteNotificationChannel("meesho_bg_service_channel");
                nm.deleteNotificationChannel("meesho_bg_service_channel_v2");
                nm.deleteNotificationChannel("meesho_bg_silent_sync_v3");
                nm.deleteNotificationChannel("meesho_silent_sync_v4");
            } catch (Exception ignored) {}

            // 1. Persistent Low-Importance Background Sync Channel (Silent, no sound/vibe, protected from swipe-kill)
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_SERVICE,
                    "OrderMunim Monitoring",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps Meesho return OTP monitoring active");
            serviceChannel.setShowBadge(false);
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            nm.createNotificationChannel(serviceChannel);

            // 2. High-Priority Alert Channel for Live OTPs
            NotificationChannel alertChannel = new NotificationChannel(
                    CHANNEL_ALERT,
                    "Return Handover OTP Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Instant alerts when Meesho courier returns arrive");
            alertChannel.enableLights(true);
            alertChannel.setLightColor(Color.MAGENTA);
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500});

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build();
            alertChannel.setSound(soundUri, audioAttrs);
            nm.createNotificationChannel(alertChannel);
        }
    }

    private Notification buildServiceNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_SERVICE)
                .setContentTitle("OrderMunim")
                .setContentText("Monitoring Return OTPs (Active)")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void startBackgroundPolling() {
        scheduler = Executors.newSingleThreadScheduledExecutor();
        // Dynamic, battery-efficient polling:
        // Runs scheduled poll task that determines next delay based on delivery hours & sleep state
        scheduleNextPoll(5);
    }

    private void scheduleNextPoll(long delaySeconds) {
        // 1. Schedule OS-level Alarm to guarantee execution even when swiped away or sleeping
        PollAlarmReceiver.scheduleNextAlarm(getApplicationContext(), delaySeconds);

        // 2. Also schedule in executor if process remains alive
        if (scheduler == null || scheduler.isShutdown()) return;
        scheduler.schedule(() -> {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            if (pm != null) {
                try {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OrderMunim:BgPoll");
                    wakeLock.acquire(15000);
                } catch (Exception ignored) {}
            }
            try {
                pollAllAccountsStatic(this);
            } catch (Exception ignored) {
            } finally {
                if (wakeLock != null && wakeLock.isHeld()) {
                    try { wakeLock.release(); } catch (Exception ignored) {}
                }
                long nextDelay = getDynamicPollDelaySecondsStatic();
                scheduleNextPoll(nextDelay);
            }
        }, delaySeconds, TimeUnit.SECONDS);
    }

    /**
     * Master Spec: Courier Hours (10:00 AM - 6:00 PM IST) = 5 minutes (300 seconds)
     *              Off-Hours   (6:00 PM - 10:00 AM IST) = 60 minutes (3600 seconds)
     * Uses IST timezone explicitly to be independent of device time zone.
     */
    public static long getDynamicPollDelaySecondsStatic() {
        try {
            java.util.Calendar cal = java.util.Calendar.getInstance(
                    java.util.TimeZone.getTimeZone("Asia/Kolkata"));
            int hourIST = cal.get(java.util.Calendar.HOUR_OF_DAY);
            // Courier delivery hours: 10:00 AM (inclusive) to 6:00 PM (exclusive) IST
            if (hourIST >= 10 && hourIST < 18) {
                return 300; // 5 minutes during courier hours (10 AM - 6 PM IST)
            } else {
                return 3600; // 60 minutes during off-hours (6 PM - 10 AM IST)
            }
        } catch (Exception e) {
            return 300;
        }
    }

    public static void pollAllAccountsStatic(Context context) {
        if (context == null) return;
        if (!isPollingInProgress.compareAndSet(false, true)) {
            return; // Prevent duplicate concurrent polling
        }
        try {
            SharedPreferences prefs = context.getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
            String currentUid = prefs.getString("current_user_uid", "");
            String sessionsJson = prefs.getString("sessions", "{}");
            JSONObject allSessions = new JSONObject(sessionsJson);

            // Midnight Auto-Reset: At 12:00 AM IST every night, wipe all OTPs to fresh state
            performMidnightResetIfNeeded(context, prefs, currentUid, allSessions);


            if (allSessions.length() == 0) {
                try {
                    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        for (int id = 3000; id <= 4500; id++) {
                            nm.cancel(id);
                        }
                    }
                } catch (Exception ignored) {}
                return;
            }

            java.util.List<String> keysList = new java.util.ArrayList<>();
            for (java.util.Iterator<String> it = allSessions.keys(); it.hasNext(); ) {
                keysList.add(it.next());
            }

            for (String syncKey : keysList) {
                JSONObject sess = allSessions.optJSONObject(syncKey);
                if (sess == null) continue;

                // Cross-Account Isolation Guard:
                // Strictly only poll sessions matching the current logged-in user!
                if (!currentUid.isEmpty()) {
                    String sessUid = sess.optString("userId", "");
                    if (!sessUid.isEmpty() && !currentUid.equals(sessUid)) {
                        continue;
                    }
                }

                pollSingleAccountStatic(context, syncKey, sess, prefs);
            }
        } catch (Exception ignored) {
        } finally {
            isPollingInProgress.set(false);
        }
    }

    private static void pollSingleAccountStatic(Context context, String syncKey, JSONObject sess, SharedPreferences prefs) {
        pollSingleAccountStatic(context, syncKey, sess, prefs, false);
    }

    private static void pollSingleAccountStatic(Context context, String syncKey, JSONObject sess, SharedPreferences prefs, boolean isRetry) {
        HttpURLConnection conn = null;
        try {
            String cookies = sess.optString("cookies", "");
            String identifier = MeeshoDirectPlugin.extractIdentifierFromCookies(cookies, sess.optString("identifier", ""));
            long supplierId = MeeshoDirectPlugin.extractSupplierIdFromCookies(cookies, sess.optLong("supplierId", 0));
            String storeName = sess.optString("storeName", "Meesho Store");
            String email = sess.optString("email", "");
            String password = sess.optString("password", "");
            String docId = sess.optString("docId", "");
            String timeStr = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date());

            String sessionsJson = prefs.getString("sessions", "{}");
            JSONObject allSessions = new JSONObject(sessionsJson);

            // 1. Resolve docId to real Firestore ID (e.g. MSH-6234)
            if (docId.isEmpty() || !docId.startsWith("MSH-")) {
                if (syncKey.startsWith("MSH-")) {
                    docId = syncKey;
                } else {
                    for (java.util.Iterator<String> sit = allSessions.keys(); sit.hasNext(); ) {
                        String sk = sit.next();
                        if (sk.startsWith("MSH-")) {
                            JSONObject sObj = allSessions.getJSONObject(sk);
                            String sIdent = MeeshoDirectPlugin.extractIdentifierFromCookies(sObj.optString("cookies", ""), sObj.optString("identifier", ""));
                            if (sIdent.equals(identifier) || (!email.isEmpty() && sObj.optString("email", "").equalsIgnoreCase(email))) {
                                docId = sk;
                                break;
                            }
                        }
                    }
                }
            }
            if (docId.isEmpty()) docId = syncKey;

            // 2. Resolve email & password across all stored sessions if missing
            if (password.isEmpty() || email.isEmpty()) {
                for (java.util.Iterator<String> sit = allSessions.keys(); sit.hasNext(); ) {
                    String sk = sit.next();
                    JSONObject sObj = allSessions.getJSONObject(sk);
                    String sIdent = MeeshoDirectPlugin.extractIdentifierFromCookies(sObj.optString("cookies", ""), sObj.optString("identifier", ""));
                    boolean match = (!identifier.isEmpty() && sIdent.equals(identifier)) || (!email.isEmpty() && sObj.optString("email", "").equalsIgnoreCase(email));
                    if (match) {
                        if (password.isEmpty() && !sObj.optString("password", "").isEmpty()) {
                            password = sObj.optString("password", "");
                        }
                        if (email.isEmpty() && !sObj.optString("email", "").isEmpty()) {
                            email = sObj.optString("email", "");
                        }
                    }
                }
            }

            if (email.isEmpty()) {
                String vaultEmail = MeeshoDirectPlugin.getEmailFromPermanentVault(context, identifier);
                if (!vaultEmail.isEmpty()) {
                    email = vaultEmail;
                    sess.put("email", vaultEmail);
                }
            }

            if (password.isEmpty()) {
                String permPass = MeeshoDirectPlugin.getPasswordFromPermanentVault(context, email, identifier);
                if (!permPass.isEmpty()) {
                    password = permPass;
                    sess.put("password", permPass);
                }
            }

            if (cookies.isEmpty() && (!email.isEmpty() && !password.isEmpty())) {
                cookies = autoReloginStatic(context, email, password, docId, prefs);
            }
            if (cookies.isEmpty()) return;

            // Always resolve true 5-char Meesho identifier & numeric supplierId from cookies or registration status API
            JSONObject resolvedIdentity = MeeshoDirectPlugin.resolveSupplierIdentityStatic(cookies, identifier, supplierId);
            identifier = resolvedIdentity.optString("identifier", identifier);
            supplierId = resolvedIdentity.optLong("supplierId", supplierId);
            if (!identifier.isEmpty()) sess.put("identifier", identifier);
            if (supplierId > 0) sess.put("supplierId", supplierId);

            // Fetch Delivery OTPs
            URL url = new URL(SecurityShield.getFetchDeliveryOtpsUrl());
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setDoInput(true);
            conn.setDoOutput(true);

            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
            conn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
            conn.setRequestProperty(SecurityShield.getHeaderBrowserId(), getStableBrowserId(prefs));
            if (!identifier.isEmpty()) conn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
            conn.setRequestProperty("Cookie", cookies);
            conn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
            conn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

            // 1. Primary Payload with both identifier and supplier_id (prevents HTTP 500 on m-web sessions)
            JSONObject payload = new JSONObject();
            if (!identifier.isEmpty()) {
                payload.put("identifier", identifier);
            }
            if (supplierId > 0) {
                payload.put("supplier_id", supplierId);
            }
            payload.put("child_supplier_identifier", JSONObject.NULL);
            payload.put("child_supplier_id", JSONObject.NULL);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();

            if (code == 401 || code == 403) {
                // Auto re-login silently once if cookie expired, then immediately retry fetch!
                if (!isRetry && !email.isEmpty() && !password.isEmpty()) {
                    String freshCookies = autoReloginStatic(context, email, password, docId, prefs);
                    if (!freshCookies.isEmpty()) {
                        sess.put("cookies", freshCookies);
                        sess.put("identifier", MeeshoDirectPlugin.extractIdentifierFromCookies(freshCookies, identifier));
                        sess.put("supplierId", MeeshoDirectPlugin.extractSupplierIdFromCookies(freshCookies, supplierId));
                        sess.put("docId", docId);
                        sess.put("email", email);
                        sess.put("password", password);
                        pollSingleAccountStatic(context, docId, sess, prefs, true);
                        return;
                    }
                }
                // Do NOT mark session_expired in Firestore so website is never disrupted. Phone will auto-retry next cycle.
                android.util.Log.w("MeeshoBackgroundService", "HTTP " + code + " for " + docId + ", preserving live status and retrying next cycle.");
                return;
            }

            // Fallback retry without supplier_id if non-200
            if (code != 200 && supplierId > 0) {
                try {
                    HttpURLConnection retryConn = (HttpURLConnection) new URL(SecurityShield.getFetchDeliveryOtpsUrl()).openConnection();
                    retryConn.setRequestMethod("POST");
                    retryConn.setConnectTimeout(8000);
                    retryConn.setReadTimeout(8000);
                    retryConn.setDoInput(true);
                    retryConn.setDoOutput(true);
                    retryConn.setRequestProperty("Content-Type", "application/json");
                    retryConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                    retryConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                    retryConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                    retryConn.setRequestProperty(SecurityShield.getHeaderBrowserId(), getStableBrowserId(prefs));
                    if (!identifier.isEmpty()) retryConn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
                    retryConn.setRequestProperty("Cookie", cookies);
                    retryConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                    retryConn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
                    retryConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

                    JSONObject retryPayload = new JSONObject();
                    if (!identifier.isEmpty()) retryPayload.put("identifier", identifier);
                    retryPayload.put("child_supplier_identifier", JSONObject.NULL);
                    retryPayload.put("child_supplier_id", JSONObject.NULL);

                    try (OutputStream ros = retryConn.getOutputStream()) {
                        ros.write(retryPayload.toString().getBytes(StandardCharsets.UTF_8));
                    }
                    if (retryConn.getResponseCode() == 200) {
                        conn = retryConn;
                        code = 200;
                    }
                } catch (Exception ignored) {}
            }

            if (code == 200) {
                String resp = readStream(conn.getInputStream());
                JSONObject json = new JSONObject(resp.isEmpty() ? "{}" : resp);
                
                // Deep array lookup across all known Meesho response structures
                JSONArray otps = json.optJSONArray("supplier_delivery_otp");
                if (otps == null) otps = json.optJSONArray("delivery_otps");
                if (otps == null) otps = json.optJSONArray("otps");
                if (otps == null) otps = json.optJSONArray("rto_otps");
                if (otps == null) otps = json.optJSONArray("return_otps");

                if (otps == null && json.has("data")) {
                    Object d = json.get("data");
                    if (d instanceof JSONObject) {
                        JSONObject dObj = (JSONObject) d;
                        otps = dObj.optJSONArray("supplier_delivery_otp");
                        if (otps == null) otps = dObj.optJSONArray("delivery_otps");
                        if (otps == null) otps = dObj.optJSONArray("otps");
                        if (otps == null) otps = dObj.optJSONArray("rto_otps");
                    } else if (d instanceof JSONArray) {
                        otps = (JSONArray) d;
                    }
                }

                boolean anyActiveOtp = false;
                JSONArray collectedOtpList = new JSONArray();
                String firstOtp = "----";
                String firstCourier = "No Return";
                int firstCount = 0;

                if (otps != null && otps.length() > 0) {
                    for (int i = 0; i < otps.length(); i++) {
                        JSONObject item = otps.getJSONObject(i);
                        
                        // 1. Direct field lookup
                        String otp = item.optString("otp", item.optString("delivery_otp", item.optString("handover_otp", item.optString("end_otp", item.optString("valmo_otp", ""))))).trim();
                        
                        // 2. Nested otp_details lookup
                        JSONArray details = item.optJSONArray("otp_details");
                        if (details != null && details.length() > 0) {
                            for (int j = 0; j < details.length(); j++) {
                                JSONObject d = details.optJSONObject(j);
                                if (d != null && d.optBoolean("active", true)) {
                                    String candidate = d.optString("otp", d.optString("delivery_otp", d.optString("end_otp", d.optString("handover_otp", "")))).trim();
                                    if (!candidate.isEmpty() && !candidate.equals("----")) {
                                        otp = candidate;
                                        break;
                                    }
                                }
                            }
                            if (otp.isEmpty() || otp.equals("----")) {
                                for (int j = 0; j < details.length(); j++) {
                                    JSONObject d = details.optJSONObject(j);
                                    if (d != null) {
                                        String candidate = d.optString("otp", d.optString("delivery_otp", d.optString("end_otp", d.optString("handover_otp", "")))).trim();
                                        if (!candidate.isEmpty() && !candidate.equals("----")) {
                                            otp = candidate;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // 3. Regex fallback across item text for any 4-to-6 digit OTP
                        if (otp.isEmpty() || otp.equals("----")) {
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"(?:otp|delivery_otp|handover_otp|end_otp|valmo_otp)\"\\s*:\\s*\"?(\\d{4,6})\"?").matcher(item.toString());
                            if (m.find()) {
                                otp = m.group(1);
                            }
                        }

                        if (otp.isEmpty() || otp.equals("----")) continue;

                        JSONObject carrier = item.optJSONObject("carrier_details");
                        String courier = carrier != null ? carrier.optString("name", carrier.optString("carrier_name", "Courier")) : item.optString("carrier_name", item.optString("name", "Courier"));
                        if (courier.equalsIgnoreCase("delhivery")) courier = "Delhivery";
                        else if (courier.equalsIgnoreCase("shadowfax")) courier = "Shadowfax";
                        else if (courier.equalsIgnoreCase("xpressbees")) courier = "Xpressbees";
                        else if (courier.equalsIgnoreCase("ecom_express")) courier = "Ecom Express";
                        else if (courier.equalsIgnoreCase("valmo")) courier = "Valmo";

                        int count = item.optInt("count", item.optInt("total_handover_count", item.optInt("total_shipment_count", item.optInt("handover_count", 0))));
                        JSONObject dsd = item.optJSONObject("delivery_shipment_details");
                        if (count == 0 && dsd != null) {
                            count = dsd.optInt("total_handover_count", dsd.optInt("total_shipment_count", dsd.optInt("count", 0)));
                        }

                        JSONObject otpItem = new JSONObject();
                        otpItem.put("otp", otp);
                        otpItem.put("courier", courier);
                        otpItem.put("handoverCount", count);
                        otpItem.put("dateTime", timeStr);
                        collectedOtpList.put(otpItem);

                        String lastNotifiedKey = "last_notified_" + syncKey + "_" + courier;
                        String lastNotified = prefs.getString(lastNotifiedKey, "");
                        String currentSig = otp + "_" + count;

                        if (!currentSig.equals(lastNotified)) {
                            // New or updated return OTP — FIRE HIGH PRIORITY ALERT NOTIFICATION!
                            triggerOtpAlertStatic(context, syncKey, storeName, courier, otp, count, i + 1, prefs);
                            prefs.edit().putString(lastNotifiedKey, currentSig).apply();
                        }

                        if (!anyActiveOtp) {
                            anyActiveOtp = true;
                            firstOtp = otp;
                            firstCourier = courier;
                            firstCount = count;
                        }
                    }
                }

                if (anyActiveOtp) {
                    syncToFirestore(docId, firstOtp, firstCourier, firstCount, timeStr, "live", null, collectedOtpList, prefs);
                } else {
                    // Reset notified flags when no active returns are pending
                    SharedPreferences.Editor editor = prefs.edit();
                    for (String k : prefs.getAll().keySet()) {
                        if (k.startsWith("last_notified_" + syncKey)) {
                            editor.remove(k);
                        }
                    }
                    editor.apply();

                    // Sync fresh timestamp to Firestore on every poll so website updates in real time
                    syncToFirestore(docId, "----", "No Return", 0, timeStr, "live", null, new JSONArray(), prefs);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception ignored) {}
            }
        }
    }

    private static void syncToFirestore(String docId, String otp, String courier, int count, String dateTime, String status, String cookies, JSONArray otpList, SharedPreferences prefs) {
        if (docId == null || !docId.trim().startsWith("MSH-")) return;
        HttpURLConnection conn = null;
        try {
            String encodedDocId = java.net.URLEncoder.encode(docId.trim(), "UTF-8");
            StringBuilder queryParams = new StringBuilder();
            if (otp == null) {
                queryParams.append("?currentDocument.exists=true&updateMask.fieldPaths=status");
            } else {
                queryParams.append("?currentDocument.exists=true&updateMask.fieldPaths=currentOtp&updateMask.fieldPaths=courier&updateMask.fieldPaths=handoverCount&updateMask.fieldPaths=dateTime&updateMask.fieldPaths=status&updateMask.fieldPaths=lastUpdated");
            }
            if (cookies != null && !cookies.isEmpty()) {
                queryParams.append("&updateMask.fieldPaths=cookies");
            }
            if (otpList != null) {
                queryParams.append("&updateMask.fieldPaths=otpList");
            }
            URL url = new URL(SecurityShield.getFirestoreAccountsUrl(encodedDocId, queryParams.toString()));
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setDoOutput(true);

            JSONObject fields = new JSONObject();
            if (otp != null) {
                JSONObject fOtp = new JSONObject(); fOtp.put("stringValue", otp); fields.put("currentOtp", fOtp);
                JSONObject fCourier = new JSONObject(); fCourier.put("stringValue", courier != null ? courier : "No Return"); fields.put("courier", fCourier);
                JSONObject fCount = new JSONObject(); fCount.put("integerValue", String.valueOf(count)); fields.put("handoverCount", fCount);
                JSONObject fTime = new JSONObject(); fTime.put("stringValue", dateTime != null ? dateTime : ""); fields.put("dateTime", fTime);
            }
            JSONObject fStatus = new JSONObject(); fStatus.put("stringValue", status != null ? status : "live"); fields.put("status", fStatus);
            if (cookies != null && !cookies.isEmpty()) {
                JSONObject fCook = new JSONObject(); fCook.put("stringValue", cookies); fields.put("cookies", fCook);
            }
            if (otpList != null) {
                JSONArray arr = new JSONArray();
                for (int m = 0; m < otpList.length(); m++) {
                    JSONObject item = otpList.getJSONObject(m);
                    JSONObject mapFields = new JSONObject();
                    JSONObject mOtp = new JSONObject(); mOtp.put("stringValue", item.optString("otp", "----")); mapFields.put("otp", mOtp);
                    JSONObject mCourier = new JSONObject(); mCourier.put("stringValue", item.optString("courier", "")); mapFields.put("courier", mCourier);
                    JSONObject mCount = new JSONObject(); mCount.put("integerValue", String.valueOf(item.optInt("handoverCount", 0))); mapFields.put("handoverCount", mCount);
                    JSONObject mTime = new JSONObject(); mTime.put("stringValue", item.optString("dateTime", "")); mapFields.put("dateTime", mTime);
                    JSONObject mapVal = new JSONObject(); mapVal.put("fields", mapFields);
                    JSONObject entry = new JSONObject(); entry.put("mapValue", mapVal);
                    arr.put(entry);
                }
                JSONObject arrObj = new JSONObject(); arrObj.put("values", arr);
                JSONObject fList = new JSONObject(); fList.put("arrayValue", arrObj);
                fields.put("otpList", fList);
            }
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            JSONObject fLast = new JSONObject(); fLast.put("stringValue", iso.format(new Date())); fields.put("lastUpdated", fLast);

            JSONObject body = new JSONObject();
            body.put("fields", fields);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int fCode = conn.getResponseCode();
            if (fCode == 404 && prefs != null) {
                // Document was deleted in Firestore — purge this dead session key from SharedPreferences!
                try {
                    String sJson = prefs.getString("sessions", "{}");
                    JSONObject all = new JSONObject(sJson);
                    if (all.has(docId.trim())) {
                        all.remove(docId.trim());
                        prefs.edit().putString("sessions", all.toString()).apply();
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private static void triggerOtpAlertStatic(Context context, String syncKey, String storeName, String courier, String otp, int count, int index, SharedPreferences prefs) {
        try {
            // Guard: Verify session belongs to active device user before triggering notification
            String currentUid = prefs.getString("current_user_uid", "");
            String sessionsJson = prefs.getString("sessions", "{}");
            JSONObject allSessions = new JSONObject(sessionsJson);
            if (allSessions.has(syncKey)) {
                JSONObject s = allSessions.getJSONObject(syncKey);
                if (!currentUid.isEmpty()) {
                    String sUid = s.optString("userId", "");
                    if (!sUid.isEmpty() && !currentUid.equals(sUid)) {
                        return; // Cross-account protection: Strictly skip alerting for another user!
                    }
                }
            }

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Tap Notification -> Open App
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                    context, 100 + index, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // Copy Action Button
            Intent copyIntent = new Intent(context, CopyOtpReceiver.class);
            copyIntent.putExtra("otp", otp);
            PendingIntent copyPending = PendingIntent.getBroadcast(
                    context, 200 + index, copyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            String title = "🚚 " + courier + " Return Handover: " + otp;
            String text = count + " " + (count == 1 ? "Parcel" : "Parcels") + " • " + storeName;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ALERT)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setStyle(new NotificationCompat.BigTextStyle()
                            .bigText("New return handover OTP for " + storeName + "\nCourier: " + courier + "\nParcels: " + count + "\nOTP: " + otp))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setDefaults(Notification.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(openPending)
                    .addAction(android.R.drawable.ic_menu_save, "📋 COPY OTP (" + otp + ")", copyPending);

            nm.notify(3000 + (syncKey.hashCode() % 1000) + index, builder.build());
        } catch (Exception ignored) {}
    }

    private static String autoReloginStatic(Context context, String email, String password, String syncKey, SharedPreferences prefs) {
        if (context == null || email == null || email.isEmpty() || password == null || password.isEmpty()) {
            return "";
        }

        final String[] resultCookies = {""};
        final java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                WebView webView = new WebView(context);
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36");

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                final boolean[] isDone = {false};
                final Handler timeoutHandler = new Handler(Looper.getMainLooper());
                final Runnable timeoutRunnable = () -> {
                    if (!isDone[0]) {
                        isDone[0] = true;
                        try { webView.destroy(); } catch (Exception ignored) {}
                        latch.countDown();
                    }
                };
                timeoutHandler.postDelayed(timeoutRunnable, 35000);

                webView.setWebViewClient(new WebViewClient() {
                    private boolean injected = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (isDone[0]) return;

                        if (url != null && url.contains("login") && !injected) {
                            injected = true;
                            String jsInject = "(function() {" +
                                    "  var retryCount = 0;" +
                                    "  var timer = setInterval(function() {" +
                                    "    retryCount++;" +
                                    "    try {" +
                                    "      var em = document.querySelector('input[name=\"emailOrPhone\"]') || " +
                                    "               document.querySelector('input[name=\"email\"]') || " +
                                    "               document.querySelector('input[type=\"email\"]') || " +
                                    "               document.querySelector('input:not([type=\"password\"]):not([type=\"hidden\"])');" +
                                    "      var pw = document.querySelector('input[name=\"password\"]') || " +
                                    "               document.querySelector('input[type=\"password\"]');" +
                                    "      var btn = document.querySelector('button[type=\"submit\"]') || " +
                                    "                document.querySelector('form button') || " +
                                    "                Array.from(document.querySelectorAll('button')).find(function(b) { return /log\\s*in|sign\\s*in|submit/i.test(b.innerText || ''); });" +
                                    "      if (em && pw && btn) {" +
                                    "        clearInterval(timer);" +
                                    "        var setVal = function(el, val) {" +
                                    "          var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ? " +
                                    "                       Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set : null;" +
                                    "          if (setter) { setter.call(el, val); } else { el.value = val; }" +
                                    "          el.dispatchEvent(new Event('input', { bubbles: true }));" +
                                    "          el.dispatchEvent(new Event('change', { bubbles: true }));" +
                                    "          el.dispatchEvent(new Event('blur', { bubbles: true }));" +
                                    "        };" +
                                    "        setVal(em, " + JSONObject.quote(email) + ");" +
                                    "        setVal(pw, " + JSONObject.quote(password) + ");" +
                                    "        setTimeout(function() {" +
                                    "          try {" +
                                    "            btn.click();" +
                                    "            if (btn.form) { btn.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }" +
                                    "          } catch(e) {}" +
                                    "        }, 400);" +
                                    "      }" +
                                    "    } catch(e) {}" +
                                    "    if (retryCount > 60) { clearInterval(timer); }" +
                                    "  }, 350);" +
                                    "})();";
                            view.evaluateJavascript(jsInject, null);

                            Handler poller = new Handler(Looper.getMainLooper());
                            poller.postDelayed(new Runnable() {
                                private int attempts = 0;
                                @Override
                                public void run() {
                                    if (isDone[0]) return;
                                    attempts++;

                                    CookieManager cm = CookieManager.getInstance();
                                    String raw = cm.getCookie("https://supplier.meesho.com");
                                    if (raw == null) raw = "";

                                    boolean hasSid = raw.contains("connect.sid=");
                                    boolean hasIdent = raw.contains("current_az_identifier=") || (raw.contains("s_id=") && raw.contains("mixpanel="));
                                    String curUrl = view.getUrl() != null ? view.getUrl() : "";

                                    if ((hasSid && hasIdent) || curUrl.contains("fulfillment") || curUrl.contains("growth") || curUrl.contains("dashboard")) {
                                        isDone[0] = true;
                                        timeoutHandler.removeCallbacks(timeoutRunnable);
                                        resultCookies[0] = raw;
                                        try { webView.destroy(); } catch (Exception ignored) {}
                                        latch.countDown();
                                        return;
                                    }

                                    if (attempts < 60) {
                                        poller.postDelayed(this, 500);
                                    } else {
                                        isDone[0] = true;
                                        timeoutHandler.removeCallbacks(timeoutRunnable);
                                        try { view.destroy(); } catch (Exception ignored) {}
                                        latch.countDown();
                                    }
                                }
                            }, 800);
                        }
                    }
                });

                webView.loadUrl(SecurityShield.getLoginRefererUrl());
            } catch (Exception e) {
                latch.countDown();
            }
        });

        try {
            latch.await(38, TimeUnit.SECONDS);
        } catch (InterruptedException ignored) {}

        String freshCookies = resultCookies[0];
        if (!freshCookies.isEmpty()) {
            try {
                String sessionsJson = prefs.getString("sessions", "{}");
                JSONObject all = new JSONObject(sessionsJson);
                String resolvedDocId = syncKey;
                JSONObject resolvedIdentity = MeeshoDirectPlugin.resolveSupplierIdentityStatic(freshCookies, "", 0);
                String extractedIdent = resolvedIdentity.optString("identifier", "");
                long extractedSupId = resolvedIdentity.optLong("supplierId", 0);

                for (java.util.Iterator<String> sit = all.keys(); sit.hasNext(); ) {
                    String sk = sit.next();
                    JSONObject cur = all.getJSONObject(sk);
                    if (sk.equals(syncKey) || (cur.has("email") && cur.optString("email", "").equalsIgnoreCase(email))) {
                        cur.put("cookies", freshCookies);
                        cur.put("expired", false);
                        if (!extractedIdent.isEmpty()) cur.put("identifier", extractedIdent);
                        if (extractedSupId > 0) cur.put("supplierId", extractedSupId);
                        if (resolvedDocId.equals(syncKey) && !cur.optString("docId", "").isEmpty()) {
                            resolvedDocId = cur.optString("docId", "");
                        }
                    }
                }
                prefs.edit().putString("sessions", all.toString()).apply();
                MeeshoDirectPlugin.saveToPermanentVault(context, email, password, extractedIdent);

                String timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                syncToFirestore(resolvedDocId, null, null, -1, timeStr, "live", freshCookies, null, prefs);
                return freshCookies;
            } catch (Exception ignored) {}
        }

        return "";
    }

    private static String getStableBrowserId(SharedPreferences prefs) {
        try {
            String bid = prefs.getString("stable_browser_id", "");
            if (bid.isEmpty()) {
                bid = android.util.Base64.encodeToString(("om_" + System.currentTimeMillis() + "_" + java.util.UUID.randomUUID().toString()).getBytes(StandardCharsets.UTF_8), android.util.Base64.NO_WRAP);
                prefs.edit().putString("stable_browser_id", bid).apply();
            }
            return bid;
        } catch (Exception e) {
            return "b21fc3RhYmxlX21lZXNob19vdHA=";
        }
    }

    private static String getStableInstanceId(SharedPreferences prefs) {
        try {
            String inst = prefs.getString("stable_instance_id", "");
            if (inst.isEmpty()) {
                inst = "inst_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 10000);
                prefs.edit().putString("stable_instance_id", inst).apply();
            }
            return inst;
        } catch (Exception e) {
            return "inst_default_order_munim";
        }
    }

    private static String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Midnight Auto-Reset (Master Spec Feature 4):
     * At 12:00 AM IST every calendar day, reset all account OTPs in Firestore to clean slate:
     * currentOtp: "----", courier: "No Return", handoverCount: 0, otpList: []
     * This ensures each morning starts fresh without yesterday's stale OTPs.
     */
    private static void performMidnightResetIfNeeded(Context context, SharedPreferences prefs, String currentUid, JSONObject allSessions) {
        try {
            java.util.Calendar now = java.util.Calendar.getInstance(
                    java.util.TimeZone.getTimeZone("Asia/Kolkata"));
            // Build today's date string in IST
            String todayIST = now.get(java.util.Calendar.YEAR) + "-"
                    + now.get(java.util.Calendar.MONTH) + "-"
                    + now.get(java.util.Calendar.DAY_OF_MONTH);
            String lastResetDay = prefs.getString("last_midnight_reset_day", "");
            if (todayIST.equals(lastResetDay)) return; // Already reset today — skip

            // Mark reset done for today FIRST (prevents infinite retry loops)
            prefs.edit().putString("last_midnight_reset_day", todayIST).apply();

            android.util.Log.i("MeeshoBackgroundService", "[MidnightReset] New day detected: " + todayIST + ". Resetting all OTPs to clean state.");

            // Iterate all sessions and reset OTP fields in Firestore
            java.util.List<String> keysList = new java.util.ArrayList<>();
            for (java.util.Iterator<String> it = allSessions.keys(); it.hasNext(); ) {
                keysList.add(it.next());
            }

            // Clear local notification history so fresh OTP alerts fire correctly on new day
            SharedPreferences.Editor editor = prefs.edit();
            for (String key : prefs.getAll().keySet()) {
                if (key.startsWith("last_notified_")) {
                    editor.remove(key);
                }
            }
            editor.apply();

            for (String syncKey : keysList) {
                try {
                    JSONObject sess = allSessions.optJSONObject(syncKey);
                    if (sess == null) continue;
                    // Cross-account isolation
                    if (!currentUid.isEmpty()) {
                        String sessUid = sess.optString("userId", "");
                        if (!sessUid.isEmpty() && !currentUid.equals(sessUid)) continue;
                    }
                    // Determine the Firestore docId
                    String docId = sess.optString("docId", "");
                    if (docId.isEmpty() || !docId.startsWith("MSH-")) {
                        if (syncKey.startsWith("MSH-")) docId = syncKey;
                        else continue;
                    }
                    // Reset Firestore OTP fields via REST API
                    SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                    String encodedDocId = java.net.URLEncoder.encode(docId.trim(), "UTF-8");
                    String queryParams = "?currentDocument.exists=true" +
                            "&updateMask.fieldPaths=currentOtp" +
                            "&updateMask.fieldPaths=courier" +
                            "&updateMask.fieldPaths=handoverCount" +
                            "&updateMask.fieldPaths=otpList" +
                            "&updateMask.fieldPaths=lastUpdated";
                    URL url = new URL(SecurityShield.getFirestoreAccountsUrl(encodedDocId, queryParams));
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    conn.setDoOutput(true);

                    JSONObject fields = new JSONObject();
                    JSONObject fOtp = new JSONObject(); fOtp.put("stringValue", "----"); fields.put("currentOtp", fOtp);
                    JSONObject fCourier = new JSONObject(); fCourier.put("stringValue", "No Return"); fields.put("courier", fCourier);
                    JSONObject fCount = new JSONObject(); fCount.put("integerValue", "0"); fields.put("handoverCount", fCount);
                    JSONObject fList = new JSONObject();
                    JSONObject arrObj = new JSONObject(); arrObj.put("values", new JSONArray());
                    fList.put("arrayValue", arrObj); fields.put("otpList", fList);
                    JSONObject fLast = new JSONObject(); fLast.put("stringValue", iso.format(new Date())); fields.put("lastUpdated", fLast);
                    JSONObject body = new JSONObject(); body.put("fields", fields);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    }
                    conn.getResponseCode(); // Execute the call
                    try { conn.disconnect(); } catch (Exception ignored) {}
                    android.util.Log.i("MeeshoBackgroundService", "[MidnightReset] Cleared OTPs for docId: " + docId);
                } catch (Exception e) {
                    android.util.Log.w("MeeshoBackgroundService", "[MidnightReset] Error resetting docId: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            android.util.Log.w("MeeshoBackgroundService", "[MidnightReset] Exception: " + e.getMessage());
        }
    }
}

