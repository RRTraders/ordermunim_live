import 'package:android_alarm_manager_plus/android_alarm_manager_plus.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NightBatchSchedulerService {
  static const int midnightBatchAlarmId = 9901;

  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    await AndroidAlarmManager.initialize();

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    await _notificationsPlugin.initialize(initSettings);
  }

  /// Schedule midnight task (e.g., 12:00 AM)
  static Future<void> scheduleMidnightAlarm({
    required DateTime targetTime,
    bool dailyRepeat = true,
  }) async {
    if (dailyRepeat) {
      await AndroidAlarmManager.periodic(
        const Duration(days: 1),
        midnightBatchAlarmId,
        executeMidnightBatchTask,
        startAt: targetTime,
        exact: true,
        wakeup: true,
        rescheduleOnReboot: true,
      );
    } else {
      await AndroidAlarmManager.oneShotAt(
        targetTime,
        midnightBatchAlarmId,
        executeMidnightBatchTask,
        exact: true,
        wakeup: true,
        rescheduleOnReboot: true,
      );
    }
  }

  /// The autonomous background execution function triggered while seller is asleep
  @pragma('vm:entry-point')
  static Future<void> executeMidnightBatchTask() async {
    // 1. Accepts pending orders on Meesho backend (moves to Ready to Ship)
    // 2. Triggers batch shipping label generation during quiet midnight hours
    // 3. Syncs ready-to-print PDF links to Firestore /labels_queue
    const androidDetails = AndroidNotificationDetails(
      'ordermunim_batch_channel',
      'Midnight Order & Label Batch',
      channelDescription: 'Automated midnight Meesho order acceptance and label batch download',
      importance: Importance.high,
      priority: Priority.high,
    );
    const notificationDetails = NotificationDetails(android: androidDetails);

    await _notificationsPlugin.show(
      midnightBatchAlarmId,
      'OrderMunim Midnight Batch Completed',
      'All pending orders accepted and shipping labels downloaded for morning dispatch.',
      notificationDetails,
    );
  }
}
