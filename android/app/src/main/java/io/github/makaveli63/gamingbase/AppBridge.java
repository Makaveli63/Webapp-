package io.github.makaveli63.gamingbase;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;

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
    public void setLiveFormat(String json) {
        try {
            JSONObject f = new JSONObject(json);
            LiveCountdown.setFormat(ctx, f.optBoolean("days", true), f.optBoolean("clock", true));
        } catch (Exception ignored) {
            // réglage invalide : ignoré
        }
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
            AppShortcuts.refreshAsync(ctx); // et le menu de l'appui long sur l'icône
        } catch (Exception ignored) {
            // donnée invalide : ignorée
        }
    }

    /**
     * Image à partager (récap du mois, PNG en base64) : enregistrée dans Images/GamingBase,
     * puis proposée au partage (story, messagerie…). Android 10 et plus (pas d'autorisation à demander).
     */
    @JavascriptInterface
    public boolean shareImage(String base64, String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || base64 == null || base64.length() > 8_000_000) return false;
        try {
            byte[] png = Base64.decode(base64, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            String file = (name != null && name.matches("[a-z0-9-]{1,60}") ? name : "gamingbase") + ".png";
            values.put(MediaStore.Images.Media.DISPLAY_NAME, file);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/GamingBase");
            Uri uri = ctx.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) return false;
            try (OutputStream out = ctx.getContentResolver().openOutputStream(uri)) {
                if (out == null) return false;
                out.write(png);
            }
            Intent send = new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.runOnUiThread(() -> activity.startActivity(Intent.createChooser(send, "Partager mon récap")));
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
