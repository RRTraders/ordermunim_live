package com.rrtraders.meeshootp;

import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class CopyOtpReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String otp = intent.getStringExtra("otp");
        if (otp != null && !otp.isEmpty() && !otp.equals("----")) {
            ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard != null) {
                ClipData clip = ClipData.newPlainText("Meesho OTP", otp);
                clipboard.setPrimaryClip(clip);
                Toast.makeText(context, "OTP " + otp + " copied to clipboard!", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
