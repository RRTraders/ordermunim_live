package com.rrtraders.meeshootp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
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

@CapacitorPlugin(name = "MeeshoDirect")
public class MeeshoDirectPlugin extends Plugin {

    private String getDeviceFingerprint() {
        try {
            String fp = Build.FINGERPRINT;
            if (fp != null && !fp.isEmpty()) return fp;
        } catch (Exception ignored) {}
        return "google/Pixel_7/panther:13/TQ3A.230705.001/10161073:user/release-keys";
    }

    @PluginMethod
    public void login(PluginCall call) {
        String email = call.getString("email", "").trim();
        String password = call.getString("password", "");

        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Email and password are required");
            return;
        }

        getBridge().execute(() -> {
            try {
                String deviceId = getDeviceFingerprint();
                String instanceId = "inst_" + System.currentTimeMillis();

                JSONObject postData = new JSONObject();
                postData.put("email", email);
                postData.put("password", password);
                postData.put("device_id", deviceId);
                postData.put("instance", instanceId);

                URL url = new URL("https://supplier.meesho.com/api/container/user/v2-login");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setInstanceFollowRedirects(false);

                conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json, text/plain, */*");
                conn.setRequestProperty("identifier", "login");
                conn.setRequestProperty("client-type", "d-web");
                conn.setRequestProperty("client-package-version", "1.0.41");
                conn.setRequestProperty("Origin", "https://supplier.meesho.com");
                conn.setRequestProperty("Referer", "https://supplier.meesho.com/panel/v3/new/root/login");
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");

                byte[] bodyBytes = postData.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(bodyBytes);
                }

                int statusCode = conn.getResponseCode();
                InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
                String responseBody = readStream(is);

                // Extract Cookies
                StringBuilder cookieHeader = new StringBuilder();
                Map<String, List<String>> headerFields = conn.getHeaderFields();
                if (headerFields != null) {
                    for (Map.Entry<String, List<String>> entry : headerFields.entrySet()) {
                        if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("Set-Cookie")) {
                            for (String rawCookie : entry.getValue()) {
                                String part = rawCookie.split(";")[0].trim();
                                if (!part.isEmpty()) {
                                    if (cookieHeader.length() > 0) cookieHeader.append("; ");
                                    cookieHeader.append(part);
                                }
                            }
                        }
                    }
                }
                String cookies = cookieHeader.toString();

                if (statusCode == 200) {
                    String cookieIdentifier = "";
                    long cookieSupplierId = 0;
                    for (String part : cookies.split(";")) {
                        String[] kv = part.trim().split("=", 2);
                        if (kv.length == 2) {
                            if (kv[0].equalsIgnoreCase("current_az_identifier")) cookieIdentifier = kv[1];
                            if (kv[0].equalsIgnoreCase("s_id")) {
                                try { cookieSupplierId = Long.parseLong(kv[1]); } catch (Exception ignored) {}
                            }
                        }
                    }

                    // 1. Fetch registration status to get accurate identifier and numeric supplier_id
                    String identifier = cookieIdentifier;
                    long supplierId = cookieSupplierId;
                    try {
                        URL regUrl = new URL("https://supplier.meesho.com/api/container/supplier/fetch-registration-status");
                        HttpURLConnection regConn = (HttpURLConnection) regUrl.openConnection();
                        regConn.setRequestMethod("POST");
                        regConn.setConnectTimeout(10000);
                        regConn.setReadTimeout(10000);
                        regConn.setDoOutput(true);
                        regConn.setRequestProperty("Content-Type", "application/json");
                        regConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                        regConn.setRequestProperty("client-type", "d-web");
                        regConn.setRequestProperty("client-package-version", "1.0.41");
                        regConn.setRequestProperty("Cookie", cookies);
                        regConn.setRequestProperty("Origin", "https://supplier.meesho.com");
                        regConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
                        try (OutputStream os = regConn.getOutputStream()) {
                            os.write("{}".getBytes(StandardCharsets.UTF_8));
                        }
                        if (regConn.getResponseCode() == 200) {
                            String regBody = readStream(regConn.getInputStream());
                            JSONObject regJson = new JSONObject(regBody.isEmpty() ? "{}" : regBody);
                            JSONObject decToken = regJson.optJSONObject("decodedToken");
                            if (decToken != null) {
                                JSONArray idList = decToken.optJSONArray("supplier_identifiers");
                                if (idList != null && idList.length() > 0) {
                                    identifier = idList.getString(0);
                                }
                                JSONObject idMap = decToken.optJSONObject("supplier_identifier_to_id_mapping");
                                if (idMap != null && !identifier.isEmpty()) {
                                    supplierId = idMap.optLong(identifier, supplierId);
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    if (identifier.isEmpty()) {
                        identifier = email.split("@")[0];
                    }

                    // 2. Fetch Supplier Details to get real Account Holder Name
                    String accountHolderName = "";
                    try {
                        URL detUrl = new URL("https://supplier.meesho.com/api/container/supplier/getSupplierDetails");
                        HttpURLConnection detConn = (HttpURLConnection) detUrl.openConnection();
                        detConn.setRequestMethod("POST");
                        detConn.setConnectTimeout(10000);
                        detConn.setReadTimeout(10000);
                        detConn.setDoOutput(true);
                        detConn.setRequestProperty("Content-Type", "application/json");
                        detConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                        detConn.setRequestProperty("client-type", "d-web");
                        detConn.setRequestProperty("client-package-version", "1.0.41");
                        detConn.setRequestProperty("identifier", identifier);
                        detConn.setRequestProperty("Cookie", cookies);
                        detConn.setRequestProperty("Origin", "https://supplier.meesho.com");
                        detConn.setRequestProperty("Referer", "https://supplier.meesho.com/panel/v3/new/fulfillment/" + identifier + "/returns/overview");
                        detConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");

                        JSONObject detBody = new JSONObject();
                        if (supplierId > 0) detBody.put("supplier_id", supplierId);
                        detBody.put("identifier", identifier);
                        try (OutputStream os = detConn.getOutputStream()) {
                            os.write(detBody.toString().getBytes(StandardCharsets.UTF_8));
                        }

                        if (detConn.getResponseCode() == 200) {
                            String resp = readStream(detConn.getInputStream());
                            JSONObject respJson = new JSONObject(resp.isEmpty() ? "{}" : resp);
                            JSONObject supObj = respJson.optJSONObject("supplier");
                            if (supObj != null) {
                                String n = supObj.optString("name", "");
                                if (!n.trim().isEmpty()) accountHolderName = n.trim();
                                if (accountHolderName.isEmpty()) {
                                    accountHolderName = supObj.optString("store_name", supObj.optString("legal_name", ""));
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    if (accountHolderName.isEmpty()) {
                        accountHolderName = email.split("@")[0];
                    }

                    // 3. Initial OTP Fetch with supplier_id and identifier
                    JSObject otpRes = fetchOtpInternal(identifier, supplierId, cookies);

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("storeName", accountHolderName);
                    ret.put("identifier", identifier);
                    ret.put("supplierId", supplierId);
                    ret.put("cookies", cookies);
                    ret.put("otp", otpRes.optString("otp", "----"));
                    ret.put("courier", otpRes.optString("courier", "No Return"));
                    ret.put("handoverCount", otpRes.optInt("handoverCount", 0));
                    ret.put("dateTime", otpRes.optString("dateTime", new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date())));
                    ret.put("otpList", otpRes.opt("otpList"));

                    // Save session to SharedPreferences for 24/7 background foreground service
                    try {
                        SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
                        String existingSessionsJson = prefs.getString("sessions", "{}");
                        JSONObject allSess = new JSONObject(existingSessionsJson);

                        String sessKey = !identifier.isEmpty() ? identifier : ("sess_" + supplierId);
                        JSONObject sessData = new JSONObject();
                        sessData.put("email", email);
                        sessData.put("password", password);
                        sessData.put("identifier", identifier);
                        sessData.put("supplierId", supplierId);
                        sessData.put("storeName", accountHolderName);
                        sessData.put("cookies", cookies);

                        allSess.put(sessKey, sessData);
                        prefs.edit().putString("sessions", allSess.toString()).apply();

                        // Start 24/7 background service
                        Intent serviceIntent = new Intent(getContext(), MeeshoBackgroundService.class);
                        ContextCompat.startForegroundService(getContext(), serviceIntent);
                    } catch (Exception ignored) {}

                    call.resolve(ret);
                } else {
                    String errorMsg = "Login failed (HTTP " + statusCode + ")";
                    try {
                        JSONObject errJson = new JSONObject(responseBody);
                        if (errJson.has("error")) errorMsg = errJson.getString("error");
                    } catch (Exception ignored) {}
                    if (statusCode == 401) errorMsg = "Invalid email or password";

                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", errorMsg);
                    call.resolve(ret);
                }
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Network error");
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void fetchOtp(PluginCall call) {
        String identifier = call.getString("identifier", "").trim();
        long supplierId = 0;
        try {
            supplierId = call.getInt("supplierId", 0);
        } catch (Exception e) {
            try {
                supplierId = Long.parseLong(call.getString("supplierId", "0"));
            } catch (Exception ignored) {}
        }
        String cookies = call.getString("cookies", "");

        final long finalSupplierId = supplierId;
        getBridge().execute(() -> {
            try {
                JSObject otpRes = fetchOtpInternal(identifier, finalSupplierId, cookies);
                call.resolve(otpRes);
            } catch (Exception e) {
                JSObject fallback = new JSObject();
                fallback.put("otp", "----");
                fallback.put("courier", "No Return");
                fallback.put("handoverCount", 0);
                fallback.put("dateTime", new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date()));
                fallback.put("otpList", new JSONArray());
                fallback.put("error", e.getMessage() != null ? e.getMessage() : "Fetch exception");
                call.resolve(fallback);
            }
        });
    }

    private JSObject fetchOtpInternal(String identifier, long supplierId, String cookies) {
        JSObject def = new JSObject();
        def.put("otp", "----");
        def.put("courier", "No Return");
        def.put("handoverCount", 0);
        def.put("dateTime", new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date()));
        def.put("otpList", new JSONArray());

        try {
            // If supplierId is missing, extract from cookie
            if (supplierId == 0) {
                for (String part : cookies.split(";")) {
                    String[] kv = part.trim().split("=", 2);
                    if (kv.length == 2 && kv[0].equalsIgnoreCase("s_id")) {
                        try { supplierId = Long.parseLong(kv[1]); } catch (Exception ignored) {}
                    }
                }
            }

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

            byte[] b = payload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(b);
            }

            int code = conn.getResponseCode();
            android.util.Log.d("MeeshoDirect", "fetchDeliveryOTPs response code: " + code + " for identifier: " + identifier);
            if (code == 200) {
                String resp = readStream(conn.getInputStream());
                android.util.Log.d("MeeshoDirect", "fetchDeliveryOTPs body: " + (resp.length() > 500 ? resp.substring(0, 500) : resp));
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
                    JSONArray resultList = new JSONArray();
                    int totalCount = 0;
                    StringBuilder courierSummary = new StringBuilder();

                    for (int i = 0; i < otps.length(); i++) {
                        JSONObject item = otps.getJSONObject(i);
                        JSONObject otpObj = new JSONObject();

                        String otpStr = item.optString("otp", item.optString("delivery_otp", item.optString("handover_otp", "----")));
                        String exp = item.optString("otp_expiry_timestamp", item.optString("expiry_timestamp", ""));

                        // Support Meesho nested otp_details array
                        JSONArray details = item.optJSONArray("otp_details");
                        if (details != null && details.length() > 0) {
                            for (int j = 0; j < details.length(); j++) {
                                JSONObject d = details.optJSONObject(j);
                                if (d != null && d.optBoolean("active", true)) {
                                    String candidate = d.optString("otp", "");
                                    if (!candidate.isEmpty() && !candidate.equals("----")) {
                                        otpStr = candidate;
                                        String dExp = d.optString("expiry_timestamp", "");
                                        if (!dExp.isEmpty()) exp = dExp;
                                        break;
                                    }
                                }
                            }
                        }
                        otpObj.put("otp", otpStr);

                        JSONObject carrier = item.optJSONObject("carrier_details");
                        String carrierName = carrier != null ? carrier.optString("name", carrier.optString("carrier_name", "Courier")) : item.optString("carrier_name", item.optString("name", "Courier"));
                        if (carrierName.equalsIgnoreCase("delhivery")) carrierName = "Delhivery";
                        else if (carrierName.equalsIgnoreCase("shadowfax")) carrierName = "Shadowfax";
                        else if (carrierName.equalsIgnoreCase("xpressbees")) carrierName = "Xpressbees";
                        else if (carrierName.equalsIgnoreCase("ecom_express")) carrierName = "Ecom Express";
                        otpObj.put("courier", carrierName);

                        int count = item.optInt("count", item.optInt("total_handover_count", item.optInt("total_shipment_count", 0)));
                        JSONObject dsd = item.optJSONObject("delivery_shipment_details");
                        if (count == 0 && dsd != null) {
                            count = dsd.optInt("total_handover_count", dsd.optInt("total_shipment_count", dsd.optInt("count", 0)));
                        }
                        otpObj.put("handoverCount", count);
                        totalCount += count;

                        String timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                        if (exp.isEmpty()) {
                            exp = item.optString("otp_expiry_timestamp", item.optString("expiry_timestamp", ""));
                        }
                        if (!exp.isEmpty()) {
                            try {
                                if (exp.matches("\\d+")) {
                                    timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date(Long.parseLong(exp)));
                                } else if (exp.length() >= 19) {
                                    SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                                    Date parsedDate = iso.parse(exp.substring(0, 19));
                                    if (parsedDate != null) timeStr = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(parsedDate);
                                }
                            } catch (Exception ignored) {}
                        }
                        otpObj.put("dateTime", timeStr);

                        // AWBs
                        JSONArray awbs = item.optJSONArray("awbs");
                        if (awbs != null) otpObj.put("awbs", awbs);

                        resultList.put(otpObj);

                        if (courierSummary.length() > 0) courierSummary.append(" & ");
                        courierSummary.append(carrierName);
                    }

                    def.put("otpList", resultList);
                    def.put("handoverCount", totalCount);
                    def.put("courier", courierSummary.toString());

                    JSONObject first = resultList.getJSONObject(0);
                    def.put("otp", first.optString("otp", "----"));
                    def.put("dateTime", first.optString("dateTime", new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date())));
                    android.util.Log.d("MeeshoDirect", "Found " + resultList.length() + " active OTPs for " + identifier + ". First OTP: " + def.optString("otp", "----"));
                }
            } else if (code == 401 || code == 403) {
                android.util.Log.w("MeeshoDirect", "Session expired (HTTP " + code + ") for identifier: " + identifier);
                def.put("expired", true);
                def.put("error", "HTTP " + code);
            } else {
                String errResp = readStream(conn.getErrorStream());
                android.util.Log.w("MeeshoDirect", "fetchDeliveryOTPs error HTTP " + code + ": " + errResp);
                def.put("error", "HTTP " + code);
            }
        } catch (Exception e) {
            android.util.Log.e("MeeshoDirect", "fetchDeliveryOTPs exception: " + e.getMessage(), e);
            def.put("error", e.getMessage() != null ? e.getMessage() : "Network error");
        }

        return def;
    }

    @PluginMethod
    public void syncSessions(PluginCall call) {
        try {
            JSObject sessionsObj = call.getObject("sessions");
            if (sessionsObj != null) {
                SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
                prefs.edit().putString("sessions", sessionsObj.toString()).apply();

                // Ensure background service is running
                try {
                    Intent serviceIntent = new Intent(getContext(), MeeshoBackgroundService.class);
                    ContextCompat.startForegroundService(getContext(), serviceIntent);
                } catch (Exception ignored) {}

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            }
        } catch (Exception e) {
            call.reject("Failed to sync sessions: " + e.getMessage());
            return;
        }
        call.reject("sessions object required");
    }

    @PluginMethod
    public void startBackgroundService(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), MeeshoBackgroundService.class);
            ContextCompat.startForegroundService(getContext(), serviceIntent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void stopBackgroundService(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences prefs = ctx.getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
            prefs.edit().putString("sessions", "{}").apply();
            Intent serviceIntent = new Intent(ctx, MeeshoBackgroundService.class);
            ctx.stopService(serviceIntent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop background service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        try {
            Context ctx = getContext();
            String packageName = ctx.getPackageName();
            boolean isIgnoring = false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    isIgnoring = pm.isIgnoringBatteryOptimizations(packageName);
                }

                if (!isIgnoring) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isIgnoring", isIgnoring);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Context ctx = getContext();
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fallback", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Could not open battery settings: " + ex.getMessage());
            }
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstallUpdate(PluginCall call) {
        String downloadUrl = call.getString("url", "").trim();
        if (downloadUrl.isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        getBridge().execute(() -> {
            try {
                Context context = getContext();
                File cacheDir = context.getExternalCacheDir();
                if (cacheDir == null) cacheDir = context.getCacheDir();
                File apkFile = new File(cacheDir, "meesho_update.apk");
                if (apkFile.exists()) apkFile.delete();

                // Notify start
                JSObject startProgress = new JSObject();
                startProgress.put("percent", 0);
                startProgress.put("status", "connecting");
                notifyListeners("downloadProgress", startProgress);

                String currentUrl = downloadUrl;
                HttpURLConnection conn = null;
                int redirects = 0;
                while (redirects < 6) {
                    URL u = new URL(currentUrl);
                    conn = (HttpURLConnection) u.openConnection();
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile)");
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.connect();

                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_TEMP || code == HttpURLConnection.HTTP_MOVED_PERM || code == 307 || code == 308) {
                        String loc = conn.getHeaderField("Location");
                        if (loc != null && !loc.isEmpty()) {
                            currentUrl = loc;
                            conn.disconnect();
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                if (conn == null || conn.getResponseCode() != 200) {
                    call.reject("Failed to connect to update server, response code: " + (conn != null ? conn.getResponseCode() : -1));
                    return;
                }

                int fileLength = conn.getContentLength();
                InputStream input = conn.getInputStream();
                FileOutputStream output = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                long total = 0;
                int count;
                int lastReportedPercent = 0;

                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    output.write(buffer, 0, count);

                    if (fileLength > 0) {
                        int percent = (int) (total * 100 / fileLength);
                        if (percent - lastReportedPercent >= 3 || percent == 100) {
                            lastReportedPercent = percent;
                            JSObject prog = new JSObject();
                            prog.put("percent", percent);
                            prog.put("bytes", total);
                            prog.put("total", fileLength);
                            prog.put("status", "downloading");
                            notifyListeners("downloadProgress", prog);
                        }
                    }
                }

                output.flush();
                output.close();
                input.close();

                // Notify download completed, launching installer
                JSObject doneProgress = new JSObject();
                doneProgress.put("percent", 100);
                doneProgress.put("status", "installing");
                notifyListeners("downloadProgress", doneProgress);

                // Check Unknown Sources Permission for Android 8.0+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!context.getPackageManager().canRequestPackageInstalls()) {
                        Intent manageIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                        manageIntent.setData(Uri.parse("package:" + context.getPackageName()));
                        manageIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(manageIntent);
                    }
                }

                // Launch Android Package Installer via FileProvider
                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("filePath", apkFile.getAbsolutePath());
                call.resolve(ret);

            } catch (Exception e) {
                JSObject errProg = new JSObject();
                errProg.put("status", "error");
                errProg.put("error", e.getMessage());
                notifyListeners("downloadProgress", errProg);
                call.reject("In-app update failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            android.content.pm.PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }
            String versionName = pInfo.versionName != null ? pInfo.versionName : "1.4";
            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            ret.put("versionName", versionName);
            ret.put("packageName", context.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get app info: " + e.getMessage());
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
