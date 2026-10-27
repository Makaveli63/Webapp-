package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget « Dernières actus » : 4 derniers articles, note des tests incluse ; chaque ligne ouvre l'article. */
public class NewsWidget extends GamingWidget {
    static final int[] LINES = {R.id.w_line1, R.id.w_line2, R.id.w_line3, R.id.w_line4};

    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_news);
        JSONArray news = data != null ? data.optJSONArray("news") : null;
        int shown = 0;
        for (int i = 0; i < LINES.length; i++) {
            JSONObject a = news != null ? news.optJSONObject(i) : null;
            if (a == null) {
                v.setViewVisibility(LINES[i], View.GONE);
                continue;
            }
            String score = a.isNull("score") ? "" : a.optString("score") + " · ";
            v.setTextViewText(LINES[i], "• " + score + a.optString("title"));
            v.setViewVisibility(LINES[i], View.VISIBLE);
            v.setOnClickPendingIntent(LINES[i], WidgetData.open(ctx, a.optString("path"), widgetId * 10 + i + 1));
            shown++;
        }
        v.setViewVisibility(R.id.w_empty, shown == 0 ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.w_empty, data == null ? "Pas de connexion" : "Aucune actu pour l'instant");
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, "/Webapp-/actualites/", widgetId * 10));
        return v;
    }
}
