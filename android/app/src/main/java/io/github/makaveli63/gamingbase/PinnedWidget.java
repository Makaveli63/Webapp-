package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.graphics.Bitmap;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Widget « Mon jeu épinglé » : le jeu épinglé (📌) dans l'application, avec son visuel en fond
 * et un grand compte à rebours. Sans épingle, la grosse sortie la plus proche.
 */
public class PinnedWidget extends GamingWidget {
    @Override
    RemoteViews render(Context ctx, JSONObject data, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_pinned);
        boolean[] pinned = {false};
        JSONObject r = WidgetData.chooseRelease(ctx, data, pinned);
        if (r == null) {
            v.setTextViewText(R.id.w_header, data == null ? "Pas de connexion" : "📌 Épingle un jeu dans l'app");
            v.setTextViewText(R.id.w_title, "GamingBase");
            v.setTextViewText(R.id.w_count, "");
            v.setTextViewText(R.id.w_date, "");
            v.setOnClickPendingIntent(android.R.id.background, WidgetData.open(ctx, "/Webapp-/sorties/", widgetId));
            return v;
        }
        long at = r.optLong("atMs");
        SimpleDateFormat fmt = new SimpleDateFormat("d MMMM yyyy", Locale.FRANCE);
        fmt.setTimeZone(TimeZone.getTimeZone("Europe/Paris"));

        v.setTextViewText(R.id.w_header, pinned[0] ? "📌 Mon jeu épinglé" : "⏳ Prochaine grosse sortie");
        v.setTextViewText(R.id.w_title, r.optString("title", "GamingBase"));
        v.setTextViewText(R.id.w_count, WidgetData.countdown(at));
        v.setTextViewText(R.id.w_date, "Sortie le " + fmt.format(new Date(at)));
        Bitmap img = r.isNull("image") ? null : WidgetData.image(r.optString("image"));
        if (img != null) v.setImageViewBitmap(R.id.w_image, img);
        v.setOnClickPendingIntent(android.R.id.background, WidgetData.open(ctx, r.optString("path", "/Webapp-/sorties/"), widgetId));
        return v;
    }
}
