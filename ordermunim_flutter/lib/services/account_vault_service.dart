import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MeeshoAccount {
  final String id;
  final String email;
  final String password;
  String storeName;
  String identifier;
  int supplierId;
  DateTime lastLoginTime;
  bool isActive;

  MeeshoAccount({
    required this.id,
    required this.email,
    required this.password,
    required this.storeName,
    this.identifier = '',
    this.supplierId = 0,
    required this.lastLoginTime,
    this.isActive = true,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'password': password,
        'storeName': storeName,
        'identifier': identifier,
        'supplierId': supplierId,
        'lastLoginTime': lastLoginTime.toIso8601String(),
        'isActive': isActive,
      };

  factory MeeshoAccount.fromJson(Map<String, dynamic> json) => MeeshoAccount(
        id: json['id'] as String,
        email: json['email'] as String,
        password: json['password'] as String,
        storeName: json['storeName'] as String? ?? 'Meesho Store',
        identifier: json['identifier'] as String? ?? '',
        supplierId: json['supplierId'] as int? ?? 0,
        lastLoginTime: json['lastLoginTime'] != null
            ? DateTime.tryParse(json['lastLoginTime'] as String) ?? DateTime.now()
            : DateTime.now(),
        isActive: json['isActive'] as bool? ?? true,
      );
}

class AccountVaultService {
  static const _storage = FlutterSecureStorage();
  static const _accountsKey = 'ordermunim_stored_accounts_v1';

  /// Fetch all stored Meesho accounts
  static Future<List<MeeshoAccount>> getAccounts() async {
    try {
      // Try secure hardware storage first
      final raw = await _storage.read(key: _accountsKey);
      if (raw != null && raw.isNotEmpty) {
        final List<dynamic> list = jsonDecode(raw);
        return list.map((e) => MeeshoAccount.fromJson(e as Map<String, dynamic>)).toList();
      }

      // Fallback to shared preferences
      final prefs = await SharedPreferences.getInstance();
      final prefRaw = prefs.getString(_accountsKey);
      if (prefRaw != null && prefRaw.isNotEmpty) {
        final List<dynamic> list = jsonDecode(prefRaw);
        return list.map((e) => MeeshoAccount.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Save or update an account in the vault
  static Future<void> saveAccount(MeeshoAccount account) async {
    final accounts = await getAccounts();
    final idx = accounts.indexWhere((a) => a.id == account.id || a.email.toLowerCase() == account.email.toLowerCase());
    if (idx != -1) {
      accounts[idx] = account;
    } else {
      accounts.add(account);
    }
    await _persist(accounts);
  }

  /// Delete an account from the vault
  static Future<void> deleteAccount(String accountId) async {
    final accounts = await getAccounts();
    accounts.removeWhere((a) => a.id == accountId);
    await _persist(accounts);
  }

  static Future<void> _persist(List<MeeshoAccount> accounts) async {
    final encoded = jsonEncode(accounts.map((a) => a.toJson()).toList());
    await _storage.write(key: _accountsKey, value: encoded);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accountsKey, encoded);
  }
}
