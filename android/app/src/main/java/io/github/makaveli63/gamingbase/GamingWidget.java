package io.github.makaveli63.gamingbase;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Base des widgets : récupère les données en arrière-plan puis dessine chaque widget. */
abstract class GamingWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        final PendingResult result = goAsync();
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                JSONObject data = WidgetData.load(app);
                for (int id : ids) manager.updateAppWidget(id, render(app, data, id));
            } catch (Exception ignored) {
                // widget laissé tel quel : nouvel essai à la prochaine mise à jour
            } finally {
                result.finish();
            }
        }).start();
    }

    abstract RemoteViews render(Context ctx, JSONObject data, int widgetId);
}
