import SwiftUI
import WebKit
import WidgetKit

/// Application iPhone de GamingBase : le site en plein écran, sans barre Safari.
/// Le contenu vient du site en ligne : l'app est toujours à jour sans réinstallation.
@main
struct GamingBaseApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea() // le site gère lui-même l'encoche et la barre du bas (viewport-fit=cover)
                .onOpenURL { WebViewController.open($0) } // lien venant d'un widget
                .onChange(of: scenePhase) { phase in
                    // À chaque ouverture : nouvelles actus vérifiées, résumé du soir mis à jour.
                    if phase == .active {
                        Task { _ = await NewsAlerts.check(notify: true) }
                        Task { await LiveActivities.refresh() }
                    }
                    if phase == .background { NewsAlerts.schedule() }
                }
        }
    }
}

struct WebContainer: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ controller: WebViewController, context: Context) {}
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIScrollViewDelegate {
    private static let home = URL(string: "https://makaveli63.github.io/Webapp-/")!
    private static let host = "makaveli63.github.io"
    private static let path = "/Webapp-"

    private static weak var current: WebViewController?
    private static var pending: URL?
    private var webView: WKWebView!

    /// gamingbase://open?path=/Webapp-/actualites/… (widgets) → page correspondante du site.
    static func open(_ link: URL) {
        guard link.scheme == "gamingbase",
              let path = URLComponents(url: link, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "path" })?.value,
              path.hasPrefix(Self.path + "/"), !path.contains(".."),
              let url = URL(string: "https://\(host)\(path)") else { return }
        if let controller = current { controller.webView.load(URLRequest(url: url)) } else { pending = url }
    }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        // Domaines de l'app (Info.plist) : active le service worker → lecture hors connexion.
        config.limitsNavigationsToAppBoundDomains = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        // « GamingBaseApp » active sur le site le geste « tirer pour actualiser » et le mode application.
        config.applicationNameForUserAgent = "Mobile/15E148 GamingBaseApp/iOS"
        // Le site transmet ses jeux épinglés (📌) pour le widget « Mon jeu épinglé ».
        config.userContentController.add(WeakHandler(self), name: "gamingbase")
        // Pas de zoom (pincement ni double tap) dans l'app, comme une app native.
        let noZoom = """
        (function () {
          var m = document.querySelector('meta[name="viewport"]');
          if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
          m.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: noZoom, injectionTime: .atDocumentEnd, forMainFrameOnly: true))

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true // balayer depuis le bord pour revenir en arrière
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        // Zoom coupé côté natif aussi : la vue défilante ne propose aucune vue à agrandir.
        webView.scrollView.delegate = self
        webView.scrollView.minimumZoomScale = 1
        webView.scrollView.maximumZoomScale = 1
        webView.scrollView.bouncesZoom = false
        webView.isOpaque = false
        let background = UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(red: 0.043, green: 0.051, blue: 0.071, alpha: 1)
            : UIColor(red: 0.965, green: 0.969, blue: 0.984, alpha: 1) }
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        view = webView
        Self.current = self
        webView.load(URLRequest(url: Self.pending ?? Self.home))
        Self.pending = nil
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
        scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, Self.isSite(message.frameInfo.request.url ?? Self.home),
              let body = message.body as? [String: Any] else { return }
        // Réglages des notifications (plateformes, tests, mes jeux, résumé du soir).
        if let prefs = body["notifPrefs"] as? [String: Any] {
            NewsAlerts.savePrefs(prefs)
            return
        }
        // Interrupteur « Notifications des nouveaux articles » du site.
        if let on = body["notifications"] as? Bool {
            Task { @MainActor [weak self] in
                let enabled = await NewsAlerts.setEnabled(on)
                let denied = on && !enabled
                self?.webView.evaluateJavaScript(
                    "window.dispatchEvent(new CustomEvent('gb-notif',{detail:{enabled:\(enabled),denied:\(denied)}}))",
                    completionHandler: nil)
            }
            return
        }
        // Interrupteur « Compte à rebours en direct » (Live Activity) du site.
        if let on = body["liveActivity"] as? Bool {
            Task { @MainActor [weak self] in
                let result = await LiveActivities.setEnabled(on)
                self?.webView.evaluateJavaScript(
                    "window.dispatchEvent(new CustomEvent('gb-live',{detail:{enabled:\(result.enabled),denied:\(result.denied)}}))",
                    completionHandler: nil)
            }
            return
        }
        guard let pins = body["pins"] as? [String] else { return }
        let clean = pins.prefix(20).filter { $0.range(of: "^[a-z0-9-]{1,80}$", options: .regularExpression) != nil }
        let defaults = AppGroup.defaults
        if defaults?.stringArray(forKey: AppGroup.pinsKey) == Array(clean) { return }
        defaults?.set(Array(clean), forKey: AppGroup.pinsKey)
        WidgetCenter.shared.reloadAllTimelines()
        Task { await LiveActivities.refresh() } // nouveau jeu épinglé : la Live Activity suit
    }

    private static func isSite(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == host && url.path.hasPrefix(path)
    }

    // Pages du site dans l'app ; tout autre lien (article d'origine, boutique…) dans Safari.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        let isFrame = action.targetFrame.map { !$0.isMainFrame } ?? false
        // « Ajouter au calendrier » (.ics) : Safari propose l'ajout au Calendrier de l'iPhone.
        if url.pathExtension.lowercased() == "ics" {
            UIApplication.shared.open(url)
            return decisionHandler(.cancel)
        }
        if isFrame || ["about", "data", "blob"].contains(url.scheme ?? "") || Self.isSite(url) {
            return decisionHandler(.allow) // vidéos intégrées, page hors connexion, site
        }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    // Liens « nouvel onglet ».
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if Self.isSite(url) { webView.load(URLRequest(url: url)) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOffline(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showOffline(error)
    }

    private func showOffline(_ error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        let html = """
        <!doctype html><html lang=fr><meta name=viewport content='width=device-width,initial-scale=1'>
        <style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:90vh;margin:0;background:#0b0d12;color:#e6e8ee;text-align:center;padding:24px}
        a{margin-top:16px;padding:12px 22px;border-radius:999px;background:#7c5cff;color:#fff;text-decoration:none;
        font-weight:600}</style>
        <h2>Pas de connexion</h2><p>GamingBase a besoin d'Internet pour charger l'actu.</p>
        <a href='\(Self.home.absoluteString)'>Réessayer</a></html>
        """
        webView.loadHTMLString(html, baseURL: Self.home)
    }

    // Le site a pu planter en arrière-plan (mémoire) : on le recharge.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}

/// Évite que la page web retienne le contrôleur (cycle de références de WKUserContentController).
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}
