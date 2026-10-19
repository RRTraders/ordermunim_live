package com.rrtraders.ordermunim_flutter;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;

public class MeeshoAuthHelper {

    public interface AuthCallback {
        void onResult(boolean success, String storeName, String identifier, long supplierId, String cookies, String error);
    }

    public static void login(Context context, String email, String password, AuthCallback callback) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                WebView webView = new WebView(context);
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36");
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setLoadsImagesAutomatically(false);
                settings.setBlockNetworkImage(true);

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                // Purge supplier.meesho.com cookies between attempts
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

                final boolean[] isCompleted = {false};
                final Handler timeoutHandler = new Handler(Looper.getMainLooper());
                final Runnable timeoutRunnable = () -> {
                    if (!isCompleted[0]) {
                        isCompleted[0] = true;
                        try { webView.destroy(); } catch (Exception ignored) {}
                        callback.onResult(false, "", "", 0, "", "Connection timed out. Please check your credentials and internet connection.");
                    }
                };
                timeoutHandler.postDelayed(timeoutRunnable, 25000);

                class Bridge {
                    @JavascriptInterface
                    public void onAuthError(String errorMsg) {
                        new Handler(Looper.getMainLooper()).post(() -> {
                            if (isCompleted[0]) return;
                            isCompleted[0] = true;
                            timeoutHandler.removeCallbacks(timeoutRunnable);
                            try { webView.destroy(); } catch (Exception ignored) {}
                            String finalErr = (errorMsg != null && !errorMsg.trim().isEmpty())
                                    ? errorMsg.trim()
                                    : "Invalid credentials. Please check your email and password.";
                            callback.onResult(false, "", "", 0, "", finalErr);
                        });
                    }

                    @JavascriptInterface
                    public void onResolvedIdentity(String identityJsonStr) {
                        new Handler(Looper.getMainLooper()).post(() -> {
                            if (isCompleted[0]) return;
                            isCompleted[0] = true;
                            timeoutHandler.removeCallbacks(timeoutRunnable);
                            CookieManager cm = CookieManager.getInstance();
                            cm.flush();
                            String rawCookies = cm.getCookie("https://supplier.meesho.com");

                            String sName = "";
                            String ident = "";
                            long supId = 0;
                            try {
                                if (identityJsonStr != null && !identityJsonStr.isEmpty()) {
                                    JSONObject obj = new JSONObject(identityJsonStr);
                                    sName = obj.optString("storeName", "").trim();
                                    ident = obj.optString("identifier", "").trim();
                                    supId = obj.optLong("supplierId", 0);
                                }
                            } catch (Exception ignored) {}

                            if (sName.isEmpty()) {
                                sName = "Meesho Store";
                            }

                            try { webView.destroy(); } catch (Exception ignored) {}
                            callback.onResult(true, sName, ident, supId, rawCookies != null ? rawCookies : "", null);
                        });
                    }
                }

                webView.addJavascriptInterface(new Bridge(), "OrderMunimBridge");

                final boolean[] started = {false};

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
                        "          if (response.status === 200) {" +
                        "            var ident = '';" +
                        "            var supId = 0;" +
                        "            var sName = '';" +
                        "            var dt = data && data.decodedToken;" +
                        "            if (dt) {" +
                        "              if (dt.supplier_identifiers && dt.supplier_identifiers.length > 0) ident = dt.supplier_identifiers[0];" +
                        "              if (dt.supplier_identifier_to_id_mapping && ident) supId = dt.supplier_identifier_to_id_mapping[ident] || 0;" +
                        "              if (!supId && dt.user_id) supId = dt.user_id;" +
                        "              sName = dt.store_name || dt.display_name || dt.brand_name || '';" +
                        "            }" +
                        "            if (!sName && data.store_name) sName = data.store_name;" +
                        "            if (!sName && data.display_name) sName = data.display_name;" +
                        "            if (window.OrderMunimBridge) {" +
                        "              window.OrderMunimBridge.onResolvedIdentity(JSON.stringify({" +
                        "                storeName: sName || ''," +
                        "                identifier: ident || ''," +
                        "                supplierId: supId || 0" +
                        "              }));" +
                        "            }" +
                        "          } else if (response.status === 400 || response.status === 401) {" +
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
                        "          if (this.status === 200) {" +
                        "            var data = JSON.parse(this.responseText);" +
                        "            var ident = '';" +
                        "            var supId = 0;" +
                        "            var sName = '';" +
                        "            var dt = data && data.decodedToken;" +
                        "            if (dt) {" +
                        "              if (dt.supplier_identifiers && dt.supplier_identifiers.length > 0) ident = dt.supplier_identifiers[0];" +
                        "              if (dt.supplier_identifier_to_id_mapping && ident) supId = dt.supplier_identifier_to_id_mapping[ident] || 0;" +
                        "              if (!supId && dt.user_id) supId = dt.user_id;" +
                        "              sName = dt.store_name || dt.display_name || dt.brand_name || '';" +
                        "            }" +
                        "            if (!sName && data.store_name) sName = data.store_name;" +
                        "            if (!sName && data.display_name) sName = data.display_name;" +
                        "            if (window.OrderMunimBridge) {" +
                        "              window.OrderMunimBridge.onResolvedIdentity(JSON.stringify({" +
                        "                storeName: sName || ''," +
                        "                identifier: ident || ''," +
                        "                supplierId: supId || 0" +
                        "              }));" +
                        "            }" +
                        "          } else if (this.status === 400 || this.status === 401) {" +
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
                        "        }, 40);" +
                        "      }" +
                        "    } catch(e) {}" +
                        "    if (retryCount > 60) clearInterval(timer);" +
                        "  }, 70);" +
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

                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onProgressChanged(WebView view, int newProgress) {
                        super.onProgressChanged(view, newProgress);
                        if (isCompleted[0]) return;
                        if (newProgress >= 15 && !started[0] && view.getUrl() != null && view.getUrl().contains("login")) {
                            started[0] = true;
                            view.evaluateJavascript(jsInject, null);
                        }
                    }
                });

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (isCompleted[0]) return;
                        if (url != null && url.contains("login") && !started[0]) {
                            started[0] = true;
                            view.evaluateJavascript(jsInject, null);
                        }
                    }
                });

                webView.loadUrl("https://supplier.meesho.com/panel/v3/new/root/login");

            } catch (Exception e) {
                callback.onResult(false, "", "", 0, "", e.getMessage() != null ? e.getMessage() : "Failed to initialize login engine");
            }
        });
    }
}
