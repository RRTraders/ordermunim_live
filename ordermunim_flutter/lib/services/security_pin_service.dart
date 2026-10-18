import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecurityPinService {
  static const _storage = FlutterSecureStorage();
  static const _pinKey = 'ordermunim_admin_pin';

  static const _lockPaymentsKey = 'lock_payments';
  static const _lockDashboardKey = 'lock_dashboard';
  static const _lockAccountsKey = 'lock_accounts';
  static const _lockScheduleKey = 'lock_schedule';

  /// Check if admin has set a PIN
  static Future<bool> hasPin() async {
    final pin = await _storage.read(key: _pinKey);
    return pin != null && pin.isNotEmpty;
  }

  /// Verify entered 4-digit PIN
  static Future<bool> verifyPin(String enteredPin) async {
    final pin = await _storage.read(key: _pinKey);
    return pin == enteredPin;
  }

  /// Save or change 4-digit PIN
  static Future<void> setPin(String newPin) async {
    await _storage.write(key: _pinKey, value: newPin);
  }

  /// Section locks toggled by admin
  static Future<bool> isPaymentsLocked() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_lockPaymentsKey) ?? false;
  }

  static Future<void> setPaymentsLocked(bool locked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lockPaymentsKey, locked);
  }

  static Future<bool> isDashboardLocked() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_lockDashboardKey) ?? false;
  }

  static Future<void> setDashboardLocked(bool locked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lockDashboardKey, locked);
  }

  static Future<bool> isAccountsLocked() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_lockAccountsKey) ?? false;
  }

  static Future<void> setAccountsLocked(bool locked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lockAccountsKey, locked);
  }

  static Future<bool> isScheduleLocked() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_lockScheduleKey) ?? false;
  }

  static Future<void> setScheduleLocked(bool locked) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lockScheduleKey, locked);
  }
}
