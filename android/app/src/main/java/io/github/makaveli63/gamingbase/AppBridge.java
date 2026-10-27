package io.github.makaveli63.gamingbase;

import android.content.Context;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;

/**
 * Pont site → application : le site transmet la liste des jeux épinglés (📌) pour le widget.
 * Seule donnée acceptée : une courte liste d'identifiants ; rien d'autre n'est exposé à la page.
 */
final class AppBridge {
    private final Context ctx;

    AppBridge(Context ctx) {
        this.ctx = ctx.getApplicationContext();
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
        } catch (Exception ignored) {
            // donnée invalide : ignorée
        }
    }
}
