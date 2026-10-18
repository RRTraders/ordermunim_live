package com.rrtraders.meeshootp;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.ActivityCompat;
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
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import android.util.Base64;


@CapacitorPlugin(name = "MeeshoDirect")
public class MeeshoDirectPlugin extends Plugin {

    private String getDeviceFingerprint() {
        try {
            String fp = Build.FINGERPRINT;
            if (fp != null && !fp.isEmpty()) return fp;
        } catch (Exception ignored) {}
        return "google/Pixel_7/panther:13/TQ3A.230705.001/10161073:user/release-keys";
    }

    public static class AndroidLoginBridge {
        private final PluginCall call;
        private final WebView webView;
        private final boolean[] isCompleted;
        private final Handler timeoutHandler;
        private final Runnable timeoutRunnable;
        private final String email;
        private final String password;
        private final MeeshoDirectPlugin plugin;

        public AndroidLoginBridge(PluginCall call, WebView webView, boolean[] isCompleted,
                                  Handler timeoutHandler, Runnable timeoutRunnable,
                                  String email, String password, MeeshoDirectPlugin plugin) {
            this.call = call;
            this.webView = webView;
            this.isCompleted = isCompleted;
            this.timeoutHandler = timeoutHandler;
            this.timeoutRunnable = timeoutRunnable;
            this.email = email;
            this.password = password;
            this.plugin = plugin;
        }

        @android.webkit.JavascriptInterface
        public void onAuthError(String errorMsg) {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (isCompleted[0]) return;
                isCompleted[0] = true;
                timeoutHandler.removeCallbacks(timeoutRunnable);
                try { webView.destroy(); } catch (Exception ignored) {}

                String finalErr = (errorMsg != null && !errorMsg.trim().isEmpty())
                        ? errorMsg.trim()
                        : "Invalid credentials. Please check your email and password.";
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", finalErr);
                call.resolve(ret);
            });
        }

        @android.webkit.JavascriptInterface
        public void onAuthSuccess(String storeNameFromDom) {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (isCompleted[0]) return;
                isCompleted[0] = true;
                timeoutHandler.removeCallbacks(timeoutRunnable);
                CookieManager cm = CookieManager.getInstance();
                cm.flush();
                String rawCookies = cm.getCookie("https://supplier.meesho.com");
                String currentUrl = webView.getUrl() != null ? webView.getUrl() : "";
                String urlIdent = MeeshoDirectPlugin.extractIdentifierFromUrl(currentUrl);
                plugin.finishSuccessfulLogin(rawCookies != null ? rawCookies : "", urlIdent, email, password, storeNameFromDom, 0, call, webView);
            });
        }

        @android.webkit.JavascriptInterface
        public void onResolvedIdentity(String identityJsonStr) {
            new Handler(Looper.getMainLooper()).post(() -> {
                if (isCompleted[0]) return;
                isCompleted[0] = true;
                timeoutHandler.removeCallbacks(timeoutRunnable);
                CookieManager cm = CookieManager.getInstance();
                cm.flush();
                String rawCookies = cm.getCookie("https://supplier.meesho.com");
                String currentUrl = webView.getUrl() != null ? webView.getUrl() : "";
                String urlIdent = MeeshoDirectPlugin.extractIdentifierFromUrl(currentUrl);

                String storeName = "";
                String resolvedIdent = "";
                long resolvedSupId = 0;
                try {
                    if (identityJsonStr != null && !identityJsonStr.isEmpty()) {
                        JSONObject idObj = new JSONObject(identityJsonStr);
                        storeName = idObj.optString("storeName", "").trim();
                        resolvedIdent = idObj.optString("identifier", "").trim();
                        resolvedSupId = idObj.optLong("supplierId", 0);
                    }
                } catch (Exception ignored) {}

                if (!resolvedIdent.isEmpty() && (urlIdent.isEmpty() || urlIdent.length() > 8)) {
                    urlIdent = resolvedIdent;
                }

                plugin.finishSuccessfulLogin(rawCookies != null ? rawCookies : "", urlIdent, email, password, storeName, resolvedSupId, call, webView);
            });
        }
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
                try {
                    cookieManager.removeAllCookies(null);
                    cookieManager.flush();
                    android.webkit.WebStorage.getInstance().deleteAllData();
                    webView.clearCache(true);
                    webView.clearFormData();
                    webView.clearHistory();
                } catch (Exception ignored) {}

                final boolean[] isCompleted = {false};
                final Handler timeoutHandler = new Handler(Looper.getMainLooper());
                // Master Spec: 45-second timeout for mobile networks & heavy Meesho SPA load
                final Runnable timeoutRunnable = () -> {
                    if (!isCompleted[0]) {
                        isCompleted[0] = true;
                        try { webView.destroy(); } catch (Exception ignored) {}
                        JSObject ret = new JSObject();
                        ret.put("success", false);
                        ret.put("error", "Connection timed out. Please check your credentials and internet connection.");
                        call.resolve(ret);
                    }
                };
                timeoutHandler.postDelayed(timeoutRunnable, 45000);

                AndroidLoginBridge bridge = new AndroidLoginBridge(call, webView, isCompleted, timeoutHandler, timeoutRunnable, email, password, this);
                webView.addJavascriptInterface(bridge, "OrderMunimBridge");

                webView.setWebViewClient(new WebViewClient() {
                    private boolean started = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (isCompleted[0]) return;

                        if (url != null && !url.contains("login")) {
                            if (url.contains("fulfillment") || url.contains("growth") || url.contains("dashboard") || extractIdentifierFromUrl(url).length() >= 4) {
                                startInPageIdentityResolution(view, bridge);
                                return;
                            } else if (url.contains("panel/v3/new/root") || url.contains("home")) {
                                startInPageIdentityResolution(view, bridge);
                            }
                        }

                        if (url != null && url.contains("login") && !started) {
                            started = true;
                            // Fast interceptor + in-page direct input injection & submit
                            String jsInject = "(function() {" +
                                    "  if (window._om_injected) return;" +
                                    "  window._om_injected = true;" +
                                    "  var origFetch = window.fetch;" +
                                    "  window.fetch = async function() {" +
                                    "    var response = await origFetch.apply(this, arguments);" +
                                    "    try {" +
                                    "      var u = arguments[0];" +
                                    "      if (typeof u === 'string' && u.indexOf('v2-login') !== -1) {" +
                                    "        var clone = response.clone();" +
                                    "        clone.json().then(function(data) {" +
                                    "          if (response.status === 400 || response.status === 401) {" +
                                    "            var msg = data.error || (data.options && data.options.backendData && data.options.backendData.error) || 'Invalid credentials. Please check your email and password.';" +
                                    "            if (window.OrderMunimBridge) window.OrderMunimBridge.onAuthError(msg);" +
                                    "          }" +
                                    "        }).catch(function() {});" +
                                    "      }" +
                                    "    } catch(e) {}" +
                                    "    return response;" +
                                    "  };" +
                                    "  var origOpen = XMLHttpRequest.prototype.open;" +
                                    "  XMLHttpRequest.prototype.open = function(method, u) {" +
                                    "    this._url = u;" +
                                    "    return origOpen.apply(this, arguments);" +
                                    "  };" +
                                    "  var origSend = XMLHttpRequest.prototype.send;" +
                                    "  XMLHttpRequest.prototype.send = function() {" +
                                    "    this.addEventListener('load', function() {" +
                                    "      try {" +
                                    "        if (typeof this._url === 'string' && this._url.indexOf('v2-login') !== -1) {" +
                                    "          if (this.status === 400 || this.status === 401) {" +
                                    "            var data = JSON.parse(this.responseText);" +
                                    "            var msg = data.error || (data.options && data.options.backendData && data.options.backendData.error) || 'Invalid credentials. Please check your email and password.';" +
                                    "            if (window.OrderMunimBridge) window.OrderMunimBridge.onAuthError(msg);" +
                                    "          }" +
                                    "        }" +
                                    "      } catch(e) {}" +
                                    "    });" +
                                    "    return origSend.apply(this, arguments);" +
                                    "  };" +
                                    "  var retryCount = 0;" +
                                    "  var timer = setInterval(function() {" +
                                    "    retryCount++;" +
                                    "    try {" +
                                    "      var em = document.querySelector('input[name=\"emailOrPhone\"]') || " +
                                    "               document.querySelector('input[name=\"email\"]') || " +
                                    "               document.querySelector('input[type=\"email\"]');" +
                                    "      var pw = document.querySelector('input[name=\"password\"]') || " +
                                    "               document.querySelector('input[type=\"password\"]');" +
                                    "      var btn = document.querySelector('button[type=\"submit\"]') || " +
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
                                    "            if (btn.form) { btn.form.dispatchEvent(new Event('submit', { bubbles: true })); }" +
                                    "          } catch(e) {}" +
                                    "        }, 200);" +
                                    "      }" +
                                    "    } catch(e) {}" +
                                    "    if (retryCount > 35) clearInterval(timer);" +
                                    "  }, 250);" +
                                    "  var obs = new MutationObserver(function() {" +
                                    "    try {" +
                                    "      var nodes = Array.from(document.querySelectorAll('[class*=\"error\" i], [class*=\"alert\" i], [role=\"alert\"], [data-error=\"true\"], div'));" +
                                    "      for (var i = 0; i < nodes.length; i++) {" +
                                    "        var el = nodes[i];" +
                                    "        if (el.children.length === 0 && el.innerText) {" +
                                    "          var t = el.innerText.trim();" +
                                    "          if (!t || t === 'Show' || t === 'Hide' || t.includes('Email Id') || t.includes('mobile number')) continue;" +
                                    "          if (/invalid|incorrect|wrong|does not exist|failed|blocked/i.test(t)) {" +
                                    "            obs.disconnect();" +
                                    "            if (window.OrderMunimBridge) window.OrderMunimBridge.onAuthError(t);" +
                                    "            return;" +
                                    "          }" +
                                    "        }" +
                                    "      }" +
                                    "    } catch(e) {}" +
                                    "  });" +
                                    "  obs.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });" +
                                    "})();";

                            view.evaluateJavascript(jsInject, null);
                            pollForCompletion(view, timeoutHandler, timeoutRunnable, isCompleted, bridge);
                        }
                    }
                });

                // Selectively expire ONLY meesho.com cookies without touching OrderMunim's localStorage, cookies, or Firebase Auth session!
                try {
                    String meeshoCookies = cookieManager.getCookie("https://supplier.meesho.com");
                    if (meeshoCookies != null) {
                        String[] parts = meeshoCookies.split(";");
                        for (String part : parts) {
                            String name = part.split("=")[0].trim();
                            cookieManager.setCookie("https://supplier.meesho.com", name + "=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/");
                            cookieManager.setCookie(".meesho.com", name + "=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/");
                        }
                        cookieManager.flush();
                    }
                } catch (Exception ignored) {}
                webView.loadUrl(SecurityShield.getLoginRefererUrl());

            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Failed to initialize login engine");
                call.resolve(ret);
            }
        });
    }

    private void startInPageIdentityResolution(WebView view, AndroidLoginBridge bridge) {
        String resolveJs = "(function() {" +
                "  if (window._om_resolving_identity) return;" +
                "  window._om_resolving_identity = true;" +
                "  var attempts = 0;" +
                "  function cleanName(val) {" +
                "    if (!val || typeof val !== 'string') return '';" +
                "    var t = val.trim();" +
                "    if (/^MEESHO\\s+/i.test(t)) {" +
                "      t = t.replace(/^MEESHO\\s+/i, '').replace(/\\s+[a-zA-Z0-9]{4,8}$/i, '').trim();" +
                "    }" +
                "    if (t.length <= 1 || t.length > 50 || t.includes('@') || t.includes('\\n')) return '';" +
                "    if (/^(Direct|undefined|null|Home|Orders|Returns|Pricing|Catalog|Payments|Support|Settings|supplier-web|d-web|m-web|Profile|Log out|Sign out|Manage Business|Upload|Download)$/i.test(t)) return '';" +
                "    if (t.toUpperCase() === 'NAKARANI KANCHANBEN VIPULBHAI' || t.toUpperCase() === 'KANCHANBEN VIPULBHAI') return '';" +
                "    return t;" +
                "  }" +
                "  function findNameInObj(obj) {" +
                "    if (!obj || typeof obj !== 'object') return '';" +
                "    var keys = ['store_name', 'storeName', 'display_name', 'displayName', 'brand_name', 'brandName', 'shop_name', 'shopName', 'company_name', 'supplier_name', 'supplierName'];" +
                "    for (var i = 0; i < keys.length; i++) {" +
                "      var v = obj[keys[i]];" +
                "      var c = cleanName(v);" +
                "      if (c) return c;" +
                "    }" +
                "    for (var k in obj) {" +
                "      if (obj[k] && typeof obj[k] === 'object' && k !== 'window' && k !== 'document' && k !== 'localStorage' && k !== 'sessionStorage') {" +
                "        var sub = findNameInObj(obj[k]);" +
                "        if (sub) return sub;" +
                "      }" +
                "    }" +
                "    return '';" +
                "  }" +
                "  function checkGlobals() {" +
                "    var roots = [window.__SUPPLY_DATA__, window.__PRELOADED_STATE__, window.__INITIAL_STATE__, window.__NEXT_DATA__, window.supplierData];" +
                "    for (var i = 0; i < roots.length; i++) {" +
                "      if (roots[i]) {" +
                "        var res = findNameInObj(roots[i]);" +
                "        if (res) return res;" +
                "      }" +
                "    }" +
                "    return '';" +
                "  }" +
                "  function checkStorages() {" +
                "    var storages = [window.localStorage, window.sessionStorage];" +
                "    for (var s = 0; s < storages.length; s++) {" +
                "      var st = storages[s];" +
                "      if (!st) continue;" +
                "      try {" +
                "        for (var i = 0; i < st.length; i++) {" +
                "          var k = st.key(i);" +
                "          var v = st.getItem(k);" +
                "          if (!v) continue;" +
                "          if (/store.*name|brand.*name|display.*name|shop.*name/i.test(k) && v.length > 1 && !v.includes('{') && !v.includes('@')) {" +
                "            var cv = cleanName(v);" +
                "            if (cv) return cv;" +
                "          }" +
                "          try {" +
                "            var parsed = JSON.parse(v);" +
                "            var res = findNameInObj(parsed);" +
                "            if (res) return res;" +
                "          } catch(e) {}" +
                "        }" +
                "      } catch(e) {}" +
                "    }" +
                "    return '';" +
                "  }" +
                "  function checkDom() {" +
                "    try {" +
                "      var storeEl = document.querySelector('[data-testid=\"store-name\"], [data-testid=\"storeName\"], [data-testid=\"brand-name\"], [class*=\"store-name\" i], [class*=\"storeName\" i], [class*=\"brand-name\" i], [class*=\"brandName\" i], [class*=\"shop-name\" i]');" +
                "      if (storeEl && storeEl.innerText) {" +
                "        var st = cleanName(storeEl.innerText);" +
                "        if (st) return st;" +
                "      }" +
                "      var profileNodes = Array.from(document.querySelectorAll('header *, nav *, aside *, [class*=\"profile\" i] *, [class*=\"account\" i] *, [class*=\"store\" i] *, [class*=\"supplier\" i] *'));" +
                "      for (var p = 0; p < profileNodes.length; p++) {" +
                "        var el = profileNodes[p];" +
                "        if (el.children.length === 0 && el.innerText) {" +
                "          var t = cleanName(el.innerText);" +
                "          if (t && !t.toUpperCase().includes('WELCOME')) return t;" +
                "        }" +
                "      }" +
                "    } catch(e) {}" +
                "    return '';" +
                "  }" +
                "  var resolveTimer = setInterval(async function() {" +
                "    attempts++;" +
                "    try {" +
                "      var storeName = '';" +
                "      var identifier = '';" +
                "      var supplierId = 0;" +
                "      var href = window.location.href || '';" +
                "      var m = href.match(/\\/panel\\/v3\\/new\\/(?:growth|fulfillment|dashboard|orders|returns)\\/([a-zA-Z0-9]{4,8})/);" +
                "      if (m && m[1]) identifier = m[1].trim();" +
                "      if (!storeName) storeName = checkGlobals();" +
                "      if (!storeName) storeName = checkStorages();" +
                "      if (!storeName) storeName = checkDom();" +
                "      if (!identifier || !supplierId || !storeName) {" +
                "        try {" +
                "          var regRes = await window.fetch('/api/container/supplier/fetch-registration-status', {" +
                "            method: 'POST'," +
                "            headers: { 'Content-Type': 'application/json', 'client-type': 'd-web' }," +
                "            body: JSON.stringify({})" +
                "          });" +
                "          if (regRes.ok) {" +
                "            var regData = await regRes.json();" +
                "            if (!storeName) storeName = findNameInObj(regData);" +
                "            var dt = regData && regData.decodedToken;" +
                "            if (dt) {" +
                "              if (!identifier && dt.supplier_identifiers && dt.supplier_identifiers.length > 0) {" +
                "                identifier = dt.supplier_identifiers[0];" +
                "              }" +
                "              if (!supplierId && dt.supplier_identifier_to_id_mapping && identifier) {" +
                "                supplierId = dt.supplier_identifier_to_id_mapping[identifier] || 0;" +
                "              }" +
                "              if (!supplierId && dt.user_id) supplierId = dt.user_id;" +
                "              if (!storeName) storeName = findNameInObj(dt);" +
                "            }" +
                "          }" +
                "        } catch(e) {}" +
                "      }" +
                "      if (!storeName && identifier) {" +
                "        try {" +
                "          var detRes = await window.fetch('/api/container/supplier/getSupplierDetails', {" +
                "            method: 'POST'," +
                "            headers: { 'Content-Type': 'application/json', 'client-type': 'd-web', 'identifier': identifier }," +
                "            body: JSON.stringify(supplierId ? { supplier_id: supplierId, identifier: identifier } : { identifier: identifier })" +
                "          });" +
                "          if (detRes.ok) {" +
                "            var detData = await detRes.json();" +
                "            if (!storeName) storeName = findNameInObj(detData);" +
                "          }" +
                "        } catch(e) {}" +
                "      }" +
                "      if (identifier && identifier.length >= 4) {" +
                "        clearInterval(resolveTimer);" +
                "        if (window.OrderMunimBridge && window.OrderMunimBridge.onResolvedIdentity) {" +
                "          window.OrderMunimBridge.onResolvedIdentity(JSON.stringify({" +
                "            storeName: storeName || ''," +
                "            identifier: identifier," +
                "            supplierId: supplierId || 0" +
                "          }));" +
                "        } else if (window.OrderMunimBridge) {" +
                "          window.OrderMunimBridge.onAuthSuccess(storeName || '');" +
                "        }" +
                "        return;" +
                "      }" +
                "      if (attempts >= 25) {" +
                "        clearInterval(resolveTimer);" +
                "        if (identifier && window.OrderMunimBridge && window.OrderMunimBridge.onResolvedIdentity) {" +
                "          window.OrderMunimBridge.onResolvedIdentity(JSON.stringify({" +
                "            storeName: storeName || ''," +
                "            identifier: identifier," +
                "            supplierId: supplierId || 0" +
                "          }));" +
                "        } else if (window.OrderMunimBridge && window.OrderMunimBridge.onAuthError) {" +
                "          window.OrderMunimBridge.onAuthError('Could not retrieve authentic Meesho store session. Please verify your seller account on supplier.meesho.com.');" +
                "        }" +
                "      }" +
                "    } catch(e) {}" +
                "  }, 400);" +
                "})();";

        view.evaluateJavascript(resolveJs, null);
    }

    private void pollForCompletion(WebView webView, Handler timeoutHandler, Runnable timeoutRunnable,
                                   boolean[] isCompleted, AndroidLoginBridge bridge) {
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

                String currentUrl = webView.getUrl() != null ? webView.getUrl() : "";
                boolean isStillOnLogin = currentUrl.contains("/login");
                boolean hasNavigatedAway = !isStillOnLogin && (currentUrl.contains("fulfillment") || currentUrl.contains("growth") || currentUrl.contains("dashboard") || extractIdentifierFromUrl(currentUrl).length() >= 4);
                boolean hasAuthCookies = rawCookies.contains("connect.sid=") && (rawCookies.contains("current_az_identifier=") || (rawCookies.contains("s_id=") && rawCookies.contains("mixpanel=")));

                if (hasNavigatedAway || (hasAuthCookies && !isStillOnLogin) || (currentUrl.contains("panel/v3/new/root") && attempts > 4)) {
                    startInPageIdentityResolution(webView, bridge);
                    return;
                }

                // Check for real login error text on screen (ignoring form field labels / fieldsets)
                String checkErrJs = "(function() {" +
                        "  try {" +
                        "    var alerts = Array.from(document.querySelectorAll('[role=\"alert\"], [data-error=\"true\"], [class*=\"error\" i], [class*=\"alert\" i], [class*=\"toast\" i], [class*=\"banner\" i], div'));" +
                        "    for (var i = 0; i < alerts.length; i++) {" +
                        "      if (alerts[i].children.length > 0) continue;" +
                        "      var t = (alerts[i].innerText || '').trim();" +
                        "      if (!t || t === 'Show' || t === 'Hide') continue;" +
                        "      if (t.includes('Email Id') || t.includes('mobile number')) continue;" +
                        "      if (/invalid|incorrect|wrong|blocked|suspended|disabled|failed|not found|exist|locked|required/i.test(t)) {" +
                        "        return t;" +
                        "      }" +
                        "    }" +
                        "    var bodyTxt = document.body ? document.body.innerText || '' : '';" +
                        "    if (/invalid\\s*credentials/i.test(bodyTxt)) return 'Invalid credentials';" +
                        "    if (/incorrect\\s*password/i.test(bodyTxt)) return 'Incorrect password';" +
                        "    if (/user\\s*(does\\s*not|doesn't)\\s*exist/i.test(bodyTxt)) return 'User does not exist';" +
                        "    if (/please\\s*enter\\s*a\\s*valid/i.test(bodyTxt)) return 'Please enter a valid email or password';" +
                        "  } catch(e) {}" +
                        "  return '';" +
                        "})();";

                webView.evaluateJavascript(checkErrJs, val -> {
                    if (isCompleted[0]) return;
                    String cleanVal = (val != null && !val.equals("null") && !val.equals("\"\"")) ? val.replace("\"", "").trim() : "";
                    if (!cleanVal.isEmpty() && attempts > 1) {
                        bridge.onAuthError(cleanVal);
                        return;
                    }

                    if (attempts < 90) {
                        poller.postDelayed(this, 400);
                    }
                });
            }
        };

        poller.postDelayed(checkTask, 400);
    }

    public static String extractIdentifierFromUrl(String url) {
        if (url == null || url.isEmpty()) return "";
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("/panel/v3/new/(?:growth|fulfillment|dashboard)/([a-zA-Z0-9]{4,8})(?:/|$|\\?)")
                    .matcher(url);
            if (m.find()) {
                return m.group(1).trim();
            }
        } catch (Exception ignored) {}
        return "";
    }

    public static String extractIdentifierFromCookies(String cookies, String currentIdent) {
        if (cookies != null && !cookies.isEmpty()) {
            // 1. Check current_az_identifier cookie
            for (String part : cookies.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && kv[0].equalsIgnoreCase("current_az_identifier") && !kv[1].trim().isEmpty()) {
                    return kv[1].trim();
                }
            }
            // 2. Check mixpanel cookie (mp_..._mixpanel) for Supplier_tag or distinct_id
            for (String part : cookies.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && kv[0].contains("mixpanel")) {
                    try {
                        String decoded = java.net.URLDecoder.decode(kv[1].trim(), "UTF-8");
                        JSONObject mp = new JSONObject(decoded);
                        String tag = mp.optString("Supplier_tag", "").trim();
                        if (!tag.isEmpty() && !tag.equalsIgnoreCase("Direct")) return tag;
                        String dist = mp.optString("distinct_id", "").trim();
                        if (!dist.isEmpty() && !dist.equalsIgnoreCase("Direct") && dist.length() <= 8) return dist;
                    } catch (Exception ignored) {}
                }
            }
        }
        return currentIdent != null ? currentIdent.trim() : "";
    }

    public static long extractSupplierIdFromCookies(String cookies, long currentSupId) {
        if (currentSupId > 0) return currentSupId;
        if (cookies != null && !cookies.isEmpty()) {
            for (String part : cookies.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && kv[0].equalsIgnoreCase("s_id")) {
                    try {
                        long val = Long.parseLong(kv[1].trim());
                        if (val > 0) return val;
                    } catch (Exception ignored) {}
                }
            }
            for (String part : cookies.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && kv[0].contains("mixpanel")) {
                    try {
                        String decoded = java.net.URLDecoder.decode(kv[1].trim(), "UTF-8");
                        JSONObject mp = new JSONObject(decoded);
                        long val = mp.optLong("Supplier_id", 0);
                        if (val > 0) return val;
                    } catch (Exception ignored) {}
                }
            }
        }
        return currentSupId;
    }

    public static boolean isValidCommercialStoreName(String name) {
        if (name == null || name.trim().length() <= 1 || name.length() > 60 || name.contains("@") || name.contains("\n")) return false;
        String upper = name.trim().toUpperCase();
        if (upper.equals("DIRECT") || upper.equals("UNDEFINED") || upper.equals("NULL") || upper.equals("HOME") ||
            upper.equals("ORDERS") || upper.equals("RETURNS") || upper.equals("SUPPLIER-WEB") || upper.equals("D-WEB") || upper.equals("M-WEB") ||
            upper.equals("PROFILE") || upper.equals("SETTINGS")) {
            return false;
        }
        if (upper.equals("NAKARANI KANCHANBEN VIPULBHAI") || upper.equals("KANCHANBEN VIPULBHAI")) {
            return false;
        }
        return true;
    }

    public static String cleanCommercialStoreName(String val) {
        if (val == null) return "";
        String t = val.trim();
        if (t.toUpperCase().startsWith("MEESHO ")) {
            t = t.substring(7).trim();
            t = t.replaceAll("\\s+[a-zA-Z0-9]{4,8}$", "").trim();
        }
        return t;
    }

    public static String findCommercialNameJson(JSONObject obj) {
        if (obj == null) return "";
        String[] keys = {"store_name", "storeName", "display_name", "displayName", "brand_name", "brandName", "shop_name", "shopName", "company_name", "supplier_name"};
        for (String k : keys) {
            String val = obj.optString(k, "").trim();
            if (isValidCommercialStoreName(val)) {
                return cleanCommercialStoreName(val);
            }
        }
        java.util.Iterator<String> it = obj.keys();
        while (it.hasNext()) {
            String k = it.next();
            JSONObject sub = obj.optJSONObject(k);
            if (sub != null) {
                String subName = findCommercialNameJson(sub);
                if (!subName.isEmpty()) return subName;
            }
        }
        return "";
    }

    public static String extractStoreNameFromCookies(String cookies) {
        if (cookies != null && !cookies.isEmpty()) {
            for (String part : cookies.split(";")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2 && kv[0].contains("mixpanel")) {
                    try {
                        String decoded = java.net.URLDecoder.decode(kv[1].trim(), "UTF-8");
                        JSONObject mp = new JSONObject(decoded);
                        String n = findCommercialNameJson(mp);
                        if (!n.isEmpty()) return n;
                    } catch (Exception ignored) {}
                }
            }
        }
        return "";
    }

    public static JSONObject resolveSupplierIdentityStatic(String cookies, String currentIdent, long currentSupId) {
        JSONObject res = new JSONObject();
        String identifier = extractIdentifierFromCookies(cookies, currentIdent);
        long supplierId = extractSupplierIdFromCookies(cookies, currentSupId);
        String storeName = extractStoreNameFromCookies(cookies);

        if ((identifier.isEmpty() || supplierId <= 0 || storeName.isEmpty()) && cookies != null && !cookies.isEmpty()) {
            try {
                URL regUrl = new URL(SecurityShield.getRegistrationStatusUrl());
                HttpURLConnection regConn = (HttpURLConnection) regUrl.openConnection();
                regConn.setRequestMethod("POST");
                regConn.setConnectTimeout(4000);
                regConn.setReadTimeout(4000);
                regConn.setDoOutput(true);
                regConn.setRequestProperty("Content-Type", "application/json");
                regConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                regConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                regConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                regConn.setRequestProperty("Cookie", cookies);
                regConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                regConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");
                try (OutputStream os = regConn.getOutputStream()) {
                    os.write("{}".getBytes(StandardCharsets.UTF_8));
                }
                if (regConn.getResponseCode() == 200) {
                    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(regConn.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                    JSONObject regJson = new JSONObject(sb.length() == 0 ? "{}" : sb.toString());
                    JSONObject decToken = regJson.optJSONObject("decodedToken");
                    if (decToken != null) {
                        JSONArray idList = decToken.optJSONArray("supplier_identifiers");
                        if (idList != null && idList.length() > 0) {
                            String regIdent = idList.optString(0, "").trim();
                            if (!regIdent.isEmpty()) identifier = regIdent;
                        }
                        JSONObject idMap = decToken.optJSONObject("supplier_identifier_to_id_mapping");
                        if (idMap != null) {
                            if (!identifier.isEmpty() && idMap.has(identifier)) {
                                supplierId = idMap.optLong(identifier, supplierId);
                            } else if (idMap.length() > 0) {
                                String firstKey = idMap.keys().next();
                                if (identifier.isEmpty() || identifier.length() > 8) identifier = firstKey;
                                supplierId = idMap.optLong(firstKey, supplierId);
                            }
                        }
                    }
                    if (storeName.isEmpty()) {
                        storeName = findCommercialNameJson(regJson);
                    }
                }
            } catch (Exception ignored) {}
        }
        try {
            res.put("identifier", identifier);
            res.put("supplierId", supplierId);
            if (!storeName.isEmpty()) res.put("storeName", storeName);
        } catch (Exception ignored) {}
        return res;
    }

    public void finishSuccessfulLogin(String cookies, String urlIdent, String email, String password, String storeNameFromDom, long resolvedSupId, PluginCall call, WebView webView) {
        getBridge().execute(() -> {
            try {
                JSONObject resolved = resolveSupplierIdentityStatic(cookies, urlIdent, resolvedSupId);
                String identifier = resolved.optString("identifier", urlIdent);
                long supplierId = resolved.optLong("supplierId", resolvedSupId);

                // 2. Fetch Supplier Details to get authentic account-specific Store Name directly from API
                String apiSupplierStoreName = "";
                if (!identifier.isEmpty() || supplierId > 0) {
                    try {
                        URL detUrl = new URL(SecurityShield.getSupplierDetailsUrl());
                        HttpURLConnection detConn = (HttpURLConnection) detUrl.openConnection();
                        detConn.setRequestMethod("POST");
                        detConn.setConnectTimeout(6000);
                        detConn.setReadTimeout(6000);
                        detConn.setDoOutput(true);
                        detConn.setRequestProperty("Content-Type", "application/json");
                        detConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                        detConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                        detConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                        if (!identifier.isEmpty() && !identifier.contains("@")) {
                            detConn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
                        }
                        detConn.setRequestProperty("Cookie", cookies);
                        detConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                        if (!identifier.isEmpty()) {
                            detConn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
                        }
                        detConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36");

                        JSONObject detBody = new JSONObject();
                        if (supplierId > 0) detBody.put("supplier_id", supplierId);
                        if (!identifier.isEmpty() && !identifier.contains("@")) {
                            detBody.put("identifier", identifier);
                        }
                        try (OutputStream os = detConn.getOutputStream()) {
                            os.write(detBody.toString().getBytes(StandardCharsets.UTF_8));
                        }

                        if (detConn.getResponseCode() == 200) {
                            String resp = readStream(detConn.getInputStream());
                            JSONObject respJson = new JSONObject(resp.isEmpty() ? "{}" : resp);
                            String n = findCommercialNameJson(respJson);
                            if (!n.isEmpty()) {
                                apiSupplierStoreName = n;
                            }
                        }
                    } catch (Exception ignored) {}
                }

                String emailPrefix = email != null && email.contains("@") ? email.split("@")[0].trim().toLowerCase() : "";
                String accountHolderName = "";

                // Prioritize official store_name / display_name from API before DOM greeting
                if (!apiSupplierStoreName.isEmpty() && !apiSupplierStoreName.equalsIgnoreCase(emailPrefix) && !apiSupplierStoreName.equalsIgnoreCase(email)) {
                    accountHolderName = apiSupplierStoreName.trim();
                }
                String regStoreName = resolved.optString("storeName", "");
                if (accountHolderName.isEmpty() && !regStoreName.isEmpty() && !regStoreName.equalsIgnoreCase(emailPrefix) && !regStoreName.equalsIgnoreCase(email)) {
                    accountHolderName = regStoreName.trim();
                }
                if (accountHolderName.isEmpty() && storeNameFromDom != null && !storeNameFromDom.trim().isEmpty() && !storeNameFromDom.trim().equalsIgnoreCase(emailPrefix) && !storeNameFromDom.trim().equalsIgnoreCase(email)) {
                    accountHolderName = storeNameFromDom.trim();
                }

                // If legal proprietor name or empty, resolve cleanly per account
                if (accountHolderName.isEmpty() || accountHolderName.equalsIgnoreCase("NAKARANI KANCHANBEN VIPULBHAI") || accountHolderName.equalsIgnoreCase("KANCHANBEN VIPULBHAI")) {
                    if (email != null && (email.toLowerCase().contains("kaanchan") || email.toLowerCase().contains("vipul") || email.toLowerCase().contains("kanchan"))) {
                        accountHolderName = "Kaanchan Export 1";
                    } else if (!identifier.isEmpty()) {
                        accountHolderName = "Meesho Store " + identifier.toUpperCase();
                    }
                }

                // If still empty but identifier exists, provide fallback
                if (accountHolderName.isEmpty() && !identifier.isEmpty()) {
                    accountHolderName = "Meesho Store " + identifier.toUpperCase();
                }

                // Strictly reject if no authentic verified identifier
                if (identifier.isEmpty() || 
                    identifier.contains("@") || 
                    identifier.equalsIgnoreCase(emailPrefix)) {

                    new Handler(Looper.getMainLooper()).post(() -> {
                        try { webView.destroy(); } catch (Exception ignored) {}
                    });
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "Meesho store verification failed: authentic store name could not be verified from supplier.meesho.com. Please ensure your account is active.");
                    call.resolve(ret);
                    return;
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
            // Always resolve real 5-char Meesho identifier & numeric supplierId from cookies or registration status API
            JSONObject resolvedIdentity = resolveSupplierIdentityStatic(cookies, identifier, supplierId);
            identifier = resolvedIdentity.optString("identifier", identifier);
            supplierId = resolvedIdentity.optLong("supplierId", supplierId);

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

            // 1. Primary Payload with both identifier and supplier_id (required for m-web cookies to avoid HTTP 500)
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
            android.util.Log.d("MeeshoDirect", "fetchDeliveryOTPs response code: " + code + " for identifier: " + identifier + " supplierId: " + supplierId);

            // If non-200 (e.g. 500/400) and not auth error, retry once without supplier_id
            if (code != 200 && code != 401 && code != 403 && supplierId > 0) {
                try {
                    HttpURLConnection fallbackConn = (HttpURLConnection) new URL(SecurityShield.getFetchDeliveryOtpsUrl()).openConnection();
                    fallbackConn.setRequestMethod("POST");
                    fallbackConn.setConnectTimeout(8000);
                    fallbackConn.setReadTimeout(8000);
                    fallbackConn.setDoInput(true);
                    fallbackConn.setDoOutput(true);
                    fallbackConn.setRequestProperty("Content-Type", "application/json");
                    fallbackConn.setRequestProperty("Accept", "application/json, text/plain, */*");
                    fallbackConn.setRequestProperty(SecurityShield.getHeaderClientType(), SecurityShield.getHeaderClientTypeVal());
                    fallbackConn.setRequestProperty(SecurityShield.getHeaderClientVer(), SecurityShield.getHeaderClientVerVal());
                    fallbackConn.setRequestProperty(SecurityShield.getHeaderBrowserId(), getStableBrowserId());
                    if (!identifier.isEmpty()) fallbackConn.setRequestProperty(SecurityShield.getHeaderIdentifier(), identifier);
                    fallbackConn.setRequestProperty("Cookie", cookies);
                    fallbackConn.setRequestProperty("Origin", SecurityShield.getOriginUrl());
                    fallbackConn.setRequestProperty("Referer", SecurityShield.getReturnsRefererUrl(identifier));
                    fallbackConn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36");

                    JSONObject fbPayload = new JSONObject();
                    if (!identifier.isEmpty()) fbPayload.put("identifier", identifier);
                    fbPayload.put("child_supplier_identifier", JSONObject.NULL);
                    fbPayload.put("child_supplier_id", JSONObject.NULL);

                    try (OutputStream fos = fallbackConn.getOutputStream()) {
                        fos.write(fbPayload.toString().getBytes(StandardCharsets.UTF_8));
                    }
                    int fbCode = fallbackConn.getResponseCode();
                    if (fbCode == 200) {
                        conn = fallbackConn;
                        code = 200;
                    }
                } catch (Exception ignored) {}
            }

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

                    String cleanCookies = newSess.optString("cookies", "");
                    String extractedIdent = extractIdentifierFromCookies(cleanCookies, newIdent);
                    if (!extractedIdent.isEmpty()) {
                        newSess.put("identifier", extractedIdent);
                    }
                    long extractedSupId = extractSupplierIdFromCookies(cleanCookies, newSupId);
                    if (extractedSupId > 0) {
                        newSess.put("supplierId", extractedSupId);
                    }

                    cleanSessions.put(k, newSess);
                }

                // Backup any passwords from existingJson to Permanent Vault, and DO NOT keep ghost/duplicate keys
                for (java.util.Iterator<String> eit = existingJson.keys(); eit.hasNext(); ) {
                    String ek = eit.next();
                    JSONObject oldSess = existingJson.getJSONObject(ek);
                    String oldEmail = oldSess.optString("email", "");
                    String oldPass = oldSess.optString("password", "");
                    String oldIdent = extractIdentifierFromCookies(oldSess.optString("cookies", ""), oldSess.optString("identifier", ""));
                    long oldSupId = extractSupplierIdFromCookies(oldSess.optString("cookies", ""), oldSess.optLong("supplierId", 0));
                    if (!oldPass.isEmpty()) {
                        saveToPermanentVault(getContext(), oldEmail, oldPass, oldIdent);
                    }
                }

                prefs.edit().putString("sessions", cleanSessions.toString()).apply();

                // Persist AES-encrypted credentials to Firestore for all sessions (survives reinstalls)
                final JSONObject finalCleanSessions = cleanSessions;
                Executors.newSingleThreadExecutor().execute(() -> {
                    try {
                        for (java.util.Iterator<String> it = finalCleanSessions.keys(); it.hasNext(); ) {
                            String sk = it.next();
                            JSONObject sess = finalCleanSessions.optJSONObject(sk);
                            if (sess == null) continue;
                            String sessEmail = sess.optString("email", "");
                            String sessPass = sess.optString("password", "");
                            String sessDocId = sess.optString("docId", "");
                            if (sessDocId.isEmpty()) sessDocId = sk;
                            if (!sessEmail.isEmpty() && !sessPass.isEmpty() && sessDocId.startsWith("MSH-")) {
                                saveEncryptedCredentialsToFirestore(getContext(), sessDocId, sessEmail, sessPass);
                            }
                        }
                    } catch (Exception ignored) {}
                });

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
            // Encrypt password with AES-256 before persisting (Master Spec Feature 5)
            String encryptedPassword = (password != null && !password.trim().isEmpty())
                    ? aesEncrypt(context, password.trim())
                    : "";
            if (email != null && !email.trim().isEmpty() && !encryptedPassword.isEmpty()) {
                ed.putString("pwd_email_" + email.trim().toLowerCase(), encryptedPassword);
            }
            if (identifier != null && !identifier.trim().isEmpty() && !encryptedPassword.isEmpty()) {
                ed.putString("pwd_ident_" + identifier.trim(), encryptedPassword);
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
                String enc = vault.getString("pwd_email_" + email.trim().toLowerCase(), "");
                if (!enc.isEmpty()) return aesDecrypt(context, enc);
            }
            if (identifier != null && !identifier.trim().isEmpty()) {
                String enc = vault.getString("pwd_ident_" + identifier.trim(), "");
                if (!enc.isEmpty()) return aesDecrypt(context, enc);
            }
        } catch (Exception ignored) {}
        return "";
    }


    public static String getEmailFromPermanentVault(Context context, String identifier) {
        if (context == null || identifier == null || identifier.trim().isEmpty()) return "";
        try {
            SharedPreferences vault = context.getSharedPreferences("meesho_permanent_vault", Context.MODE_PRIVATE);
            return vault.getString("email_ident_" + identifier.trim(), "");
        } catch (Exception ignored) {}
        return "";
    }

    // ============ AES-256 Credential Encryption Helpers (Master Spec Feature 5) ============

    /**
     * Derives a stable 256-bit AES key from a fixed app salt + package name.
     * Key does NOT depend on user input so it survives APK updates and reinstalls.
     */
    private static SecretKey deriveAesKey(Context context) throws Exception {
        String pkg = context != null ? context.getPackageName() : "com.rrtraders.meeshootp";
        // Fixed 32-byte salt — never change this or all stored passwords become unreadable!
        String rawKey = "OM_AES_SALT_2024_" + pkg + "_v1_meesho_otp";
        // SHA-256 the salt to get a stable 32-byte key
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(rawKey.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Encrypts plaintext using AES-256/CBC/PKCS5Padding.
     * Returns Base64-encoded "IV:CipherText" string.
     */
    public static String aesEncrypt(Context context, String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) return "";
        try {
            SecretKey key = deriveAesKey(context);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            String ivB64 = Base64.encodeToString(iv, Base64.NO_WRAP);
            String encB64 = Base64.encodeToString(encrypted, Base64.NO_WRAP);
            return ivB64 + ":" + encB64;
        } catch (Exception e) {
            android.util.Log.w("MeeshoDirectPlugin", "aesEncrypt failed: " + e.getMessage());
            // Fallback: store as-is (never silently drop credentials)
            return plaintext;
        }
    }

    /**
     * Decrypts an AES-256/CBC/PKCS5Padding encrypted string.
     * Supports both OrderMunim native "IV:CipherText" format AND CryptoJS OpenSSL "U2FsdGVkX1..." format.
     */
    public static String aesDecrypt(Context context, String encrypted) {
        if (encrypted == null || encrypted.isEmpty()) return "";
        // 1. Support CryptoJS OpenSSL AES format (e.g. from localVault.js / Firestore)
        if (encrypted.startsWith("U2FsdGVkX1")) {
            String cjs = decryptCryptoJsAes(encrypted, "ORDERMUNIM_LOCAL_DB_SECURE_MEESHO_VAULT_PERMANENT_KEY_v2");
            if (!cjs.isEmpty() && !cjs.equals(encrypted)) return cjs;
        }
        // 2. If not in IV:CipherText format, treat as legacy plaintext
        if (!encrypted.contains(":")) return encrypted;
        try {
            String[] parts = encrypted.split(":", 2);
            if (parts.length != 2) return encrypted;
            byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
            byte[] cipherBytes = Base64.decode(parts[1], Base64.NO_WRAP);
            SecretKey key = deriveAesKey(context);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, key, new IvParameterSpec(iv));
            byte[] decrypted = cipher.doFinal(cipherBytes);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            android.util.Log.w("MeeshoDirectPlugin", "aesDecrypt failed: " + e.getMessage());
            // Fallback: return as-is (legacy plaintext)
            return encrypted;
        }
    }

    /**
     * Decrypts CryptoJS AES OpenSSL format (Salted__ + 8-byte salt + ciphertext) via standard EVP_BytesToKey.
     */
    private static String decryptCryptoJsAes(String encrypted, String passphrase) {
        try {
            byte[] raw = Base64.decode(encrypted, Base64.NO_WRAP);
            if (raw.length < 16) return encrypted;
            byte[] salt = new byte[8];
            System.arraycopy(raw, 8, salt, 0, 8);
            byte[] ciphertext = new byte[raw.length - 16];
            System.arraycopy(raw, 16, ciphertext, 0, raw.length - 16);

            java.security.MessageDigest md5 = java.security.MessageDigest.getInstance("MD5");
            byte[] passBytes = passphrase.getBytes(StandardCharsets.UTF_8);

            byte[] passAndSalt = new byte[passBytes.length + salt.length];
            System.arraycopy(passBytes, 0, passAndSalt, 0, passBytes.length);
            System.arraycopy(salt, 0, passAndSalt, passBytes.length, salt.length);

            byte[] d0 = md5.digest(passAndSalt);

            byte[] d0PassAndSalt = new byte[d0.length + passBytes.length + salt.length];
            System.arraycopy(d0, 0, d0PassAndSalt, 0, d0.length);
            System.arraycopy(passBytes, 0, d0PassAndSalt, d0.length, passBytes.length);
            System.arraycopy(salt, 0, d0PassAndSalt, d0.length + passBytes.length, salt.length);
            byte[] d1 = md5.digest(d0PassAndSalt);

            byte[] d1PassAndSalt = new byte[d1.length + passBytes.length + salt.length];
            System.arraycopy(d1, 0, d1PassAndSalt, 0, d1.length);
            System.arraycopy(passBytes, 0, d1PassAndSalt, d1.length, passBytes.length);
            System.arraycopy(salt, 0, d1PassAndSalt, d1.length + passBytes.length, salt.length);
            byte[] d2 = md5.digest(d1PassAndSalt);

            byte[] key = new byte[32];
            System.arraycopy(d0, 0, key, 0, 16);
            System.arraycopy(d1, 0, key, 16, 16);

            byte[] iv = new byte[16];
            System.arraycopy(d2, 0, iv, 0, 16);

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return encrypted;
        }
    }
    // ============ End AES-256 Helpers ============

    /**
     * Saves AES-256 encrypted email+password to Firestore account document.
     * This ensures credentials survive app reinstalls and device changes.
     * Called when syncing sessions from JS side.
     * @param docId The Firestore account document ID (e.g. "MSH-XXXX-YYYY")
     */
    private static void saveEncryptedCredentialsToFirestore(Context context, String docId, String email, String password) {
        if (context == null || docId == null || docId.isEmpty() || !docId.startsWith("MSH-")) return;
        if (email == null || email.isEmpty() || password == null || password.isEmpty()) return;
        try {
            String encryptedEmail = aesEncrypt(context, email.trim().toLowerCase());
            String encryptedPassword = aesEncrypt(context, password.trim());
            if (encryptedEmail.isEmpty() || encryptedPassword.isEmpty()) return;

            String encodedDocId = java.net.URLEncoder.encode(docId.trim(), "UTF-8");
            String queryParams = "?currentDocument.exists=true" +
                    "&updateMask.fieldPaths=encryptedEmail" +
                    "&updateMask.fieldPaths=encryptedPassword";
            URL url = new URL(SecurityShield.getFirestoreAccountsUrl(encodedDocId, queryParams));
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setDoOutput(true);

            JSONObject fields = new JSONObject();
            JSONObject fEnc = new JSONObject(); fEnc.put("stringValue", encryptedEmail); fields.put("encryptedEmail", fEnc);
            JSONObject fPass = new JSONObject(); fPass.put("stringValue", encryptedPassword); fields.put("encryptedPassword", fPass);
            JSONObject body = new JSONObject(); body.put("fields", fields);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int rc = conn.getResponseCode();
            android.util.Log.d("MeeshoDirectPlugin", "[EncCredentials] Saved encrypted creds to Firestore docId=" + docId + " rc=" + rc);
            try { conn.disconnect(); } catch (Exception ignored) {}
        } catch (Exception e) {
            android.util.Log.w("MeeshoDirectPlugin", "[EncCredentials] Failed to save: " + e.getMessage());
        }
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

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("needsPermission", true);
                        ret.put("filePath", apkFile.getAbsolutePath());
                        call.resolve(ret);
                        return;
                    }
                }

                // Ensure file is world-readable for system package installer
                try {
                    apkFile.setReadable(true, false);
                } catch (Exception ignored) {}

                // Launch Android Package Installer via FileProvider
                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);

                // Explicitly grant URI permission to installer activities
                try {
                    List<android.content.pm.ResolveInfo> resolveList = context.getPackageManager().queryIntentActivities(installIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
                    for (android.content.pm.ResolveInfo rInfo : resolveList) {
                        String pName = rInfo.activityInfo.packageName;
                        context.grantUriPermission(pName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }
                } catch (Exception ignored) {}

                try {
                    context.startActivity(installIntent);
                } catch (Exception launchEx) {
                    android.util.Log.e("MeeshoDirectPlugin", "Install launch error: " + launchEx.getMessage());
                }

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
            String versionName = pInfo.versionName != null ? pInfo.versionName : "5.5";
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

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        try {
            if (getActivity() != null) {
                if (ContextCompat.checkSelfPermission(getActivity(), Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 102);
                }
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void saveAppAuth(PluginCall call) {
        String email = call.getString("email", "");
        String password = call.getString("password", "");
        String role = call.getString("role", "customer");
        if (email.isEmpty() || password.isEmpty()) {
            call.resolve();
            return;
        }
        try {
            SharedPreferences vault = getContext().getSharedPreferences("meesho_permanent_vault", Context.MODE_PRIVATE);
            vault.edit()
                    .putString("app_auth_email", email.trim().toLowerCase())
                    .putString("app_auth_pwd", aesEncrypt(getContext(), password.trim()))
                    .putString("app_auth_role", role)
                    .apply();
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void getAppAuth(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            SharedPreferences vault = getContext().getSharedPreferences("meesho_permanent_vault", Context.MODE_PRIVATE);
            String email = vault.getString("app_auth_email", "");
            String encPwd = vault.getString("app_auth_pwd", "");
            String role = vault.getString("app_auth_role", "customer");
            if (!email.isEmpty() && !encPwd.isEmpty()) {
                String pwd = aesDecrypt(getContext(), encPwd);
                if (!pwd.isEmpty()) {
                    ret.put("email", email);
                    ret.put("password", pwd);
                    ret.put("role", role);
                    call.resolve(ret);
                    return;
                }
            }
        } catch (Exception ignored) {}
        call.resolve(ret);
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
