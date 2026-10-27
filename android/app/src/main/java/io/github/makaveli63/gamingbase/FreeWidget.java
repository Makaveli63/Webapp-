package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget « Jeux gratuits » : les jeux offerts en ce moment (Epic Games et autres boutiques). */
public class FreeWidget extends GamingWidget {
    private static final int[] LINES = {R.id.w_line1, R.id.w_line2, R.id.w_line3};

    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_free);
        JSONArray free = data != null ? data.optJSONArray("free") : null;
        int shown = 0;
        for (int i = 0; i < LINES.length; i++) {
            JSONObject g = free != null ? free.optJSONObject(i) : null;
            if (g == null) {
                v.setViewVisibility(LINES[i], View.GONE);
                continue;
            }
            v.setTextViewText(LINES[i], "• " + g.optString("title") + "  —  " + g.optString("store"));
            v.setViewVisibility(LINES[i], View.VISIBLE);
            shown++;
        }
        v.setTextViewText(R.id.w_badge, free != null && free.length() > 0 ? free.length() + " gratuit" + (free.length() > 1 ? "s" : "") : "Gratuits");
        v.setViewVisibility(R.id.w_empty, shown == 0 ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.w_empty, data == null ? "Pas de connexion" : "Rien de gratuit pour l'instant");
        String path = data != null ? data.optString("freePath", "/Webapp-/jeux-gratuits/") : "/Webapp-/jeux-gratuits/";
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, path, widgetId));
        return v;
    }
}
