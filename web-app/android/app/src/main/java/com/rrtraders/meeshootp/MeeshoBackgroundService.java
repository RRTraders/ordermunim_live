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

    public static final String CHANNEL_SERVICE = "meesho_bg_service_channel";
    public static final String CHANNEL_ALERT = "meesho_otp_alert_channel";
    private static final int SERVICE_NOTIFICATION_ID = 9001;

    private ScheduledExecutorService scheduler;
    private SharedPreferences prefs;

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
        createNotificationChannels();

        Notification notification = buildServiceNotification("Meesho OTP Service • Active Monitoring");
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
    public void onDestroy() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        super.onDestroy();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // 1. Silent Background Service Channel
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_SERVICE,
                    "Meesho Background Sync",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps Meesho OTP monitoring active 24/7");
            serviceChannel.setShowBadge(false);
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

    private Notification buildServiceNotification(String text) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_SERVICE)
                .setContentTitle("Meesho OTP Monitor")
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void startBackgroundPolling() {
        scheduler = Executors.newSingleThreadScheduledExecutor();
        // Check every 30 seconds directly from device
        scheduler.scheduleWithFixedDelay(this::pollAllAccounts, 5, 30, TimeUnit.SECONDS);
    }

    private void pollAllAccounts() {
        try {
            String sessionsJson = prefs.getString("sessions", "{}");
            JSONObject allSessions = new JSONObject(sessionsJson);
            java.util.Set<String> polledSet = new java.util.HashSet<>();

            for (java.util.Iterator<String> it = allSessions.keys(); it.hasNext(); ) {
                String syncKey = it.next();
                JSONObject sess = allSessions.getJSONObject(syncKey);
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
        try {
            String identifier = sess.optString("identifier", "");
            long supplierId = sess.optLong("supplierId", 0);
            String cookies = sess.optString("cookies", "");
            String storeName = sess.optString("storeName", "Meesho Store");
            String email = sess.optString("email", "");
            String password = sess.optString("password", "");

            if (cookies.isEmpty() && (!email.isEmpty() && !password.isEmpty())) {
                cookies = autoRelogin(email, password, syncKey);
            }
            if (cookies.isEmpty()) return;

            // Fetch Delivery OTPs
            URL url = new URL("https://supplier.meesho.com/api/fulfillment/returnRto/fetchDeliveryOTPs");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoInput(true);
            conn.setDoOutput(true);

            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("client-type", "d-web");
            conn.setRequestProperty("client-package-version", "1.0.41");
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
                // Auto re-login silently if cookie expired
                if (!email.isEmpty() && !password.isEmpty()) {
                    cookies = autoRelogin(email, password, syncKey);
                    if (!cookies.isEmpty()) {
                        sess.put("cookies", cookies);
                        // Immediately fetch OTPs with the fresh cookies!
                        pollSingleAccount(syncKey, sess);
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
                }
            }
        } catch (Exception ignored) {}
    }

    private void triggerOtpAlert(String syncKey, String storeName, String courier, String otp, int count, int index) {
        try {
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
        try {
            String deviceId = Build.FINGERPRINT;
            if (deviceId == null || deviceId.isEmpty()) {
                deviceId = "google/Pixel_7/panther:13/TQ3A.230705.001/10161073:user/release-keys";
            }

            JSONObject postData = new JSONObject();
            postData.put("email", email);
            postData.put("password", password);
            postData.put("device_id", deviceId);
            postData.put("instance", "inst_" + System.currentTimeMillis());

            URL url = new URL("https://supplier.meesho.com/api/container/user/v2-login");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty("client-type", "d-web");
            conn.setRequestProperty("client-package-version", "1.0.41");
            conn.setRequestProperty("Origin", "https://supplier.meesho.com");
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
                    if (all.has(syncKey)) {
                        all.getJSONObject(syncKey).put("cookies", freshCookies);
                        prefs.edit().putString("sessions", all.toString()).apply();
                    }
                    return freshCookies;
                }
            }
        } catch (Exception ignored) {}
        return "";
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
