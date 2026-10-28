package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Menu de l'appui long sur l'icône (comme Spotify) : jeux épinglés avec leur compte à rebours,
 * puis Rechercher et Mon espace. Mis à jour à chaque ouverture et quand les épingles changent.
 */
final class AppShortcuts {
    private AppShortcuts() {}

    static void refreshAsync(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return;
        Context app = ctx.getApplicationContext();
        new Thread(() -> refresh(app)).start();
    }

    private static void refresh(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return;
        ShortcutManager manager = ctx.getSystemService(ShortcutManager.class);
        if (manager == null) return;
        List<ShortcutInfo> items = new ArrayList<>();
        try {
            JSONObject data = WidgetData.load(ctx);
            JSONArray releases = data != null ? data.optJSONArray("releases") : null;
            if (releases != null) {
                long now = System.currentTimeMillis();
                JSONArray pins = new JSONArray(WidgetData.pinsJson(ctx));
                for (int p = 0; p < pins.length() && items.size() < 2; p++) {
                    JSONObject r = find(releases, pins.optString(p), now);
                    if (r != null) items.add(game(ctx, "pin-" + items.size(), r, "Épinglé", R.drawable.sc_pin, items.size()));
                }
                // Aucun jeu épinglé : la prochaine grosse sortie.
                if (items.isEmpty()) {
                    JSONObject next = find(releases, null, now);
                    if (next != null) items.add(game(ctx, "next", next, "Prochaine sortie", R.drawable.sc_calendar, 0));
                }
            }
        } catch (Exception ignored) {
            // données illisibles : seulement les raccourcis fixes
        }
        int rank = items.size();
        items.add(page(ctx, "space", "Mon espace", "Mon espace : favoris et suivi", "/Webapp-/favoris/", R.drawable.sc_person, rank++));
        items.add(page(ctx, "search", "Rechercher", "Rechercher un jeu ou un anime", "/Webapp-/recherche/", R.drawable.sc_search, rank));
        try {
            int max = manager.getMaxShortcutCountPerActivity();
            manager.setDynamicShortcuts(items.size() > max ? items.subList(0, max) : items);
        } catch (Exception ignored) {
            // limite d'appels atteinte : on réessaiera à la prochaine ouverture
        }
    }

    private static JSONObject find(JSONArray releases, String id, long now) {
        for (int i = 0; i < releases.length(); i++) {
            JSONObject r = releases.optJSONObject(i);
            if (r == null || r.optLong("atMs") <= now - 86_400_000L) continue;
            if (id == null || id.equals(r.optString("id"))) return r;
        }
        return null;
    }

    /** « dans 21 j », « dans 5 h » ou « disponible ». */
    private static String countdown(long atMs) {
        long left = atMs - System.currentTimeMillis();
        if (left <= 0) return "disponible";
        if (left < 86_400_000L) return "dans " + Math.max(1, left / 3_600_000L) + " h";
        return "dans " + (long) Math.ceil(left / 86_400_000.0) + " j";
    }

    private static ShortcutInfo game(Context ctx, String id, JSONObject r, String label, int icon, int rank) {
        String title = r.optString("title", "Sortie");
        String when = countdown(r.optLong("atMs"));
        String path = r.optString("path", "/Webapp-/sorties/");
        return build(ctx, id, title + " · " + when, label + " : " + title + " · " + when, path, icon, rank);
    }

    private static ShortcutInfo page(Context ctx, String id, String shortLabel, String longLabel, String path, int icon, int rank) {
        return build(ctx, id, shortLabel, longLabel, path, icon, rank);
    }

    private static ShortcutInfo build(Context ctx, String id, String shortLabel, String longLabel, String path, int icon, int rank) {
        if (!path.startsWith("/Webapp-/") || path.contains("..")) path = "/Webapp-/";
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(WidgetData.ORIGIN + path), ctx, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return new ShortcutInfo.Builder(ctx, id)
                .setShortLabel(trim(shortLabel, 25))
                .setLongLabel(trim(longLabel, 45))
                .setIcon(Icon.createWithResource(ctx, icon))
                .setIntent(intent)
                .setRank(rank)
                .build();
    }

    private static String trim(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1).trim() + "…";
    }
}
