package io.github.makaveli63.gamingbase;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

/**
 * Application GamingBase : le site en plein écran, sans barre d'adresse.
 * Le contenu vient toujours du site en ligne, donc l'application est à jour sans réinstallation.
 * Les liens vers d'autres sites (articles d'origine, boutiques) s'ouvrent dans le navigateur.
 */
public class MainActivity extends Activity {
    private static final String HOME = "https://makaveli63.github.io/Webapp-/";
    private static final String HOST = "makaveli63.github.io";
    private static final String PATH = "/Webapp-";

    private static final String OFFLINE_PAGE =
            "<!doctype html><html lang=fr><meta name=viewport content='width=device-width,initial-scale=1'>"
            + "<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;"
            + "justify-content:center;height:90vh;margin:0;background:#0b0d12;color:#e6e8ee;text-align:center}"
            + "a{margin-top:16px;padding:12px 22px;border-radius:999px;background:#7c5cff;color:#fff;"
            + "text-decoration:none;font-weight:600}</style>"
            + "<h2>Pas de connexion</h2><p>GamingBase a besoin d'Internet pour charger l'actu.</p>"
            + "<a href='" + HOME + "'>Réessayer</a></html>";

    private WebView web;
    private FrameLayout root;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // favoris, épingles, thème, pseudo
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " GamingBaseApp/" + BuildConfig.VERSION_NAME);
        web.addJavascriptInterface(new AppBridge(this), "GamingBaseApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (isSite(url)) return false;
                openOutside(url);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.loadDataWithBaseURL(HOME, OFFLINE_PAGE, "text/html", "UTF-8", null);
                }
            }
        });

        // Vidéos (bandes-annonces) en plein écran.
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                fullscreenView = view;
                fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }
        });

        if (state != null) web.restoreState(state);
        else web.loadUrl(startUrl(getIntent()));
    }

    /** Lien vers une page du site ouvert depuis une autre application : on l'affiche ici. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isSite(data)) web.loadUrl(data.toString());
    }

    private static String startUrl(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        return data != null && isSite(data) ? data.toString() : HOME;
    }

    private static boolean isSite(Uri url) {
        String path = url.getPath();
        return "https".equals(url.getScheme()) && HOST.equals(url.getHost()) && path != null && path.startsWith(PATH);
    }

    private void openOutside(Uri url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, url));
        } catch (ActivityNotFoundException ignored) {
            // aucune application pour ce lien : on reste sur la page
        }
    }

    private void exitFullscreen() {
        if (fullscreenView == null) return;
        root.removeView(fullscreenView);
        fullscreenView = null;
        web.setVisibility(View.VISIBLE);
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (fullscreenView != null) exitFullscreen();
        else if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
