# Capacitor Plugin & Bridge Preservation Rules
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.** { *; }

# Keep Core Manifest Components
-keep public class com.rrtraders.meeshootp.MainActivity { *; }
-keep public class com.rrtraders.meeshootp.MeeshoBackgroundService extends android.app.Service { *; }
-keep public class com.rrtraders.meeshootp.PollAlarmReceiver extends android.content.BroadcastReceiver { *; }
-keep public class com.rrtraders.meeshootp.BootReceiver extends android.content.BroadcastReceiver { *; }
-keep public class com.rrtraders.meeshootp.CopyOtpReceiver extends android.content.BroadcastReceiver { *; }

# Security Shield
-keep class com.rrtraders.meeshootp.SecurityShield {
    public static java.lang.String get*(...);
}

# Aggressive Obfuscation & Bytecode Scrambling
-dontusemixedcaseclassnames
-overloadaggressively
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*
