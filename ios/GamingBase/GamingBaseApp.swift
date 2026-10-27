import SwiftUI
import WebKit

/// Application iPhone de GamingBase : le site en plein écran, sans barre Safari.
/// Le contenu vient du site en ligne : l'app est toujours à jour sans réinstallation.
@main
struct GamingBaseApp: App {
    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea() // le site gère lui-même l'encoche et la barre du bas (viewport-fit=cover)
        }
    }
}

struct WebContainer: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ controller: WebViewController, context: Context) {}
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private static let home = URL(string: "https://makaveli63.github.io/Webapp-/")!
    private static let host = "makaveli63.github.io"
    private static let path = "/Webapp-"

    private var webView: WKWebView!

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        // « GamingBaseApp » active sur le site le geste « tirer pour actualiser » et le mode application.
        config.applicationNameForUserAgent = "Mobile/15E148 GamingBaseApp/iOS"

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true // balayer depuis le bord pour revenir en arrière
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        let background = UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(red: 0.043, green: 0.051, blue: 0.071, alpha: 1)
            : UIColor(red: 0.965, green: 0.969, blue: 0.984, alpha: 1) }
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background
        view = webView
        webView.load(URLRequest(url: Self.home))
    }

    private static func isSite(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == host && url.path.hasPrefix(path)
    }

    // Pages du site dans l'app ; tout autre lien (article d'origine, boutique…) dans Safari.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        let isFrame = action.targetFrame.map { !$0.isMainFrame } ?? false
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
