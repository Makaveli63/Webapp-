package io.github.makaveli63.gamingbase;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * « Compte à rebours en direct » : notification persistante du jeu épinglé (équivalent Android des
 * Live Activities). Mise à jour toutes les 30 min environ ; dans les dernières 24 h, le minuteur défile
 * tout seul. Sur Android 16, elle peut s'afficher en « Live Update » (mise en avant sur l'écran verrouillé).
 */
public class LiveCountdown extends JobService {
    private static final String PREFS = "live";
    private static final String CHANNEL = "live";
    private static final int NOTIF_ID = 4242;
    private static final int JOB_ID = 1002;

    static boolean isEnabled(Context ctx) {
        return ctx.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("enabled", false);
    }

    static void setEnabled(Context ctx, boolean on) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("enabled", on).apply();
        JobScheduler js = ctx.getSystemService(JobScheduler.class);
        if (!on) {
            js.cancel(JOB_ID);
            ctx.getSystemService(NotificationManager.class).cancel(NOTIF_ID);
            return;
        }
        refreshAsync(ctx);
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(ctx, LiveCountdown.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(30 * 60 * 1000L)
                .setPersisted(true)
                .build());
    }

    /** Met à jour la notification en arrière-plan (ouverture de l'app, nouvelle épingle). */
    static void refreshAsync(Context ctx) {
        Context app = ctx.getApplicationContext();
        if (isEnabled(app)) new Thread(() -> refresh(app)).start();
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            refresh(getApplicationContext());
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    private static void refresh(Context ctx) {
        if (!isEnabled(ctx)) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 33
                && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        JSONObject release = WidgetData.chooseRelease(ctx, WidgetData.load(ctx), null);
        long now = System.currentTimeMillis();
        if (release == null || release.optLong("atMs") < now - 3_600_000L) {
            nm.cancel(NOTIF_ID);
            return;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Compte à rebours en direct", NotificationManager.IMPORTANCE_LOW));
        }
        long at = release.optLong("atMs");
        String title = release.optString("title");
        String text = "Sortie le " + day(at) + " · " + left(at);
        @SuppressWarnings("deprecation")
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(R.drawable.ic_notif)
                .setContentTitle("🎮 " + title)
                .setContentText(text)
                .setSubText("Jeu épinglé")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(true)
                .setWhen(at)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setContentIntent(WidgetData.open(ctx, release.optString("path"), NOTIF_ID));
        // Dernières 24 h : le minuteur de la notification défile à la seconde, sans mise à jour.
        if (at > now && at - now < 86_400_000L) b.setUsesChronometer(true).setChronometerCountDown(true);
        Bitmap image = WidgetData.image(release.optString("image", null));
        if (image != null) b.setLargeIcon(Bitmap.createScaledBitmap(image, 256, Math.max(1, 256 * image.getHeight() / Math.max(1, image.getWidth())), true));
        // Android 16 : demande l'affichage en « Live Update » (équivalent de Notification.Builder#setRequestPromotedOngoing).
        Bundle extras = new Bundle();
        extras.putBoolean("android.requestPromotedOngoing", true);
        b.addExtras(extras);
        nm.notify(NOTIF_ID, b.build());
    }

    private static String day(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("d MMMM yyyy", Locale.FRANCE);
        f.setTimeZone(TimeZone.getTimeZone("Europe/Paris"));
        return f.format(new Date(ms));
    }

    /** « dans 21 j 19 h », « dans 5 h 12 min » ou « disponible ! ». */
    private static String left(long at) {
        long ms = at - System.currentTimeMillis();
        if (ms <= 0) return "disponible !";
        long d = ms / 86_400_000L, h = (ms / 3_600_000L) % 24, m = (ms / 60_000L) % 60;
        return d > 0 ? "dans " + d + " j " + h + " h" : "dans " + h + " h " + m + " min";
    }
}
