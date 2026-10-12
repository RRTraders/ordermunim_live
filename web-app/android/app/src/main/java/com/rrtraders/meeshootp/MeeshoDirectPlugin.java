package com.rrtraders.meeshootp;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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

        // Run on UI Thread so android.webkit.WebView can be created and evaluated properly
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Context context = getContext();
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

                final boolean[] isCompleted = {false};
                final Handler timeoutHandler = new Handler(Looper.getMainLooper());
                final Runnable timeoutRunnable = () -> {
                    if (!isCompleted[0]) {
                        isCompleted[0] = true;
                        try { webView.destroy(); } catch (Exception ignored) {}
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", "Connection timed out. Please check your internet connection.");
                        call.resolve(ret);
                    }
                };
                timeoutHandler.postDelayed(timeoutRunnable, 35000);

                webView.setWebViewClient(new WebViewClient() {
                    private boolean injected = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (isCompleted[0]) return;

                        if (url != null && url.contains("login") && !injected) {
                            injected = true;
                            // Inject credentials into login form with retry interval until elements mount
                            String jsInject = "(function() {" +
                                    "  var timer = setInterval(function() {" +
                                    "    try {" +
                                    "      var em = document.querySelector('input[name=\"emailOrPhone\"]');" +
                                    "      var pw = document.querySelector('input[name=\"password\"]');" +
                                    "      var btn = document.querySelector('button[type=\"submit\"]');" +
                                    "      if (em && pw && btn) {" +
                                    "        clearInterval(timer);" +
                                    "        var setVal = function(el, val) {" +
                                    "          var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
                                    "          setter.call(el, val);" +
                                    "          el.dispatchEvent(new Event('input', { bubbles: true }));" +
                                    "          el.dispatchEvent(new Event('change', { bubbles: true }));" +
                                    "        };" +
                                    "        setVal(em, " + JSONObject.quote(email) + ");" +
                                    "        setVal(pw, " + JSONObject.quote(password) + ");" +
                                    "        setTimeout(function() { btn.click(); }, 350);" +
                                    "      }" +
                                    "    } catch(e) {" +
                                    "      clearInterval(timer);" +
                                    "    }" +
                                    "  }, 400);" +
                                    "})();";

                            view.evaluateJavascript(jsInject, null);

                            // Poll for login success, cookie acquisition, or error message
                            pollForCompletion(view, timeoutHandler, timeoutRunnable, isCompleted, email, password, call);
                        }
                    }
                });

                webView.loadUrl(SecurityShield.getLoginRefererUrl());

            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Failed to initialize login engine");
                call.resolve(ret);
            }
        });
    }

    private void pollForCompletion(WebView webView, Handler timeoutHandler, Runnable timeoutRunnable,
                                   boolean[] isCompleted, String email, String password, PluginCall call) {
        Handler poller = new Handler(Looper.getMainLooper());
        Runnable checkTask = new Runnable() {
            private int attempts = 0;

            @Override
            public void run() {
                if (isCompleted[0]) return;
                attempts++;

                CookieManager cm = CookieManager.getInstance();
                String rawCookies = cm.getCookie("https://supplier.meesho.com");
                if (rawCookies == null) rawCookies = "";

                boolean hasConnectSid = rawCookies.contains("connect.sid=");
                boolean hasIdentifier = rawCookies.contains("current_az_identifier=");
                String currentUrl = webView.getUrl() != null ? webView.getUrl() : "";

                if ((hasConnectSid && hasIdentifier) || currentUrl.contains("fulfillment") || currentUrl.contains("growth") || currentUrl.contains("dashboard")) {
                    // Success!
                    isCompleted[0] = true;
                    timeoutHandler.removeCallbacks(timeoutRunnable);
                    finishSuccessfulLogin(rawCookies, email, password, call, webView);
                    return;
                }

                // Check for login error text on screen
                String checkErrJs = "(function() {" +
                        "  try {" +
                        "    var alerts = document.querySelectorAll('[role=\"alert\"], [class*=\"error\" i], [class*=\"helper\" i]');" +
                        "    for (var i = 0; i < alerts.length; i++) {" +
                        "      var txt = alerts[i].innerText || '';" +
                        "      if (txt.trim().length > 3) return txt.trim();" +
                        "    }" +
                        "  } catch(e) {}" +
                        "  return '';" +
                        "})();";

                webView.evaluateJavascript(checkErrJs, val -> {
                    if (isCompleted[0]) return;
                    String cleanVal = (val != null && !val.equals("null") && !val.equals("\"\"")) ? val.replace("\"", "").trim() : "";
                    if (!cleanVal.isEmpty() && attempts > 4) {
                        isCompleted[0] = true;
                        timeoutHandler.removeCallbacks(timeoutRunnable);
                        try { webView.destroy(); } catch (Exception ignored) {}

                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", cleanVal);
                        call.resolve(ret);
                        return;
                    }

                    if (attempts < 60) {
                        poller.postDelayed(this, 500);
                    }
                });
            }
        };

        poller.postDelayed(checkTask, 800);
    }

    private void finishSuccessfulLogin(String cookies, String email, String password, PluginCall call, WebView webView) {
        getBridge().execute(() -> {
            try {
                String cookieIdentifier = "";
                long cookieSupplierId = 0;
                for (String part : cookies.split(";")) {
                    String[] kv = part.trim().split("=", 2);
                    if (kv.length == 2) {
                        if (kv[0].equalsIgnoreCase("current_az_identifier") && !kv[1].isEmpty()) {
                            cookieIdentifier = kv[1];
                        }
                        if (kv[0].equalsIgnoreCase("s_id")) {
                            try { cookieSupplierId = Long.parseLong(kv[1]); } catch (Exception ignored) {}
                        }
                    }
                }

                // 1. Fetch registration status to get accurate identifier and numeric supplier_id
                String identifier = cookieIdentifier;
                long supplierId = cookieSupplierId;
                try {
                    URL regUrl = new URL(SecurityShield.getRegistrationStatusUrl());
                    HttpURLConnection regConn = (HttpURLConnection) regUrl.openConnection();
                    regConn.setRequestMethod("POST");
                    regConn.setConnectTimeout(10000);
                    regConn.setReadTimeout(10000);
                    regConn.setDoOutput(true);
                    regConn.setRequestProperty("Content-Type", "application/json");
                    regConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                    regConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                    regConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                    regConn.setRequestProperty("Cookie", cookies);
                    regConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                    regConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36");
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
                    URL detUrl = new URL(SecurityShield.getSupplierDetailsUrl());
                    HttpURLConnection detConn = (HttpURLConnection) detUrl.openConnection();
                    detConn.setRequestMethod("POST");
                    detConn.setConnectTimeout(10000);
                    detConn.setReadTimeout(10000);
                    detConn.setDoOutput(true);
                    detConn.setRequestProperty("Content-Type", "application/json");
                    detConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                    detConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                    detConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                    detConn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
                    detConn.setRequestProperty("Cookie", cookies);
                    detConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                    detConn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
                    detConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36");

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
                ret.put("dateTime", otpRes.optString("dateTime", new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date())));
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

                    // Permanent OS-level Vault: survives all future app updates
                    saveToPermanentVault(getContext(), email, password, identifier);

                    // Start 24/7 background service
                    Intent serviceIntent = new Intent(getContext(), MeeshoBackgroundService.class);
                    ContextCompat.startForegroundService(getContext(), serviceIntent);
                } catch (Exception ignored) {}

                // Destroy temporary WebView on UI thread
                new Handler(Looper.getMainLooper()).post(() -> {
                    try { webView.destroy(); } catch (Exception ignored) {}
                });

                call.resolve(ret);
            } catch (Exception e) {
                new Handler(Looper.getMainLooper()).post(() -> {
                    try { webView.destroy(); } catch (Exception ignored) {}
                });
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Processing error");
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
                fallback.put("dateTime", new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date()));
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
        def.put("dateTime", new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date()));
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

            URL url = new URL(SecurityShield.getFetchDeliveryOtpsUrl());
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoInput(true);
            conn.setDoOutput(true);

            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");
            conn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
            conn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
            conn.setRequestProperty(SecurityShield.getHeaderBrowserId(), getStableBrowserId());
            if (!identifier.isEmpty()) conn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
            conn.setRequestProperty("Cookie", cookies);
            conn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
            conn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

            // 1. Primary Desktop Payload (matches Meesho desktop portal exactly)
            JSONObject payload = new JSONObject();
            if (!identifier.isEmpty()) {
                payload.put("identifier", identifier);
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

                // If empty and supplierId exists, retry once with supplier_id included in payload
                if ((otps == null || otps.length() == 0) && supplierId > 0) {
                    try {
                        HttpURLConnection retryConn = (HttpURLConnection) new URL(SecurityShield.getFetchDeliveryOtpsUrl()).openConnection();
                        retryConn.setRequestMethod("POST");
                        retryConn.setConnectTimeout(8000);
                        retryConn.setReadTimeout(8000);
                        retryConn.setDoOutput(true);
                        retryConn.setRequestProperty("Content-Type", "application/json");
                        retryConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                        retryConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                        retryConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                        retryConn.setRequestProperty(SecurityShield.getHeaderBrowserId(), getStableBrowserId());
                        if (!identifier.isEmpty()) retryConn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
                        retryConn.setRequestProperty("Cookie", cookies);
                        retryConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                        retryConn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
                        retryConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

                        JSONObject retryPayload = new JSONObject();
                        if (!identifier.isEmpty()) retryPayload.put("identifier", identifier);
                        retryPayload.put("supplier_id", supplierId);
                        retryPayload.put("child_supplier_identifier", JSONObject.NULL);
                        retryPayload.put("child_supplier_id", JSONObject.NULL);

                        try (OutputStream ros = retryConn.getOutputStream()) {
                            ros.write(retryPayload.toString().getBytes(StandardCharsets.UTF_8));
                        }
                        if (retryConn.getResponseCode() == 200) {
                            String retryResp = readStream(retryConn.getInputStream());
                            JSONObject retryJson = new JSONObject(retryResp.isEmpty() ? "{}" : retryResp);
                            JSONArray retryOtps = retryJson.optJSONArray("supplier_delivery_otp");
                            if (retryOtps == null && retryJson.has("data")) {
                                Object rd = retryJson.get("data");
                                if (rd instanceof JSONObject) retryOtps = ((JSONObject) rd).optJSONArray("supplier_delivery_otp");
                                else if (rd instanceof JSONArray) retryOtps = (JSONArray) rd;
                            }
                            if (retryOtps != null && retryOtps.length() > 0) {
                                otps = retryOtps;
                            }
                        }
                    } catch (Exception ignored) {}
                }

                if (otps != null && otps.length() > 0) {
                    JSONArray resultList = new JSONArray();
                    int totalCount = 0;
                    StringBuilder courierSummary = new StringBuilder();

                    for (int i = 0; i < otps.length(); i++) {
                        JSONObject item = otps.getJSONObject(i);
                        JSONObject otpObj = new JSONObject();

                        // 1. Direct field lookup
                        String otpStr = item.optString("otp", item.optString("delivery_otp", item.optString("handover_otp", item.optString("end_otp", item.optString("valmo_otp", ""))))).trim();
                        String exp = item.optString("otp_expiry_timestamp", item.optString("expiry_timestamp", ""));

                        // 2. Nested otp_details lookup
                        JSONArray details = item.optJSONArray("otp_details");
                        if (details != null && details.length() > 0) {
                            // Check active items first
                            for (int j = 0; j < details.length(); j++) {
                                JSONObject d = details.optJSONObject(j);
                                if (d != null && d.optBoolean("active", true)) {
                                    String candidate = d.optString("otp", d.optString("delivery_otp", d.optString("end_otp", d.optString("handover_otp", "")))).trim();
                                    if (!candidate.isEmpty() && !candidate.equals("----")) {
                                        otpStr = candidate;
                                        String dExp = d.optString("expiry_timestamp", "");
                                        if (!dExp.isEmpty()) exp = dExp;
                                        break;
                                    }
                                }
                            }
                            // Fallback: unconditional lookup in details array
                            if (otpStr.isEmpty() || otpStr.equals("----")) {
                                for (int j = 0; j < details.length(); j++) {
                                    JSONObject d = details.optJSONObject(j);
                                    if (d != null) {
                                        String candidate = d.optString("otp", d.optString("delivery_otp", d.optString("end_otp", d.optString("handover_otp", "")))).trim();
                                        if (!candidate.isEmpty() && !candidate.equals("----")) {
                                            otpStr = candidate;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // 3. Fallback: regex search across raw item text for any 4-to-6 digit OTP
                        if (otpStr.isEmpty() || otpStr.equals("----")) {
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"(?:otp|delivery_otp|handover_otp|end_otp|valmo_otp)\"\\s*:\\s*\"?(\\d{4,6})\"?").matcher(item.toString());
                            if (m.find()) {
                                otpStr = m.group(1);
                            }
                        }

                        if (otpStr.isEmpty()) otpStr = "----";
                        otpObj.put("otp", otpStr);

                        // Carrier detection
                        JSONObject carrier = item.optJSONObject("carrier_details");
                        String carrierName = carrier != null ? carrier.optString("name", carrier.optString("carrier_name", "Courier")) : item.optString("carrier_name", item.optString("name", "Courier"));
                        if (carrierName.equalsIgnoreCase("delhivery")) carrierName = "Delhivery";
                        else if (carrierName.equalsIgnoreCase("shadowfax")) carrierName = "Shadowfax";
                        else if (carrierName.equalsIgnoreCase("xpressbees")) carrierName = "Xpressbees";
                        else if (carrierName.equalsIgnoreCase("ecom_express")) carrierName = "Ecom Express";
                        else if (carrierName.equalsIgnoreCase("valmo")) carrierName = "Valmo";
                        otpObj.put("courier", carrierName);

                        int count = item.optInt("count", item.optInt("total_handover_count", item.optInt("total_shipment_count", item.optInt("handover_count", 0))));
                        JSONObject dsd = item.optJSONObject("delivery_shipment_details");
                        if (count == 0 && dsd != null) {
                            count = dsd.optInt("total_handover_count", dsd.optInt("total_shipment_count", dsd.optInt("count", 0)));
                        }
                        otpObj.put("handoverCount", count);
                        totalCount += count;

                        String currentCheckTime = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date());
                        otpObj.put("dateTime", currentCheckTime);
                        if (exp.isEmpty()) {
                            exp = item.optString("otp_expiry_timestamp", item.optString("expiry_timestamp", ""));
                        }
                        if (!exp.isEmpty()) {
                            otpObj.put("otpExpiry", exp);
                        }

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
                    def.put("dateTime", first.optString("dateTime", new SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(new Date())));
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
            boolean forceWipe = call.getBoolean("forceWipe", false);
            String incomingUserId = call.getString("userId", "");
            SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);

            if (forceWipe) {
                prefs.edit().putString("sessions", "{}").remove("current_user_uid").apply();
                try {
                    NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        for (int id = 3000; id <= 4500; id++) {
                            nm.cancel(id);
                        }
                    }
                } catch (Exception ignored) {}
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            }

            if (sessionsObj != null) {
                String lastUserId = prefs.getString("current_user_uid", "");
                String existingStr = prefs.getString("sessions", "{}");
                JSONObject existingJson = new JSONObject(existingStr);
                JSONObject incomingJson = new JSONObject(sessionsObj.toString());

                // If user changed on this device, wipe out foreign sessions completely
                if (!incomingUserId.isEmpty()) {
                    if (!lastUserId.isEmpty() && !lastUserId.equals(incomingUserId)) {
                        existingJson = new JSONObject();
                        prefs.edit().putString("sessions", "{}").putString("current_user_uid", incomingUserId).apply();
                    } else {
                        prefs.edit().putString("current_user_uid", incomingUserId).apply();
                    }
                }

                // If incoming is completely empty and forceWipe was not set, do not wipe
                if (incomingJson.length() == 0 && existingJson.length() > 0) {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                    return;
                }

                // STRICT SYNC: Only retain incoming sessions belonging to this user!
                JSONObject cleanSessions = new JSONObject();
                for (java.util.Iterator<String> it = incomingJson.keys(); it.hasNext(); ) {
                    String k = it.next();
                    JSONObject newSess = incomingJson.getJSONObject(k);
                    if (!incomingUserId.isEmpty()) {
                        newSess.put("userId", incomingUserId);
                    }
                    String newPass = newSess.optString("password", "");
                    String newEmail = newSess.optString("email", "");
                    String newIdent = newSess.optString("identifier", "");
                    long newSupId = newSess.optLong("supplierId", 0);

                    // 1. If password is provided, save immediately to permanent vault!
                    if (!newPass.isEmpty()) {
                        saveToPermanentVault(getContext(), newEmail, newPass, newIdent);
                    }

                    // 2. If password is missing, find it across all existing sessions (by key, email, ident, or supplierId)
                    if (newPass.isEmpty()) {
                        if (existingJson.has(k)) {
                            JSONObject oldSess = existingJson.getJSONObject(k);
                            newPass = oldSess.optString("password", "");
                        }
                        if (newPass.isEmpty()) {
                            for (java.util.Iterator<String> eit = existingJson.keys(); eit.hasNext(); ) {
                                JSONObject oldSess = existingJson.getJSONObject(eit.next());
                                boolean match = (!newEmail.isEmpty() && newEmail.equalsIgnoreCase(oldSess.optString("email", "")))
                                        || (!newIdent.isEmpty() && newIdent.equals(oldSess.optString("identifier", "")))
                                        || (newSupId > 0 && newSupId == oldSess.optLong("supplierId", 0));
                                if (match && !oldSess.optString("password", "").isEmpty()) {
                                    newPass = oldSess.optString("password", "");
                                    break;
                                }
                            }
                        }
                        // 3. Fallback: Check Permanent Native OS-level Vault!
                        if (newPass.isEmpty()) {
                            newPass = getPasswordFromPermanentVault(getContext(), newEmail, newIdent);
                        }
                        if (!newPass.isEmpty()) {
                            newSess.put("password", newPass);
                        }
                    }

                    if (newEmail.isEmpty()) {
                        for (java.util.Iterator<String> eit = existingJson.keys(); eit.hasNext(); ) {
                            JSONObject oldSess = existingJson.getJSONObject(eit.next());
                            if ((!newIdent.isEmpty() && newIdent.equals(oldSess.optString("identifier", ""))) || (newSupId > 0 && newSupId == oldSess.optLong("supplierId", 0))) {
                                if (!oldSess.optString("email", "").isEmpty()) {
                                    newSess.put("email", oldSess.optString("email", ""));
                                    break;
                                }
                            }
                        }
                    }

                    cleanSessions.put(k, newSess);
                }

                // ALSO PRESERVE existing sessions belonging to this user so they are not deleted prematurely
                for (java.util.Iterator<String> eit = existingJson.keys(); eit.hasNext(); ) {
                    String ek = eit.next();
                    if (!cleanSessions.has(ek)) {
                        JSONObject oldSess = existingJson.getJSONObject(ek);
                        String sUid = oldSess.optString("userId", "");
                        if (incomingUserId.isEmpty() || sUid.isEmpty() || sUid.equals(incomingUserId)) {
                            cleanSessions.put(ek, oldSess);
                        }
                    }
                }

                prefs.edit().putString("sessions", cleanSessions.toString()).apply();

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

    public static void saveToPermanentVault(Context context, String email, String password, String identifier) {
        if (context == null) return;
        try {
            SharedPreferences vault = context.getSharedPreferences("meesho_permanent_vault", Context.MODE_PRIVATE);
            SharedPreferences.Editor ed = vault.edit();
            if (email != null && !email.trim().isEmpty() && password != null && !password.trim().isEmpty()) {
                ed.putString("pwd_email_" + email.trim().toLowerCase(), password.trim());
            }
            if (identifier != null && !identifier.trim().isEmpty() && password != null && !password.trim().isEmpty()) {
                ed.putString("pwd_ident_" + identifier.trim(), password.trim());
            }
            if (identifier != null && !identifier.trim().isEmpty() && email != null && !email.trim().isEmpty()) {
                ed.putString("email_ident_" + identifier.trim(), email.trim().toLowerCase());
            }
            ed.apply();
        } catch (Exception ignored) {}
    }

    public static String getPasswordFromPermanentVault(Context context, String email, String identifier) {
        if (context == null) return "";
        try {
            SharedPreferences vault = context.getSharedPreferences("meesho_permanent_vault", Context.MODE_PRIVATE);
            if (email != null && !email.trim().isEmpty()) {
                String p = vault.getString("pwd_email_" + email.trim().toLowerCase(), "");
                if (!p.isEmpty()) return p;
            }
            if (identifier != null && !identifier.trim().isEmpty()) {
                String p = vault.getString("pwd_ident_" + identifier.trim(), "");
                if (!p.isEmpty()) return p;
            }
        } catch (Exception ignored) {}
        return "";
    }

    public static String getInitialPageCookies(String pageUrl) {
        StringBuilder sb = new StringBuilder();
        try {
            URL u = new URL(pageUrl);
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setRequestMethod("GET");
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36");
            c.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            Map<String, List<String>> headers = c.getHeaderFields();
            if (headers != null) {
                for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
                    if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("Set-Cookie")) {
                        for (String raw : entry.getValue()) {
                            String part = raw.split(";")[0].trim();
                            if (!part.isEmpty()) {
                                if (sb.length() > 0) sb.append("; ");
                                sb.append(part);
                            }
                        }
                    }
                }
            }
            c.disconnect();
        } catch (Exception ignored) {}
        return sb.toString();
    }

    @PluginMethod
    public void getStoredSessions(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
            String currentUid = prefs.getString("current_user_uid", "");
            String sessionsStr = prefs.getString("sessions", "{}");
            JSONObject sessionsJson = new JSONObject(sessionsStr);
            
            JSONObject filtered = new JSONObject();
            for (java.util.Iterator<String> it = sessionsJson.keys(); it.hasNext(); ) {
                String k = it.next();
                JSONObject s = sessionsJson.getJSONObject(k);
                String sUid = s.optString("userId", "");
                if (currentUid.isEmpty() || sUid.isEmpty() || sUid.equals(currentUid)) {
                    // Restore password from Permanent Vault if missing
                    if (s.optString("password", "").isEmpty()) {
                        String email = s.optString("email", "");
                        String ident = s.optString("identifier", "");
                        String restoredPass = getPasswordFromPermanentVault(getContext(), email, ident);
                        if (!restoredPass.isEmpty()) {
                            s.put("password", restoredPass);
                        }
                    }
                    filtered.put(k, s);
                }
            }
            
            JSObject ret = new JSObject();
            ret.put("sessions", new JSObject(filtered.toString()));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get stored sessions: " + e.getMessage());
        }
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
    public void openNotificationSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
            } else {
                intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(android.net.Uri.parse("package:" + ctx.getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open notification settings: " + e.getMessage());
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
    public void checkExactAlarmPermission(PluginCall call) {
        try {
            Context ctx = getContext();
            boolean canSchedule = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                canSchedule = (am != null && am.canScheduleExactAlarms());
            }
            JSObject ret = new JSObject();
            ret.put("canScheduleExactAlarms", canSchedule);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("canScheduleExactAlarms", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                if (am != null && !am.canScheduleExactAlarms()) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("opened", true);
                    call.resolve(ret);
                    return;
                }
            }
            try {
                PollAlarmReceiver.scheduleNextAlarm(ctx.getApplicationContext(), 5);
            } catch (Exception ignored) {}
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("alreadyGranted", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Context ctx = getContext();
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fallback", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Could not open alarm settings: " + ex.getMessage());
            }
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
            String versionName = pInfo.versionName != null ? pInfo.versionName : "2.6";
            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            ret.put("versionName", versionName);
            ret.put("packageName", context.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get app info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        try {
            if (getActivity() != null) {
                getActivity().finishAffinity();
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    private String getStableBrowserId() {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
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
            SharedPreferences prefs = getContext().getSharedPreferences("meesho_sessions_pref", Context.MODE_PRIVATE);
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
