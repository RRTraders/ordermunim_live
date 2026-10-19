package com.rrtraders.ordermunim_flutter

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.HashMap

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.rrtraders.ordermunim/meesho_auth"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "login") {
                val email = call.argument<String>("email") ?: ""
                val password = call.argument<String>("password") ?: ""
                MeeshoAuthHelper.login(this, email, password) { success, storeName, identifier, supplierId, cookies, error ->
                    val map = HashMap<String, Any?>()
                    map["success"] = success
                    map["storeName"] = storeName
                    map["identifier"] = identifier
                    map["supplierId"] = supplierId
                    map["cookies"] = cookies
                    map["error"] = error
                    result.success(map)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
