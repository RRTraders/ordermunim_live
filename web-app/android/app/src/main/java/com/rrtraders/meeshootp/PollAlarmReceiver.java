package com.rrtraders.meeshootp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;

import java.util.concurrent.Executors;

/**
 * PollAlarmReceiver: System-level Alarm Receiver for OrderMunim.
 * Woken up by Android AlarmManager. Runs poll directly using goAsync()
 * so it NEVER gets blocked by Android 12+ ForegroundServiceStartNotAllowedException!
 */
public class PollAlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_POLL = "com.rrtraders.meeshootp.ACTION_POLL_ALARM";
    public static final int ALARM_REQUEST_CODE = 8888;

    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            try {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "OrderMunim:AlarmPollLock");
                wakeLock.acquire(25000); // 25s WakeLock to guarantee network call completion
            } catch (Exception ignored) {}
        }

        final PowerManager.WakeLock wl = wakeLock;

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                // Execute pollAllAccounts directly in background with WakeLock!
                // This eliminates any reliance on startForegroundService from background
                // which Android 12+ blocks with ForegroundServiceStartNotAllowedException!
                MeeshoBackgroundService.pollAllAccountsStatic(context);
            } catch (Exception ignored) {
            } finally {
                // Schedule the next alarm based on day/night dynamic schedule
                long delaySeconds = MeeshoBackgroundService.getDynamicPollDelaySecondsStatic();
                scheduleNextAlarm(context, delaySeconds);

                if (wl != null && wl.isHeld()) {
                    try { wl.release(); } catch (Exception ignored) {}
                }
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        });
    }

    public static void scheduleNextAlarm(Context context, long delaySeconds) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, PollAlarmReceiver.class);
            intent.setAction(ACTION_POLL);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context, ALARM_REQUEST_CODE, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            long triggerAtMillis = System.currentTimeMillis() + (delaySeconds * 1000L);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
        } catch (Exception ignored) {}
    }

    public static void cancelAlarm(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(context, PollAlarmReceiver.class);
            intent.setAction(ACTION_POLL);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context, ALARM_REQUEST_CODE, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            am.cancel(pi);
        } catch (Exception ignored) {}
    }
}
