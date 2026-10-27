package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Widget « Prochaine sortie » : compte à rebours de la grosse sortie la plus proche. */
public class ReleaseWidget extends GamingWidget {
    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_release);
        boolean[] pinned = {false};
        JSONObject next = WidgetData.chooseRelease(ctx, data, pinned);
        v.setTextViewText(R.id.w_header, pinned[0] ? "📌 Mon jeu épinglé" : "⏳ Prochaine sortie");
        if (next == null) {
            v.setTextViewText(R.id.w_title, "Aucune sortie annoncée");
            v.setTextViewText(R.id.w_count, "—");
            v.setTextViewText(R.id.w_date, "");
            v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, "/Webapp-/sorties/", widgetId));
            return v;
        }
        long at = next.optLong("atMs");
        String count = WidgetData.countdown(at);

        SimpleDateFormat fmt = new SimpleDateFormat("d MMMM yyyy", Locale.FRANCE);
        fmt.setTimeZone(TimeZone.getTimeZone("Europe/Paris"));
        v.setTextViewText(R.id.w_title, next.optString("title", "GamingBase"));
        v.setTextViewText(R.id.w_count, count);
        v.setTextViewText(R.id.w_date, "le " + fmt.format(new Date(at)));
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, next.optString("path", "/Webapp-/sorties/"), widgetId));
        return v;
    }
}
