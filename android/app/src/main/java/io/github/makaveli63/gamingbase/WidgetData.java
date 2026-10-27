package io.github.makaveli63.gamingbase;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

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

    /** Ouvre l'application sur une page du site (chemin du type /Webapp-/actualites/…/). */
    static PendingIntent open(Context ctx, String path, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(ORIGIN + (path != null ? path : "/Webapp-/")),
                ctx, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
