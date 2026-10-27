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
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Notifications des nouveaux articles (au choix, interrupteur sur le site dans l'app) :
 * vérifie le site toutes les 30 minutes environ et notifie les articles pas encore vus.
 */
public class NewsJob extends JobService {
    private static final int JOB_ID = 1001;
    private static final String CHANNEL = "actus";
    private static final String PREFS = "notifications";

    static void savePrefs(Context ctx, String json) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString("prefs", json).apply();
    }

    private static JSONObject prefs(Context ctx) {
        try {
            return new JSONObject(ctx.getSharedPreferences(PREFS, MODE_PRIVATE).getString("prefs", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static String norm(String s) {
        String t = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return " " + t.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim() + " ";
    }

    /** L'article correspond-il aux réglages ? (plateformes, tests seulement, jeux de Ma collection) */
    static boolean matches(JSONObject a, JSONObject p) {
        boolean anime = "Anime".equals(a.optString("category"));
        if (anime && (!p.optBoolean("anime", true) || p.optBoolean("testsOnly"))) return false;
        JSONArray wanted = p.optJSONArray("platforms");
        if (!anime && wanted != null && wanted.length() > 0) { // l'anime n'a pas de plateforme de jeu
            JSONArray plats = a.optJSONArray("platforms");
            boolean ok = false;
            for (int i = 0; plats != null && i < plats.length() && !ok; i++) {
                String pl = plats.optString(i);
                if ("Multi".equals(pl)) ok = true;
                for (int j = 0; j < wanted.length() && !ok; j++) ok = wanted.optString(j).equals(pl);
            }
            if (!ok) return false;
        }
        if (p.optBoolean("testsOnly") && !"Test".equals(a.optString("category"))) return false;
        if (p.optBoolean("myGames")) {
            JSONArray games = p.optJSONArray("games");
            String title = norm(a.optString("title"));
            boolean ok = false;
            for (int i = 0; games != null && i < games.length() && !ok; i++) {
                String g = norm(games.optString(i));
                ok = g.trim().length() >= 3 && title.contains(g);
            }
            if (!ok) return false;
        }
        return true;
    }

    static boolean isEnabled(Context ctx) {
        return ctx.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean("enabled", false);
    }

    /** Active (et mémorise les articles actuels pour ne pas tout notifier d'un coup) ou coupe. */
    static void setEnabled(Context ctx, boolean on) {
        ctx.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("enabled", on).apply();
        JobScheduler js = ctx.getSystemService(JobScheduler.class);
        if (!on) {
            js.cancel(JOB_ID);
            return;
        }
        new Thread(() -> check(ctx.getApplicationContext(), false)).start();
        js.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(ctx, NewsJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(30 * 60 * 1000L)
                .setPersisted(true) // reprend après un redémarrage du téléphone
                .build());
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            check(getApplicationContext(), true);
            WidgetData.refreshAll(getApplicationContext()); // les widgets profitent des nouvelles données
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    static void check(Context ctx, boolean notify) {
        if (!isEnabled(ctx)) return;
        JSONObject data = WidgetData.load(ctx);
        JSONArray news = data != null ? data.optJSONArray("news") : null;
        if (news == null) return;
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> seen = new HashSet<>(prefs.getStringSet("seen", new HashSet<>()));
        boolean firstRun = seen.isEmpty();
        List<JSONObject> fresh = new ArrayList<>();
        Set<String> keep = new LinkedHashSet<>();
        for (int i = 0; i < news.length(); i++) {
            JSONObject a = news.optJSONObject(i);
            if (a == null) continue;
            String path = a.optString("path");
            keep.add(path);
            if (!seen.contains(path)) fresh.add(a);
        }
        for (String s : seen) if (keep.size() < 200) keep.add(s);
        prefs.edit().putStringSet("seen", keep).apply();
        if (!notify || firstRun) return;
        JSONObject p = prefs(ctx);
        List<JSONObject> matched = new ArrayList<>();
        for (JSONObject a : fresh) if (matches(a, p)) matched.add(a);

        // Résumé du soir : on met de côté, et on envoie une seule notification par jour à partir de 19 h.
        if (p.optBoolean("digest")) {
            JSONArray pending;
            try {
                pending = new JSONArray(prefs.getString("pending", "[]"));
            } catch (Exception e) {
                pending = new JSONArray();
            }
            for (JSONObject a : matched) if (pending.length() < 50) pending.put(a);
            Calendar now = Calendar.getInstance();
            String today = now.get(Calendar.YEAR) + "-" + now.get(Calendar.DAY_OF_YEAR);
            boolean due = now.get(Calendar.HOUR_OF_DAY) >= 19 && !today.equals(prefs.getString("digestDay", ""));
            if (!due || pending.length() == 0) {
                prefs.edit().putString("pending", pending.toString()).apply();
                return;
            }
            prefs.edit().putString("pending", "[]").putString("digestDay", today).apply();
            fresh = new ArrayList<>();
            for (int i = 0; i < pending.length(); i++) fresh.add(pending.optJSONObject(i));
            if (!canNotify(ctx)) return;
            StringBuilder titles = new StringBuilder();
            for (int i = 0; i < Math.min(4, fresh.size()); i++) titles.append(i > 0 ? "\n" : "").append("• ").append(fresh.get(i).optString("title"));
            channel(ctx).notify(3000, build(ctx, "🌙 Ton résumé du soir : " + fresh.size() + " actu" + (fresh.size() > 1 ? "s" : ""),
                    titles.toString(), "/Webapp-/actualites/", 3000));
            return;
        }
        fresh = matched;
        if (fresh.isEmpty() || !canNotify(ctx)) return;
        NotificationManager nm = channel(ctx);
        if (fresh.size() > 3) {
            StringBuilder titles = new StringBuilder();
            for (int i = 0; i < 3; i++) titles.append(i > 0 ? " · " : "").append(fresh.get(i).optString("title"));
            nm.notify(2000, build(ctx, "🎮 " + fresh.size() + " nouvelles actus", titles.toString(), "/Webapp-/actualites/", 2000));
            return;
        }
        for (JSONObject a : fresh) {
            String path = a.optString("path");
            int id = path.hashCode();
            boolean test = "Test".equals(a.optString("category"));
            String score = a.isNull("score") ? "" : " · " + a.optString("score");
            nm.notify(id, build(ctx, test ? "⭐ Nouveau test" + score : "📰 Nouvelle actu", a.optString("title"), path, id));
        }
    }

    private static boolean canNotify(Context ctx) {
        return Build.VERSION.SDK_INT < 33
                || ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private static NotificationManager channel(Context ctx) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Nouveaux articles", NotificationManager.IMPORTANCE_DEFAULT));
        }
        return nm;
    }

    @SuppressWarnings("deprecation")
    private static Notification build(Context ctx, String title, String text, String path, int id) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        return b.setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setContentIntent(WidgetData.open(ctx, path, id))
                .build();
    }
}
