package io.github.makaveli63.gamingbase;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget « Mes épisodes » : toucher une ligne coche l'épisode suivant de cet anime, sans ouvrir l'appli.
 * Les épisodes cochés sont gardés ici puis remis au site à la prochaine ouverture (AppBridge).
 */
public class EpisodesWidget extends GamingWidget {
    private static final String MARK = "io.github.makaveli63.gamingbase.MARK_EPISODE";
    private static final String STORE = "widgets";

    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_episodes);
        JSONArray tracked = NewsJob.prefs(ctx).optJSONArray("tracked");
        JSONArray pending = pending(ctx);
        int[] lines = NewsWidget.LINES;
        int shown = 0;
        for (int i = 0; i < lines.length; i++) {
            JSONObject t = tracked != null ? tracked.optJSONObject(i) : null;
            if (t == null) {
                v.setViewVisibility(lines[i], View.GONE);
                continue;
            }
            String id = t.optString("id");
            int next = t.optInt("next", 1);
            for (int p = 0; p < pending.length(); p++) {
                JSONObject e = pending.optJSONObject(p);
                if (e != null && id.equals(e.optString("id"))) next = Math.max(next, e.optInt("episode") + 1);
            }
            int total = t.optInt("total", 0);
            boolean done = total > 0 && next > total;
            String label = done ? "✓ " + t.optString("title") + " · terminé"
                    : "＋ " + t.optString("title") + " · cocher l'épisode " + next + (total > 0 ? " sur " + total : "");
            v.setTextViewText(lines[i], label);
            v.setViewVisibility(lines[i], View.VISIBLE);
            if (done) {
                v.setOnClickPendingIntent(lines[i], WidgetData.open(ctx, t.optString("path"), widgetId * 10 + i + 1));
            } else {
                Intent mark = new Intent(ctx, EpisodesWidget.class).setAction(MARK).putExtra("id", id).putExtra("episode", next);
                v.setOnClickPendingIntent(lines[i], PendingIntent.getBroadcast(ctx, widgetId * 10 + i + 1, mark,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            shown++;
        }
        v.setViewVisibility(R.id.w_empty, shown == 0 ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.w_empty, "Coche des épisodes d'un anime dans l'appli pour le retrouver ici.");
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, "/Webapp-/collection/", widgetId * 10));
        return v;
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (MARK.equals(intent.getAction())) {
            String id = intent.getStringExtra("id");
            int episode = intent.getIntExtra("episode", 0);
            if (id != null && id.matches("[a-z0-9-]{1,60}") && episode > 0 && episode <= 2000) {
                try {
                    JSONArray list = pending(ctx);
                    list.put(new JSONObject().put("id", id).put("episode", episode));
                    ctx.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().putString("pendingEpisodes", list.toString()).apply();
                } catch (Exception ignored) {
                    // non enregistré
                }
                WidgetData.refreshAll(ctx);
            }
            return;
        }
        super.onReceive(ctx, intent);
    }

    private static JSONArray pending(Context ctx) {
        try {
            return new JSONArray(ctx.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString("pendingEpisodes", "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** Remet les épisodes cochés et les oublie. */
    static String takePending(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(STORE, Context.MODE_PRIVATE);
        String json = sp.getString("pendingEpisodes", "[]");
        sp.edit().putString("pendingEpisodes", "[]").apply();
        return json;
    }
}
