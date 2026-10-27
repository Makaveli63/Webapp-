package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
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
        JSONArray releases = data != null ? data.optJSONArray("releases") : null;
        JSONObject next = null;
        long now = System.currentTimeMillis();
        if (releases != null) {
            for (int i = 0; i < releases.length(); i++) {
                JSONObject r = releases.optJSONObject(i);
                if (r != null && r.optLong("atMs") > now - 86_400_000L) {
                    next = r;
                    break;
                }
            }
        }
        if (next == null) {
            v.setTextViewText(R.id.w_title, "Aucune sortie annoncée");
            v.setTextViewText(R.id.w_count, "—");
            v.setTextViewText(R.id.w_date, "");
            v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, "/Webapp-/sorties/", widgetId));
            return v;
        }
        long at = next.optLong("atMs");
        long left = at - now;
        String count;
        if (left <= 0) count = "Dispo !";
        else if (left < 86_400_000L) count = (left / 3_600_000L) + " h";
        else count = "J-" + (long) Math.ceil(left / 86_400_000.0);

        SimpleDateFormat fmt = new SimpleDateFormat("d MMMM yyyy", Locale.FRANCE);
        fmt.setTimeZone(TimeZone.getTimeZone("Europe/Paris"));
        v.setTextViewText(R.id.w_title, next.optString("title", "GamingBase"));
        v.setTextViewText(R.id.w_count, count);
        v.setTextViewText(R.id.w_date, "le " + fmt.format(new Date(at)));
        v.setOnClickPendingIntent(R.id.w_root, WidgetData.open(ctx, next.optString("path", "/Webapp-/sorties/"), widgetId));
        return v;
    }
}
