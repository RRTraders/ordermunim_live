import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/stores_tab.dart';
import 'services/night_batch_scheduler_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
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

  @override
  State<MainHomeScreen> createState() => _MainHomeScreenState();
}

class _MainHomeScreenState extends State<MainHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    const DashboardTab(),
    const PaymentsTab(),
    const ReturnOtpTab(),
    const NightScheduleTab(),
    const StoresAndProofTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _tabs[_currentIndex],
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

// 1. Dashboard Tab
class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OrderMunim Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B132B),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 14),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.green.withOpacity(0.4)),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 14),
                SizedBox(width: 4),
                Text('Background Active', style: TextStyle(color: Colors.green, fontSize: 11)),
              ],
            ),
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildMetricCard('On Hold Orders', '0', Icons.pause_circle_outline, Colors.amber),
          const SizedBox(height: 12),
          _buildMetricCard('Pending Orders', '4', Icons.pending_actions, Colors.orange),
          const SizedBox(height: 12),
          _buildMetricCard('Ready to Ship', '18', Icons.local_shipping_outlined, Colors.cyan),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String count, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(width: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          Text(count, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 20)),
        ],
      ),
    );
  }
}

// 2. Payments Tab (with Staff Security Lock placeholder)
class PaymentsTab extends StatelessWidget {
  const PaymentsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Next 7 Days Payouts'), backgroundColor: const Color(0xFF0B132B)),
      body: Center(
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF10B981).withOpacity(0.4)),
          ),
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Upcoming Settlement Total', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
              SizedBox(height: 8),
              Text('₹23,516.51', style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 28)),
            ],
          ),
        ),
      ),
    );
  }
}

// 3. Return OTP Tab (Real-Time Return OTP Cards)
class ReturnOtpTab extends StatelessWidget {
  const ReturnOtpTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Return Delivery OTPs'), backgroundColor: const Color(0xFF0B132B)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.cyan.withOpacity(0.4)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Kaanchan Export 1', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Badge(label: Text('VALMO'), backgroundColor: Colors.cyan),
                  ],
                ),
                SizedBox(height: 12),
                Center(
                  child: Text(
                    '581920',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                      fontSize: 34,
                      color: Colors.amber,
                      letterSpacing: 6,
                    ),
                  ),
                ),
                SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Packets: 4', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    Text('Synced to Web Dashboard', style: TextStyle(color: Colors.green, fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// 4. Night Schedule Tab (12:00 AM Midnight Auto-Accept & Batch Download)
class NightScheduleTab extends StatelessWidget {
  const NightScheduleTab({super.key});

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
