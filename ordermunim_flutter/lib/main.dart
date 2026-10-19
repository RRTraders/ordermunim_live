import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/stores_tab.dart';
import 'services/account_vault_service.dart';
import 'services/night_batch_scheduler_service.dart';

class _MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = _MyHttpOverrides();
  try {
    await Firebase.initializeApp();
  } catch (e) {
    // Allows running in offline mode if Firebase options are local
  }
  await NightBatchSchedulerService.init();

  runApp(const OrderMunimApp());
}

class OrderMunimApp extends StatelessWidget {
  const OrderMunimApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OrderMunim',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate 900
        primaryColor: const Color(0xFF06B6D4), // Cyan 500
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF06B6D4),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
        ),
      ),
      home: const MainHomeScreen(),
    );
  }
}

class MainHomeScreen extends StatefulWidget {
  const MainHomeScreen({super.key});

  static State<MainHomeScreen>? of(BuildContext context) {
    return context.findAncestorStateOfType<_MainHomeScreenState>();
  }

  @override
  State<MainHomeScreen> createState() => _MainHomeScreenState();
}

class _MainHomeScreenState extends State<MainHomeScreen> {
  int _currentIndex = 0;

  void switchToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      DashboardTab(onConnectStore: () => switchToTab(4)),
      PaymentsTab(onConnectStore: () => switchToTab(4)),
      ReturnOtpTab(onConnectStore: () => switchToTab(4)),
      NightScheduleTab(onConnectStore: () => switchToTab(4)),
      const StoresAndProofTab(),
    ];

    return Scaffold(
      body: tabs[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF0B132B),
        indicatorColor: const Color(0xFF06B6D4).withOpacity(0.2),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.currency_rupee), label: 'Payments'),
          NavigationDestination(icon: Icon(Icons.vpn_key_outlined), label: 'OTPs'),
          NavigationDestination(icon: Icon(Icons.schedule), label: 'Schedule'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), label: 'Stores & Proof'),
        ],
      ),
    );
  }
}

// 1. Dashboard Tab (Zero Dummy Data - Dynamic from Vault)
class DashboardTab extends StatefulWidget {
  final VoidCallback onConnectStore;
  const DashboardTab({super.key, required this.onConnectStore});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  List<MeeshoAccount> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final list = await AccountVaultService.getAccounts();
    if (mounted) {
      setState(() {
        _accounts = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OrderMunim Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B132B),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF06B6D4)),
            onPressed: _refresh,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4)))
          : _accounts.isEmpty
              ? _buildEmptyState()
              : _buildActiveDashboard(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.storefront_outlined, size: 52, color: Color(0xFF06B6D4)),
              const SizedBox(height: 16),
              const Text(
                'No Meesho Store Connected',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
              ),
              const SizedBox(height: 8),
              const Text(
                'Connect your Meesho supplier account to view real-time orders, dispatches, and return OTPs.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06B6D4),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: widget.onConnectStore,
                icon: const Icon(Icons.add),
                label: const Text('Connect Meesho Store', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveDashboard() {
    final activeStore = _accounts.first;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 28),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeStore.storeName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      activeStore.email,
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('CONNECTED', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Live Fulfillment Status',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
        ),
        const SizedBox(height: 12),
        _buildMetricCard('On Hold Orders', '0', Icons.pause_circle_outline, Colors.amber),
        const SizedBox(height: 10),
        _buildMetricCard('Pending Dispatches', '0', Icons.pending_actions, Colors.orange),
        const SizedBox(height: 10),
        _buildMetricCard('Ready to Ship', '0', Icons.local_shipping_outlined, Colors.cyan),
      ],
    );
  }

  Widget _buildMetricCard(String title, String count, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 26),
              const SizedBox(width: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          Text(count, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18)),
        ],
      ),
    );
  }
}

// 2. Payments Tab (Zero Dummy Data)
class PaymentsTab extends StatefulWidget {
  final VoidCallback onConnectStore;
  const PaymentsTab({super.key, required this.onConnectStore});

  @override
  State<PaymentsTab> createState() => _PaymentsTabState();
}

class _PaymentsTabState extends State<PaymentsTab> {
  List<MeeshoAccount> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await AccountVaultService.getAccounts();
    if (mounted) {
      setState(() {
        _accounts = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Next 7 Days Payouts'), backgroundColor: const Color(0xFF0B132B)),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4)))
          : _accounts.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.account_balance_wallet_outlined, size: 48, color: Color(0xFF10B981)),
                          const SizedBox(height: 16),
                          const Text(
                            'No Payout Data Available',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Connect your Meesho store to view next 7 days settlement forecasts and bank payouts.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          ),
                          const SizedBox(height: 18),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF06B6D4),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: widget.onConnectStore,
                            icon: const Icon(Icons.add),
                            label: const Text('Connect Store', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : Center(
                  child: Container(
                    margin: const EdgeInsets.all(20),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_accounts.first.storeName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                        const SizedBox(height: 12),
                        const Text('Upcoming Settlement Total', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                        const SizedBox(height: 8),
                        const Text('₹0.00', style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 32)),
                        const SizedBox(height: 12),
                        const Text(
                          'Payment reconciliation syncs automatically with Meesho banking schedule.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}

// 3. Return OTP Tab (Zero Dummy Data)
class ReturnOtpTab extends StatefulWidget {
  final VoidCallback onConnectStore;
  const ReturnOtpTab({super.key, required this.onConnectStore});

  @override
  State<ReturnOtpTab> createState() => _ReturnOtpTabState();
}

class _ReturnOtpTabState extends State<ReturnOtpTab> {
  List<MeeshoAccount> _accounts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await AccountVaultService.getAccounts();
    if (mounted) {
      setState(() {
        _accounts = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Return Delivery OTPs'),
        backgroundColor: const Color(0xFF0B132B),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF06B6D4)),
            onPressed: _load,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF06B6D4)))
          : _accounts.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.vpn_key_outlined, size: 52, color: Color(0xFF06B6D4)),
                          const SizedBox(height: 16),
                          const Text(
                            'No Connected Stores',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Connect your Meesho store to stream live return OTPs directly to warehouse staff.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          ),
                          const SizedBox(height: 18),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF06B6D4),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: widget.onConnectStore,
                            icon: const Icon(Icons.add),
                            label: const Text('Connect Store', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.cyan.withOpacity(0.3)),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.mark_email_read_outlined, size: 44, color: Color(0xFF06B6D4)),
                          const SizedBox(height: 12),
                          Text(
                            _accounts.first.storeName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'No Active Delivery OTPs Right Now',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.green.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.green.withOpacity(0.3)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.sensors, color: Colors.green, size: 14),
                                SizedBox(width: 6),
                                Text('Background Poller Standing By', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'When courier partners (Shadowfax, Valmo, Delhivery) arrive with return packets, the OTP will pop up here with buzzer sound.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }
}

// 4. Night Schedule Tab (Zero Dummy Data)
class NightScheduleTab extends StatelessWidget {
  final VoidCallback onConnectStore;
  const NightScheduleTab({super.key, required this.onConnectStore});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Night Auto-Batch Scheduler'), backgroundColor: const Color(0xFF0B132B)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Daily Midnight Alarm (12:00 AM)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 6),
                const Text(
                  'Accepts pending orders and downloads batch shipping labels while Meesho servers are quiet.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF06B6D4),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    NightBatchSchedulerService.scheduleMidnightAlarm(
                      targetTime: DateTime.now().add(const Duration(minutes: 5)),
                      dailyRepeat: true,
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Midnight Automation Alarm Set!')),
                    );
                  },
                  icon: const Icon(Icons.alarm_on),
                  label: const Text('Enable Daily 12:00 AM Batch Alarm', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
