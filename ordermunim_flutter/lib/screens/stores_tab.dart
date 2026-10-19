import 'package:flutter/material.dart';
import '../services/account_vault_service.dart';
import '../services/meesho_api_service.dart';
import '../services/firestore_sync_service.dart';
import 'cctv_unboxing_camera_screen.dart';

class StoresAndProofTab extends StatefulWidget {
  const StoresAndProofTab({super.key});

  @override
  State<StoresAndProofTab> createState() => _StoresAndProofTabState();
}

class _StoresAndProofTabState extends State<StoresAndProofTab> {
  List<MeeshoAccount> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    setState(() => _isLoading = true);
    final list = await AccountVaultService.getAccounts();
    if (mounted) {
      setState(() {
        _accounts = list;
        _isLoading = false;
      });
    }
  }

  void _showAddAccountDialog() {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    bool isAuthenticating = false;
    String? errorMessage;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                top: 24,
                left: 20,
                right: 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Add Meesho Store',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Direct REST authentication with supplier.meesho.com. Credentials are saved locally in your phone encrypted vault.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Supplier Email / Mobile',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF06B6D4)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'Meesho Supplier Password',
                      labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF06B6D4)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  if (errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              errorMessage!,
                              style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF06B6D4),
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: isAuthenticating
                          ? null
                          : () async {
                              final email = emailController.text.trim();
                              final password = passwordController.text;

                              if (email.isEmpty || password.isEmpty) {
                                setModalState(() {
                                  errorMessage = 'Please enter both email and password';
                                });
                                return;
                              }

                              setModalState(() {
                                isAuthenticating = true;
                                errorMessage = null;
                              });

                              try {
                                final accountId = 'MSH_${DateTime.now().millisecondsSinceEpoch}';
                                final api = MeeshoApiService(accountId: accountId);
                                final authResult = await api
                                    .login(identifier: email, password: password)
                                    .timeout(
                                      const Duration(seconds: 8),
                                      onTimeout: () => MeeshoAuthResult(
                                        success: false,
                                        errorMessage: 'Connection timed out. Please check your internet connection.',
                                      ),
                                    );

                                if (!authResult.success) {
                                  setModalState(() {
                                    isAuthenticating = false;
                                    errorMessage = authResult.errorMessage ?? 'Authentication failed. Please check credentials.';
                                  });
                                  return;
                                }

                                // Create verified account
                                final newAcc = MeeshoAccount(
                                  id: accountId,
                                  email: email,
                                  password: password,
                                  storeName: authResult.storeName,
                                  identifier: authResult.identifier,
                                  supplierId: authResult.supplierId,
                                  lastLoginTime: DateTime.now(),
                                  isActive: true,
                                );

                                // Save to encrypted local vault
                                await AccountVaultService.saveAccount(newAcc);

                                // Non-blocking background sync to Firestore (never freezes UI)
                                FirestoreSyncService.syncDeliveryOtp(
                                  accountId: accountId,
                                  storeName: authResult.storeName,
                                  otp: '',
                                  courier: '',
                                  packetCount: 0,
                                ).timeout(const Duration(seconds: 2)).catchError((_) {});

                                if (context.mounted) {
                                  Navigator.pop(context);
                                  _loadAccounts();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Successfully connected: ${authResult.storeName}'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } catch (e) {
                                setModalState(() {
                                  isAuthenticating = false;
                                  errorMessage = 'Error connecting store: $e';
                                });
                              }
                            },
                      child: isAuthenticating
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5),
                            )
                          : const Text(
                              'Verify & Connect Store',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _deleteAccount(MeeshoAccount acc) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Remove Store?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Are you sure you want to disconnect ${acc.storeName}?',
          style: const TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await AccountVaultService.deleteAccount(acc.id);
      _loadAccounts();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Connected Stores & CCTV Proof', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B132B),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF06B6D4)),
            onPressed: _showAddAccountDialog,
            tooltip: 'Add Meesho Store',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // CCTV Camera launcher button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    final activeStore = _accounts.isNotEmpty ? _accounts.first.storeName : 'Meesho Store';
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CctvUnboxingCameraScreen(storeName: activeStore),
                      ),
                    );
                  },
                  icon: const Icon(Icons.videocam),
                  label: const Text('Launch Unboxing CCTV Camera (IST HUD)', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 24),

                // Stores section header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Linked Meesho Accounts (${_accounts.length})',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    TextButton.icon(
                      onPressed: _showAddAccountDialog,
                      icon: const Icon(Icons.add, size: 16, color: Color(0xFF06B6D4)),
                      label: const Text('Add Store', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 13)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Account list or empty state
                if (_accounts.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.storefront_outlined, size: 48, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 12),
                        const Text(
                          'No Meesho Accounts Linked',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Add your Meesho seller account to fetch live delivery OTPs and start 24/7 background sync.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF06B6D4),
                            foregroundColor: Colors.black,
                          ),
                          onPressed: _showAddAccountDialog,
                          icon: const Icon(Icons.add),
                          label: const Text('Add Meesho Store', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  )
                else
                  ..._accounts.map(
                    (acc) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF06B6D4).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.store, color: Color(0xFF06B6D4), size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  acc.storeName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  acc.email,
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                                if (acc.supplierId > 0)
                                  Text(
                                    'Supplier ID: ${acc.supplierId}',
                                    style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 11),
                                  ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                            onPressed: () => _deleteAccount(acc),
                            tooltip: 'Remove Store',
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
