import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreSyncService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Syncs live Return Delivery OTP to Firestore /accounts/{accountId}
  /// This triggers onSnapshot on ordermunim.com and Warehouse Staff views instantly (0ms delay)
  static Future<void> syncDeliveryOtp({
    required String accountId,
    required String storeName,
    required String otp,
    required String courier,
    required int packetCount,
    String? deliveryBoyPhone,
  }) async {
    try {
      final docRef = _firestore.collection('accounts').doc(accountId);
      await docRef.set({
        'currentOtp': otp,
        'courier': courier,
        'packetCount': packetCount,
        'deliveryBoyPhone': deliveryBoyPhone ?? '',
        'status': 'live',
        'storeName': storeName,
        'lastSyncedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'engine': 'flutter_direct_rest',
      }, SetOptions(merge: true));
    } catch (e) {
      // Ignore or log network retries
    }
  }

  /// Syncs night-downloaded label batch links for 1-click desktop printing
  static Future<void> syncNightBatchLabels({
    required String accountId,
    required String storeName,
    required String pdfUrl,
    required int orderCount,
  }) async {
    try {
      final batchId = 'batch_${DateTime.now().millisecondsSinceEpoch}';
      await _firestore.collection('labels_queue').doc(batchId).set({
        'accountId': accountId,
        'storeName': storeName,
        'pdfUrl': pdfUrl,
        'orderCount': orderCount,
        'status': 'ready_to_print',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {}
  }
}
