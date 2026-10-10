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

public class MeeshoBackgroundService extends Service {

    public static final String CHANNEL_SERVICE = "meesho_silent_sync_v4";
    public static final String CHANNEL_ALERT = "meesho_otp_alert_channel";
    private static final int SERVICE_NOTIFICATION_ID = 9001;

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
        // Ensure background polling continues even when app is swiped away from Recent Apps
        try {
            Intent serviceIntent = new Intent(getApplicationContext(), MeeshoBackgroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(getApplicationContext(), serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        super.onDestroy();
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(SERVICE_NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Delete legacy channels so Android clears out any old visible settings
            try {
                nm.deleteNotificationChannel("meesho_bg_service_channel");
                nm.deleteNotificationChannel("meesho_bg_service_channel_v2");
                nm.deleteNotificationChannel("meesho_bg_silent_sync_v3");
            } catch (Exception ignored) {}

            // 1. Silent Background Service Channel (MIN importance suppresses status bar icon and sound)
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_SERVICE,
                    "OrderMunim Background Sync",
                    NotificationManager.IMPORTANCE_MIN
            );
            serviceChannel.setDescription("Keeps Meesho OTP monitoring active silently");
            serviceChannel.setShowBadge(false);
            serviceChannel.setSound(null, null);
            serviceChannel.enableVibration(false);
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
            nm.createNotificationChannel(serviceChannel);

            // 2. High-Priority Alert Channel for Live OTPs
            NotificationChannel alertChannel = new NotificationChannel(
                    CHANNEL_ALERT,
                    "Return Handover OTP Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Alerts when a courier arrives with return parcels");
            alertChannel.enableLights(true);
            alertChannel.setLightColor(Color.YELLOW);
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
                .setContentText("Background sync active")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_SECRET)
                .build();
    }

    private void startBackgroundPolling() {
        scheduler = Executors.newSingleThreadScheduledExecutor();
        // Dynamic, battery-efficient polling:
        // Runs scheduled poll task that determines next delay based on delivery hours & sleep state
        scheduleNextPoll(5);
    }

    private void scheduleNextPoll(long delaySeconds) {
        if (scheduler == null || scheduler.isShutdown()) return;
        scheduler.schedule(() -> {
            try {
                pollAllAccounts();
            } catch (Exception ignored) {
            } finally {
                // Determine next delay based on time of day to preserve battery
                long nextDelay = getDynamicPollDelaySeconds();
                scheduleNextPoll(nextDelay);
            }
        }, delaySeconds, TimeUnit.SECONDS);
    }

    /**
     * Polling schedule:
     * - Day time (10:00 AM to 06:00 PM): 60 seconds interval
     * - Rest of time (06:00 PM to 10:00 AM): 3600 seconds (1 hour) interval
     */
    private long getDynamicPollDelaySeconds() {
        try {
            java.util.Calendar cal = java.util.Calendar.getInstance();
            int hour = cal.get(java.util.Calendar.HOUR_OF_DAY);
            int minute = cal.get(java.util.Calendar.MINUTE);
            int timeInMinutes = hour * 60 + minute;

            int dayStart = 10 * 60; // 10:00 AM (600 minutes)
            int dayEnd = 18 * 60;   // 06:00 PM (1080 minutes)

            if (timeInMinutes >= dayStart && timeInMinutes < dayEnd) {
                return 60; // 60 seconds during daytime (10:00 AM to 06:00 PM)
            } else {
                return 3600; // 1 hour (3600 seconds) during rest of time (06:00 PM to 10:00 AM)
            }
        } catch (Exception e) {
            return 60;
        }
    }

    private void pollAllAccounts() {
        try {
            String currentUid = prefs.getString("current_user_uid", "");
            String sessionsJson = prefs.getString("sessions", "{}");
            JSONObject allSessions = new JSONObject(sessionsJson);

            if (allSessions.length() == 0) {
                try {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        for (int id = 3000; id <= 4500; id++) {
                            nm.cancel(id);
                        }
                    }
                } catch (Exception ignored) {}
                return;
            }

            java.util.Set<String> polledSet = new java.util.HashSet<>();

            for (java.util.Iterator<String> it = allSessions.keys(); it.hasNext(); ) {
                String syncKey = it.next();
                JSONObject sess = allSessions.getJSONObject(syncKey);

                // Cross-Account Isolation Guard:
                // Strictly only poll sessions matching the current logged-in user!
                if (!currentUid.isEmpty()) {
                    String sessUid = sess.optString("userId", "");
                    if (!sessUid.isEmpty() && !currentUid.equals(sessUid)) {
                        continue;
                    }
                }

                String ident = sess.optString("identifier", "");
                long supId = sess.optLong("supplierId", 0);
                String dedupKey = !ident.isEmpty() ? ident : (supId > 0 ? ("sup_" + supId) : syncKey);
                if (polledSet.contains(dedupKey)) {
                    continue;
                }
                polledSet.add(dedupKey);
                pollSingleAccount(syncKey, sess);
            }
        } catch (Exception ignored) {}
    }

    private void pollSingleAccount(String syncKey, JSONObject sess) {
        HttpURLConnection conn = null;
        try {
            String identifier = sess.optString("identifier", "");
            long supplierId = sess.optLong("supplierId", 0);
            String cookies = sess.optString("cookies", "");
            String storeName = sess.optString("storeName", "Meesho Store");
            String email = sess.optString("email", "");
            String password = sess.optString("password", "");
            String docId = sess.optString("docId", "");
            String timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());

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
                            if (sObj.optString("identifier", "").equals(identifier) || (!email.isEmpty() && sObj.optString("email", "").equalsIgnoreCase(email))) {
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
                    boolean match = (!identifier.isEmpty() && sObj.optString("identifier", "").equals(identifier)) || (!email.isEmpty() && sObj.optString("email", "").equalsIgnoreCase(email));
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

            if (cookies.isEmpty() && (!email.isEmpty() && !password.isEmpty())) {
                cookies = autoRelogin(email, password, docId);
            }
            if (cookies.isEmpty()) return;

            // Fetch Delivery OTPs
            URL url = new URL("https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setDoInput(true);
            conn.setDoOutput(true);

            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("client-type", "d-web");
            conn.setRequestProperty("client-package-version", "1.0.41");
            conn.setRequestProperty("browser-id", getStableBrowserId());
            if (!identifier.isEmpty()) conn.setRequestProperty("identifier", identifier);
            conn.setRequestProperty("Cookie", cookies);
            conn.setRequestProperty("Origin", "https://supplier.meesho.com");
            conn.setRequestProperty("Referer", "https://supplier.meesho.com/panel/v3/new/fulfillment/" + identifier + "/returns/overview");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");

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
                // Auto re-login silently if cookie expired, then immediately retry fetch!
                if (!email.isEmpty() && !password.isEmpty()) {
                    String freshCookies = autoRelogin(email, password, docId);
                    if (!freshCookies.isEmpty()) {
                        sess.put("cookies", freshCookies);
                        sess.put("docId", docId);
                        sess.put("email", email);
                        sess.put("password", password);
                        pollSingleAccount(docId, sess);
                    }
                }
                return;
            }

            if (code == 200) {
                String resp = readStream(conn.getInputStream());
                JSONObject json = new JSONObject(resp.isEmpty() ? "{}" : resp);
                JSONArray otps = json.optJSONArray("supplier_delivery_otp");

                // Fallback if wrapped in data object
                if (otps == null && json.has("data")) {
                    Object d = json.get("data");
                    if (d instanceof JSONObject) {
                        otps = ((JSONObject) d).optJSONArray("supplier_delivery_otp");
                    } else if (d instanceof JSONArray) {
                        otps = (JSONArray) d;
                    }
                }

                if (otps != null && otps.length() > 0) {
                    boolean firstFound = false;
                    for (int i = 0; i < otps.length(); i++) {
                        JSONObject item = otps.getJSONObject(i);
                        String otp = item.optString("otp", item.optString("delivery_otp", item.optString("handover_otp", "")));
                        JSONArray details = item.optJSONArray("otp_details");
                        if (details != null && details.length() > 0) {
                            for (int j = 0; j < details.length(); j++) {
                                JSONObject d = details.optJSONObject(j);
                                if (d != null && d.optBoolean("active", true)) {
                                    String candidate = d.optString("otp", "");
                                    if (!candidate.isEmpty() && !candidate.equals("----")) {
                                        otp = candidate;
                                        break;
                                    }
                                }
                            }
                        }
                        if (otp.isEmpty() || otp.equals("----")) continue;

                        JSONObject carrier = item.optJSONObject("carrier_details");
                        String courier = carrier != null ? carrier.optString("name", carrier.optString("carrier_name", "Courier")) : item.optString("carrier_name", item.optString("name", "Courier"));
                        if (courier.equalsIgnoreCase("delhivery")) courier = "Delhivery";
                        else if (courier.equalsIgnoreCase("shadowfax")) courier = "Shadowfax";
                        else if (courier.equalsIgnoreCase("xpressbees")) courier = "Xpressbees";

                        int count = item.optInt("count", item.optInt("total_handover_count", item.optInt("total_shipment_count", 0)));
                        JSONObject dsd = item.optJSONObject("delivery_shipment_details");
                        if (count == 0 && dsd != null) {
                            count = dsd.optInt("total_handover_count", dsd.optInt("total_shipment_count", dsd.optInt("count", 0)));
                        }

                        String lastNotifiedKey = "last_notified_" + syncKey + "_" + courier;
                        String lastNotified = prefs.getString(lastNotifiedKey, "");
                        String currentSig = otp + "_" + count;

                        if (!currentSig.equals(lastNotified)) {
                            // New or updated return OTP — FIRE HIGH PRIORITY ALERT NOTIFICATION!
                            triggerOtpAlert(syncKey, storeName, courier, otp, count, i + 1);
                            prefs.edit().putString(lastNotifiedKey, currentSig).apply();
                        }

                        if (!firstFound) {
                            firstFound = true;
                            String lastPushedKey = "last_fs_pushed_" + syncKey;
                            String prevPushed = prefs.getString(lastPushedKey, "");
                            String payloadSig = otp + "_" + courier + "_" + count;
                            if (!payloadSig.equals(prevPushed)) {
                                syncToFirestore(sess.optString("docId", syncKey), otp, courier, count, timeStr, "live");
                                prefs.edit().putString(lastPushedKey, payloadSig).apply();
                            }
                        }
                    }
                } else {
                    // Reset notified flags when no returns are pending
                    SharedPreferences.Editor editor = prefs.edit();
                    for (String k : prefs.getAll().keySet()) {
                        if (k.startsWith("last_notified_" + syncKey)) {
                            editor.remove(k);
                        }
                    }
                    editor.apply();

                    // Smart Firestore Sync: Only write if there WAS an active OTP previously (to clear it), or 15 mins heartbeat elapsed
                    String lastPushedKey = "last_fs_pushed_" + syncKey;
                    String prevPushed = prefs.getString(lastPushedKey, "");
                    String lastHeartbeatKey = "last_fs_heartbeat_" + syncKey;
                    long lastHeartbeatMs = prefs.getLong(lastHeartbeatKey, 0);

                    if (!"NO_RETURN".equals(prevPushed) || System.currentTimeMillis() - lastHeartbeatMs >= 15 * 60 * 1000L) {
                        syncToFirestore(sess.optString("docId", syncKey), "----", "No Return", 0, timeStr, "live");
                        prefs.edit()
                            .putString(lastPushedKey, "NO_RETURN")
                            .putLong(lastHeartbeatKey, System.currentTimeMillis())
                            .apply();
                    }
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

    private void syncToFirestore(String docId, String otp, String courier, int count, String dateTime, String status) {
        syncToFirestore(docId, otp, courier, count, dateTime, status, null);
    }

    private void syncToFirestore(String docId, String otp, String courier, int count, String dateTime, String status, String cookies) {
        if (docId == null || docId.trim().isEmpty()) return;
        HttpURLConnection conn = null;
        try {
            String encodedDocId = java.net.URLEncoder.encode(docId, "UTF-8");
            String queryParams;
            if (otp == null) {
                queryParams = "?updateMask.fieldPaths=status&updateMask.fieldPaths=lastUpdated";
            } else {
                queryParams = "?updateMask.fieldPaths=currentOtp&updateMask.fieldPaths=courier&updateMask.fieldPaths=handoverCount&updateMask.fieldPaths=dateTime&updateMask.fieldPaths=status&updateMask.fieldPaths=lastUpdated";
            }
            if (cookies != null && !cookies.isEmpty()) {
                queryParams += "&updateMask.fieldPaths=cookies";
            }
            queryParams += "&key=AIzaSyBXcH8anFAy8xWfQnfHcb1Pyf9J1aM0DDE";
            URL url = new URL("https://firestore.googleapis.com/v1/projects/meesho-otp-app/databases/(default)/documents/accounts/" + encodedDocId + queryParams);
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
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            iso.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            JSONObject fLast = new JSONObject(); fLast.put("stringValue", iso.format(new Date())); fields.put("lastUpdated", fLast);

            JSONObject body = new JSONObject();
            body.put("fields", fields);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            conn.getResponseCode();
        } catch (Exception ignored) {
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private void triggerOtpAlert(String syncKey, String storeName, String courier, String otp, int count, int index) {
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

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Tap Notification -> Open App
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent openPending = PendingIntent.getActivity(
                    this, 100 + index, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            // Copy Action Button
            Intent copyIntent = new Intent(this, CopyOtpReceiver.class);
            copyIntent.putExtra("otp", otp);
            PendingIntent copyPending = PendingIntent.getBroadcast(
                    this, 200 + index, copyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            String title = "🚚 " + courier + " Return Handover: " + otp;
            String text = count + " " + (count == 1 ? "Parcel" : "Parcels") + " • " + storeName;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ALERT)
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

    private String autoRelogin(String email, String password, String syncKey) {
        HttpURLConnection conn = null;
        try {
            String deviceId = Build.FINGERPRINT;
            if (deviceId == null || deviceId.isEmpty()) {
                deviceId = "google/Pixel_7/panther:13/TQ3A.230705.001/10161073:user/release-keys";
            }

            JSONObject postData = new JSONObject();
            postData.put("email", email);
            postData.put("password", password);
            postData.put("device_id", email);
            postData.put("instance", getStableInstanceId());

            URL url = new URL("https://supplier.meesho.com/api/container/user/v2-login");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("identifier", "login");
            conn.setRequestProperty("client-type", "d-web");
            conn.setRequestProperty("client-package-version", "1.0.41");
            conn.setRequestProperty("browser-id", getStableBrowserId());
            conn.setRequestProperty("Origin", "https://supplier.meesho.com");
            conn.setRequestProperty("Referer", "https://supplier.meesho.com/panel/v3/new/root/login");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(postData.toString().getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                StringBuilder cookieHeader = new StringBuilder();
                Map<String, List<String>> headers = conn.getHeaderFields();
                if (headers != null) {
                    for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                        if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("Set-Cookie")) {
                            for (String raw : entry.getValue()) {
                                String part = raw.split(";")[0].trim();
                                if (!part.isEmpty()) {
                                    if (cookieHeader.length() > 0) cookieHeader.append("; ");
                                    cookieHeader.append(part);
                                }
                            }
                        }
                    }
                }
                String freshCookies = cookieHeader.toString();
                if (!freshCookies.isEmpty()) {
                    String sessionsJson = prefs.getString("sessions", "{}");
                    JSONObject all = new JSONObject(sessionsJson);
                    String resolvedDocId = syncKey;

                    for (java.util.Iterator<String> sit = all.keys(); sit.hasNext(); ) {
                        String sk = sit.next();
                        JSONObject cur = all.getJSONObject(sk);
                        if (sk.equals(syncKey) || (cur.has("email") && cur.optString("email", "").equalsIgnoreCase(email))) {
                            cur.put("cookies", freshCookies);
                            cur.put("expired", false);
                            if (resolvedDocId.equals(syncKey) && !cur.optString("docId", "").isEmpty()) {
                                resolvedDocId = cur.optString("docId", "");
                            }
                        }
                    }
                    prefs.edit().putString("sessions", all.toString()).apply();

                    String timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    // Sync status: live and fresh cookies to Firestore without wiping active OTPs!
                    syncToFirestore(resolvedDocId, null, null, -1, timeStr, "live", freshCookies);
                    return freshCookies;
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
        return "";
    }

    private String getStableBrowserId() {
        try {
            if (prefs == null) prefs = getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
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

    private String getStableInstanceId() {
        try {
            if (prefs == null) prefs = getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
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

    private String readStream(InputStream is) {
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
}
