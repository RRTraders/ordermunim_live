import 'dart:io';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/account_vault_service.dart';
import '../services/meesho_api_service.dart';
import '../services/firestore_sync_service.dart';

class MeeshoWebLoginModal extends StatefulWidget {
  final String initialEmail;
  final String initialPassword;

  const MeeshoWebLoginModal({
    super.key,
    this.initialEmail = '',
    this.initialPassword = '',
  });

  static Future<bool?> show(
    BuildContext context, {
    String initialEmail = '',
    String initialPassword = '',
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => MeeshoWebLoginModal(
        initialEmail: initialEmail,
        initialPassword: initialPassword,
      ),
    );
  }

  @override
  State<MeeshoWebLoginModal> createState() => _MeeshoWebLoginModalState();
}

class _MeeshoWebLoginModalState extends State<MeeshoWebLoginModal> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isProcessingSuccess = false;
  String _statusText = 'Loading Meesho Security Gateway...';

  static const String _desktopUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent(_desktopUserAgent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (url) async {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _statusText = 'Please enter credentials or complete verification';
              });
            }
            _injectCredentials();
            await _checkLoginSuccess(url);
          },
          onNavigationRequest: (request) {
            _checkLoginSuccess(request.url);
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse('https://supplier.meesho.com/panel/v3/new/root/login'));
  }

  Future<void> _injectCredentials() async {
    if (widget.initialEmail.isEmpty && widget.initialPassword.isEmpty) return;
    try {
      final js = '''
        (function() {
          try {
            const emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="mobile" i]');
            if (emailInput && (!emailInput.value || emailInput.value === '')) {
              emailInput.value = '${widget.initialEmail.replaceAll("'", "\\'")}';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const passInput = document.querySelector('input[type="password"]');
            if (passInput && (!passInput.value || passInput.value === '')) {
              passInput.value = '${widget.initialPassword.replaceAll("'", "\\'")}';
              passInput.dispatchEvent(new Event('input', { bubbles: true }));
              passInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch(e) {}
        })();
      ''';
      await _controller.runJavaScript(js);
    } catch (_) {}
  }

  Future<void> _checkLoginSuccess([String? currentUrl]) async {
    if (_isProcessingSuccess) return;

    final url = currentUrl ?? (await _controller.currentUrl()) ?? '';

    // If redirected to home, dashboard, or overview
    final isHomeOrDashboard = url.contains('/panel/v3/new/root/home') ||
        url.contains('/panel/v3/new/root/overview') ||
        url.contains('/fulfillment') ||
        (url.contains('/panel/v3/new/root') && !url.contains('/login'));

    // Also check document.cookie directly
    bool hasAuthCookie = false;
    String rawCookies = '';
    try {
      final cookieRes = await _controller.runJavaScriptReturningResult('document.cookie');
      rawCookies = cookieRes.toString().replaceAll('"', '');
      hasAuthCookie = rawCookies.contains('supplier_auth') ||
          rawCookies.contains('meesho_token') ||
          rawCookies.contains('auth_token');
    } catch (_) {}

    if (isHomeOrDashboard || hasAuthCookie) {
      await _handleSuccessfulAuth(rawCookies);
    }
  }

  Future<void> _handleSuccessfulAuth(String rawCookieStr) async {
    if (_isProcessingSuccess) return;
    setState(() {
      _isProcessingSuccess = true;
      _statusText = 'Session verified! Connecting store...';
    });

    try {
      final accountId = 'MSH_${DateTime.now().millisecondsSinceEpoch}';
      final api = MeeshoApiService(accountId: accountId);
      await api.init();

      // Convert rawCookies to Cookie list and save into account's CookieJar
      final parsedCookies = <Cookie>[];
      for (final part in rawCookieStr.split(';')) {
        final kv = part.trim().split('=');
        if (kv.length >= 2) {
          final k = kv[0].trim();
          final v = kv.sublist(1).join('=').trim();
          if (k.isNotEmpty) {
            parsedCookies.add(
              Cookie(k, v)
                ..domain = '.meesho.com'
                ..path = '/',
            );
          }
        }
      }

      if (parsedCookies.isNotEmpty) {
        await api.saveCookies(parsedCookies);
      }

      // Fetch official store name & identifier from Meesho API
      final details = await api.getSupplierDetails().timeout(
            const Duration(seconds: 5),
            onTimeout: () => {'success': false},
          );

      String storeName = 'Meesho Store';
      String identifier = '';
      int supplierId = 0;

      if (details['success'] == true) {
        if (details['storeName'] != null && details['storeName'].toString().isNotEmpty) {
          storeName = details['storeName'].toString().trim();
        }
        if (details['identifier'] != null) {
          identifier = details['identifier'].toString().trim();
        }
        if (details['supplierId'] != null) {
          supplierId = int.tryParse(details['supplierId'].toString()) ?? 0;
        }
      }

      // Fallback display if store name is generic
      final emailLower = widget.initialEmail.toLowerCase();
      if (storeName == 'Meesho Store') {
        if (emailLower.contains('kaanchan') || emailLower.contains('kanchan') || emailLower.contains('vipul')) {
          storeName = 'Kaanchan Export 1';
        }
      }

      final newAcc = MeeshoAccount(
        id: accountId,
        email: widget.initialEmail.isNotEmpty ? widget.initialEmail : 'supplier@meesho.com',
        password: widget.initialPassword,
        storeName: storeName,
        identifier: identifier,
        supplierId: supplierId,
        lastLoginTime: DateTime.now(),
        isActive: true,
      );

      await AccountVaultService.saveAccount(newAcc);

      // Async Firestore sync
      FirestoreSyncService.syncDeliveryOtp(
        accountId: accountId,
        storeName: storeName,
        otp: '',
        courier: '',
        packetCount: 0,
      ).timeout(const Duration(seconds: 2)).catchError((_) {});

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessingSuccess = false;
          _statusText = 'Error connecting store. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF06B6D4).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.shield_outlined, color: Color(0xFF06B6D4), size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Meesho Security Verification',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _statusText,
                        style: TextStyle(
                          color: _isProcessingSuccess ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                          fontSize: 11,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8), size: 20),
                  onPressed: () => _controller.reload(),
                  tooltip: 'Reload',
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF94A3B8), size: 20),
                  onPressed: () => Navigator.pop(context, false),
                  tooltip: 'Close',
                ),
              ],
            ),
          ),
          if (_isLoading || _isProcessingSuccess)
            const LinearProgressIndicator(
              backgroundColor: Color(0xFF1E293B),
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF06B6D4)),
              minHeight: 2.5,
            ),

          // WebView Container
          Expanded(
            child: ClipRRect(
              child: WebViewWidget(controller: _controller),
            ),
          ),

          // Manual Completion Footer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: const Color(0xFF0F172A),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: _isProcessingSuccess
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_circle_outline, size: 18),
                    label: Text(
                      _isProcessingSuccess ? 'Connecting...' : 'Completed Login? Connect Now',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    onPressed: _isProcessingSuccess ? null : () => _checkLoginSuccess(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
