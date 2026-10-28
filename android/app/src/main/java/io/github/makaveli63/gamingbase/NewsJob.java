package io.github.makaveli63.gamingbase;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
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
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        boolean changed = !json.equals(sp.getString("prefs", ""));
        sp.edit().putString("prefs", json).apply();
        if (changed) WidgetData.refreshAll(ctx); // animes suivis : le widget « Prochains épisodes » les met en tête
        scheduleEvening(ctx);
        scheduleEpisodes(ctx);
    }

    /** 💸 Promo sur un jeu « Je le veux » : une notification par promo (3 au plus à la fois). */
    static void notifyDeals(Context ctx, JSONObject data, JSONObject p) {
        JSONArray wanted = p.optJSONArray("wanted");
        JSONArray deals = data != null ? data.optJSONArray("deals") : null;
        if (!p.optBoolean("priceAlerts", true) || wanted == null || wanted.length() == 0 || deals == null || !canNotify(ctx)) return;
        List<String> names = new ArrayList<>();
        for (int i = 0; i < wanted.length(); i++) {
            String n = norm(wanted.optString(i));
            if (n.length() >= 6) names.add(n);
        }
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> done = new LinkedHashSet<>(prefs.getStringSet("deals", new HashSet<>()));
        int sent = 0;
        for (int i = 0; i < deals.length() && sent < 3; i++) {
            JSONObject d = deals.optJSONObject(i);
            if (d == null || done.contains(d.optString("id"))) continue;
            String title = norm(d.optString("title"));
            boolean match = false;
            for (String n : names) if (title.contains(n)) match = true;
            if (!match) continue;
            done.add(d.optString("id"));
            String price = d.isNull("price") ? "En promo" : d.optString("price") + (d.isNull("oldPrice") ? "" : " au lieu de " + d.optString("oldPrice"));
            int id = ("deal" + d.optString("id")).hashCode();
            channel(ctx).notify(id, build(ctx, "💸 Prix en baisse : " + d.optString("title"),
                    price + " sur " + d.optString("store") + " (−" + Math.round(d.optDouble("discount")) + " %)", "/Webapp-/promos/", id));
            sent++;
        }
        Set<String> keep = new LinkedHashSet<>();
        for (String k : done) if (keep.size() < 300) keep.add(k);
        prefs.edit().putStringSet("deals", keep).apply();
    }

    /** Nom du jeu ou de l'anime suivi (🔔) dont parle l'article, sinon null. */
    static JSONObject followed(JSONObject a, JSONObject p) {
        JSONArray follows = p.optJSONArray("follows");
        String title = norm(a.optString("title"));
        for (int i = 0; follows != null && i < follows.length(); i++) {
            JSONObject f = follows.optJSONObject(i);
            JSONArray aliases = f != null ? f.optJSONArray("a") : null;
            for (int j = 0; aliases != null && j < aliases.length(); j++) {
                String n = norm(aliases.optString(j));
                if (n.length() >= 6 && title.contains(n)) return f;
            }
        }
        return null;
    }

    /** Réveil à la sortie du prochain épisode d'un anime suivi. */
    static void scheduleEpisodes(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 4245, new Intent(ctx, Evening.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (am == null) return;
        JSONArray eps = prefs(ctx).optJSONArray("episodes");
        long now = System.currentTimeMillis();
        long next = Long.MAX_VALUE;
        for (int i = 0; eps != null && i < eps.length(); i++) {
            JSONObject e = eps.optJSONObject(i);
            long at = e != null ? e.optLong("atMs") : 0;
            if (at > now && at < next) next = at;
        }
        if (!isEnabled(ctx) || next == Long.MAX_VALUE) {
            am.cancel(pi);
            return;
        }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next + 60_000L, pi);
    }

    /** Épisodes sortis des animes suivis, pas encore notifiés. */
    static void notifyEpisodes(Context ctx) {
        if (!isEnabled(ctx) || !canNotify(ctx)) return;
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        Set<String> done = new LinkedHashSet<>(prefs.getStringSet("episodesDone", new HashSet<>()));
        JSONArray eps = prefs(ctx).optJSONArray("episodes");
        long now = System.currentTimeMillis();
        boolean changed = false;
        for (int i = 0; eps != null && i < eps.length(); i++) {
            JSONObject e = eps.optJSONObject(i);
            if (e == null) continue;
            long at = e.optLong("atMs");
            String path = e.optString("path");
            String key = path + "#" + e.optInt("episode");
            if (at > now || at < now - 2 * 86_400_000L || done.contains(key) || !path.startsWith("/Webapp-/")) continue;
            done.add(key);
            changed = true;
            int id = key.hashCode();
            channel(ctx).notify(id, build(ctx, "▶️ Nouvel épisode : " + e.optString("title"),
                    "L'épisode " + e.optInt("episode") + " est disponible.", path, id));
        }
        if (changed) {
            Set<String> keep = new LinkedHashSet<>();
            for (String k : done) if (keep.size() < 200) keep.add(k);
            prefs.edit().putStringSet("episodesDone", keep).apply();
        }
    }

    /**
     * Résumé du soir : réveil à 19 h, même téléphone en veille (la vérification toutes les 30 min
     * peut être repoussée de plusieurs heures par Android). Reprogrammé chaque soir pour le lendemain.
     */
    static void scheduleEvening(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 4244, new Intent(ctx, Evening.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (am == null) return;
        if (!isEnabled(ctx) || !prefs(ctx).optBoolean("digest")) {
            am.cancel(pi);
            return;
        }
        Calendar at = Calendar.getInstance();
        at.set(Calendar.HOUR_OF_DAY, 19);
        at.set(Calendar.MINUTE, 0);
        at.set(Calendar.SECOND, 0);
        at.set(Calendar.MILLISECOND, 0);
        if (at.getTimeInMillis() <= System.currentTimeMillis()) at.add(Calendar.DAY_OF_YEAR, 1);
        // Réveil approximatif autorisé en veille : pas besoin de l'autorisation d'alarme exacte.
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.getTimeInMillis(), pi);
    }

    /** Réveil de 19 h : vérifie le site et envoie le résumé, puis programme celui du lendemain. */
    public static class Evening extends BroadcastReceiver {
        @Override
        public void onReceive(Context ctx, Intent intent) {
            PendingResult result = goAsync();
            Context app = ctx.getApplicationContext();
            new Thread(() -> {
                try {
                    notifyEpisodes(app);
                    check(app, true);
                } finally {
                    scheduleEvening(app);
                    scheduleEpisodes(app);
                    result.finish();
                }
            }).start();
        }
    }

    static JSONObject prefs(Context ctx) {
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
        scheduleEvening(ctx);
        scheduleEpisodes(ctx);
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
            notifyEpisodes(getApplicationContext());
            check(getApplicationContext(), true);
            scheduleEvening(getApplicationContext()); // aussi après un redémarrage du téléphone
            scheduleEpisodes(getApplicationContext());
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
        if (notify) notifyDeals(ctx, data, prefs(ctx));
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
        for (JSONObject a : fresh) {
            // Jeux et animes suivis (🔔) : notifiés tout de suite, même hors des filtres et du résumé du soir.
            JSONObject follow = followed(a, p);
            if (follow != null) {
                if (canNotify(ctx)) {
                    String path = a.optString("path");
                    // Anime : le titre de l'actu peut dévoiler la suite, il reste masqué.
                    boolean hide = "anime".equals(follow.optString("k")) && p.optBoolean("spoilerShield", true);
                    String text = hide ? "Nouvelle actu : touche pour la lire (titre masqué, sans spoiler)." : a.optString("title");
                    channel(ctx).notify(path.hashCode(), build(ctx, "🔔 " + follow.optString("t"), text, path, path.hashCode()));
                }
            } else if (matches(a, p)) matched.add(a);
        }

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
        PendingIntent open = WidgetData.open(ctx, path, id);
        // Montre connectée (Wear OS, Galaxy Watch) : la notification y est recopiée, avec « Ouvrir sur le téléphone ».
        Notification.Action onPhone = new Notification.Action.Builder(
                android.graphics.drawable.Icon.createWithResource(ctx, R.drawable.ic_notif), "Ouvrir sur le téléphone", open).build();
        return b.setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setContentIntent(open)
                .setGroup("gamingbase")
                .setCategory(Notification.CATEGORY_RECOMMENDATION)
                .extend(new Notification.WearableExtender().addAction(onPhone))
                .build();
    }
}
