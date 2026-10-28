package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Widget « Prochains épisodes » : d'abord les animes suivis (🔔, transmis par le site), puis les épisodes
 * de la semaine ; chaque ligne ouvre la fiche de l'anime.
 */
public class AnimeWidget extends GamingWidget {
    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_anime);
        List<JSONObject> list = episodes(ctx, data);
        int[] lines = NewsWidget.LINES;
        for (int i = 0; i < lines.length; i++) {
            if (i >= list.size()) {
                v.setViewVisibility(lines[i], View.GONE);
                continue;
            }
            JSONObject e = list.get(i);
            String mark = e.optBoolean("followed") ? "🔔 " : "• ";
            v.setTextViewText(lines[i], mark + e.optString("title") + " · ép. " + e.optInt("episode") + " · " + when(e.optLong("atMs")));
            v.setViewVisibility(lines[i], View.VISIBLE);
            v.setOnClickPendingIntent(lines[i], WidgetData.open(ctx, e.optString("path"), widgetId * 10 + i + 1));
        }
        v.setViewVisibility(R.id.w_empty, list.isEmpty() ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.w_empty, data == null ? "Pas de connexion" : "Aucun épisode cette semaine");
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, "/Webapp-/anime/", widgetId * 10));
        return v;
    }

    private static List<JSONObject> episodes(Context ctx, JSONObject data) {
        long recent = System.currentTimeMillis() - 6 * 3_600_000L;
        List<JSONObject> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        JSONArray followed = NewsJob.prefs(ctx).optJSONArray("episodes");
        List<JSONObject> mine = new ArrayList<>();
        for (int i = 0; followed != null && i < followed.length(); i++) {
            JSONObject e = followed.optJSONObject(i);
            if (e == null || e.optLong("atMs") < recent || !e.optString("path").startsWith("/Webapp-/")) continue;
            try {
                e.put("followed", true);
            } catch (Exception ignored) {
                // sans marque
            }
            mine.add(e);
        }
        mine.sort((a, b) -> Long.compare(a.optLong("atMs"), b.optLong("atMs")));
        for (JSONObject e : mine) if (seen.add(e.optString("title"))) out.add(e);
        JSONArray week = data != null ? data.optJSONArray("anime") : null;
        for (int i = 0; week != null && i < week.length(); i++) {
            JSONObject e = week.optJSONObject(i);
            if (e != null && e.optLong("atMs") >= recent && seen.add(e.optString("title"))) out.add(e);
        }
        return out;
    }

    /** « aujourd'hui 17:30 », « demain 9:00 », « jeu. 18:00 » ou « disponible ». */
    static String when(long atMs) {
        if (atMs <= System.currentTimeMillis()) return "disponible";
        Calendar at = Calendar.getInstance();
        at.setTimeInMillis(atMs);
        Calendar today = Calendar.getInstance();
        String time = new SimpleDateFormat("H:mm", Locale.FRANCE).format(at.getTime());
        int days = (at.get(Calendar.YEAR) - today.get(Calendar.YEAR)) * 366 + at.get(Calendar.DAY_OF_YEAR) - today.get(Calendar.DAY_OF_YEAR);
        if (days == 0) return "aujourd'hui " + time;
        if (days == 1) return "demain " + time;
        return new SimpleDateFormat("EEE H:mm", Locale.FRANCE).format(at.getTime());
    }
}
