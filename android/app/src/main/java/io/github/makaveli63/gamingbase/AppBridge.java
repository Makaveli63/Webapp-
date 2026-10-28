package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pont site → application : le site transmet la liste des jeux épinglés (📌) pour le widget.
 * Seule donnée acceptée : une courte liste d'identifiants ; rien d'autre n'est exposé à la page.
 */
final class AppBridge {
    private final Context ctx;
    private final MainActivity activity;

    AppBridge(MainActivity activity) {
        this.activity = activity;
        this.ctx = activity.getApplicationContext();
    }

    /** Réglages des notifications (plateformes, tests, mes jeux, résumé du soir). */
    @JavascriptInterface
    public void setNotificationPrefs(String json) {
        try {
            JSONObject p = new JSONObject(json);
            if (json.length() < 20_000) NewsJob.savePrefs(ctx, p.toString());
        } catch (Exception ignored) {
            // réglages invalides : ignorés
        }
    }

    /** Interrupteur « Notifications des nouveaux articles » du site. */
    @JavascriptInterface
    public void setNotifications(boolean on) {
        activity.runOnUiThread(() -> activity.setNotifications(on));
    }

    @JavascriptInterface
    public void setLiveActivity(boolean on) {
        activity.runOnUiThread(() -> activity.setLiveActivity(on));
    }

    @JavascriptInterface
    public void setPins(String json) {
        try {
            JSONArray in = new JSONArray(json);
            JSONArray clean = new JSONArray();
            for (int i = 0; i < in.length() && i < 20; i++) {
                String id = in.optString(i, "");
                if (id.matches("[a-z0-9-]{1,80}")) clean.put(id);
            }
            String value = clean.toString();
            if (value.equals(WidgetData.pinsJson(ctx))) return; // rien n'a changé
            WidgetData.savePins(ctx, value);
            WidgetData.refreshAll(ctx);
            LiveCountdown.refreshAsync(ctx); // le compte à rebours en direct suit le nouveau jeu épinglé
        } catch (Exception ignored) {
            // donnée invalide : ignorée
        }
    }
}
