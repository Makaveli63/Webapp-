package io.github.makaveli63.gamingbase;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Données des widgets : widget.json du site, gardé en mémoire pour l'affichage hors connexion. */
final class WidgetData {
    static final String ORIGIN = "https://makaveli63.github.io";
    private static final String URL_JSON = ORIGIN + "/Webapp-/widget.json";
    private static final int MAX_BYTES = 256 * 1024;

    private WidgetData() {}

    /** Télécharge les dernières données (thread d'arrière-plan) ; sinon renvoie la dernière version connue. */
    static JSONObject load(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences("widgets", Context.MODE_PRIVATE);
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(URL_JSON).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setRequestProperty("Accept", "application/json");
            c.setUseCaches(false);
            try (InputStream in = c.getInputStream()) {
                if (c.getResponseCode() != 200) throw new IllegalStateException("HTTP " + c.getResponseCode());
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > MAX_BYTES) throw new IllegalStateException("réponse trop grande");
                }
                String json = out.toString("UTF-8");
                JSONObject data = new JSONObject(json);
                prefs.edit().putString("json", json).apply();
                return data;
            } finally {
                c.disconnect();
            }
        } catch (Exception e) {
            try {
                String cached = prefs.getString("json", null);
                return cached != null ? new JSONObject(cached) : null;
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    // ---------- Jeux épinglés (transmis par le site via AppBridge) ----------

    static String pinsJson(Context ctx) {
        return ctx.getSharedPreferences("widgets", Context.MODE_PRIVATE).getString("pins", "[]");
    }

    static void savePins(Context ctx, String json) {
        ctx.getSharedPreferences("widgets", Context.MODE_PRIVATE).edit().putString("pins", json).apply();
    }

    /**
     * Sortie à afficher : la plus récemment épinglée encore à venir, sinon la plus proche.
     * Renvoie null s'il n'y a aucune sortie ; « pinned » indique si elle vient d'une épingle.
     */
    static JSONObject chooseRelease(Context ctx, JSONObject data, boolean[] pinned) {
        JSONArray releases = data != null ? data.optJSONArray("releases") : null;
        if (releases == null) return null;
        long now = System.currentTimeMillis();
        try {
            JSONArray pins = new JSONArray(pinsJson(ctx));
            for (int p = 0; p < pins.length(); p++) {
                for (int i = 0; i < releases.length(); i++) {
                    JSONObject r = releases.optJSONObject(i);
                    if (r != null && pins.optString(p).equals(r.optString("id")) && r.optLong("atMs") > now - 86_400_000L) {
                        if (pinned != null) pinned[0] = true;
                        return r;
                    }
                }
            }
        } catch (Exception ignored) {
            // épingles illisibles : sortie la plus proche
        }
        for (int i = 0; i < releases.length(); i++) {
            JSONObject r = releases.optJSONObject(i);
            if (r != null && r.optLong("atMs") > now - 86_400_000L) return r;
        }
        return null;
    }

    /** « J-23 », « 14 h » ou « Dispo ! ». */
    static String countdown(long atMs) {
        long left = atMs - System.currentTimeMillis();
        if (left <= 0) return "Dispo !";
        if (left < 86_400_000L) return (left / 3_600_000L) + " h";
        return "J-" + (long) Math.ceil(left / 86_400_000.0);
    }

    /** Visuel du jeu, réduit (~720 px de large) pour respecter la limite de mémoire des widgets. */
    static Bitmap image(String url) {
        if (url == null || !url.startsWith("https://")) return null;
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(10000);
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > 8 * 1024 * 1024) return null;
                }
                byte[] bytes = out.toByteArray();
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
                int sample = 1;
                while (o.outWidth / (sample * 2) >= 720) sample *= 2;
                BitmapFactory.Options d = new BitmapFactory.Options();
                d.inSampleSize = sample;
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, d);
            } finally {
                c.disconnect();
            }
        } catch (Exception e) {
            return null;
        }
    }

    /** Redessine tous les widgets (après une nouvelle épingle). */
    static void refreshAll(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        Class<?>[] providers = {ReleaseWidget.class, PinnedWidget.class, AnimeWidget.class, EpisodesWidget.class};
        for (Class<?> cls : providers) {
            int[] ids = m.getAppWidgetIds(new ComponentName(ctx, cls));
            if (ids.length == 0) continue;
            Intent i = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE, null, ctx, cls);
            i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            ctx.sendBroadcast(i);
        }
    }

    /** Ouvre l'application sur une page du site (chemin du type /Webapp-/actualites/…/). */
    static PendingIntent open(Context ctx, String path, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(ORIGIN + (path != null ? path : "/Webapp-/")),
                ctx, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
