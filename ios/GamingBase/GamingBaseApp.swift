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
                        Task {
                            _ = await NewsAlerts.check(notify: true)
                            await NewsAlerts.refreshDigest() // résumé du soir programmé pour les soirs à venir
                            await NewsAlerts.scheduleReleaseDays()
                        }
                        Task { await LiveActivities.refresh() }
                        Task { await QuickActions.refresh() }
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

/// Vue web dont la zone sûre reste celle de l'écran : sous la barre d'onglets d'UIKit, elle inclurait la barre,
/// que le site gère déjà lui-même (env(safe-area-inset-bottom) + hauteur de la barre).
private final class GBWebView: WKWebView {
    override var safeAreaInsets: UIEdgeInsets { window?.safeAreaInsets ?? super.safeAreaInsets }
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIScrollViewDelegate,
    UITabBarControllerDelegate {
    private static let home = URL(string: "https://makaveli63.github.io/Webapp-/")!
    private static let host = "makaveli63.github.io"
    private static let path = "/Webapp-"

    private static weak var current: WebViewController?
    private static var pending: URL?
    private var webView: WKWebView!

    /// Vraie barre d'onglets d'iOS : effet « Liquid Glass » d'Apple et bulle qui suit le doigt (iOS 26 et plus).
    /// Elle remplace celle du site, masquée dans l'app (attribut data-native-tabs).
    /// Gérée par un UITabBarController : sur iOS 26, elle se rétracte en bulle quand on fait défiler vers le bas
    /// et revient quand on remonte (comme les applis d'Apple). Une seule vue web, déplacée dans l'onglet affiché.
    private let tabController = UITabBarController()
    private var tabBar: UITabBar { tabController.tabBar }
    private lazy var hosts: [UIViewController] = Self.tabs.enumerated().map { index, tab in
        let host = UIViewController()
        host.view.backgroundColor = .clear
        host.tabBarItem = UITabBarItem(title: tab.title, image: tab.icon == "flower" ? Self.flowerIcon() : UIImage(systemName: tab.icon), tag: index)
        return host
    }
    private static let tabs: [(title: String, icon: String, path: String)] = [
        ("Accueil", "house", "/"),
        ("Tests", "star", "/tests"),
        ("Sorties", "calendar", "/sorties"),
        ("Anime", "flower", "/anime"), // fleur de cerisier de l'écran de démarrage
        ("Gratuits", "gift", "/jeux-gratuits"),
    ]

    /// Pas de barre « ^ v ✓ » au-dessus du clavier (les applis d'Apple n'en ont pas) : la vue de contenu
    /// de WebKit reçoit une sous-classe qui ne propose aucune barre d'accessoires.
    private func removeKeyboardBar() {
        guard let content = webView.scrollView.subviews.first(where: { String(describing: type(of: $0)).hasPrefix("WKContent") }),
              let base: AnyClass = object_getClass(content) else { return }
        let name = "\(NSStringFromClass(base))_GBNoBar"
        var cls: AnyClass? = NSClassFromString(name)
        if cls == nil, let made = objc_allocateClassPair(base, name, 0) {
            let selector = #selector(getter: UIResponder.inputAccessoryView)
            let none: @convention(block) (AnyObject) -> AnyObject? = { _ in nil }
            if let method = class_getInstanceMethod(UIResponder.self, selector) {
                class_addMethod(made, selector, imp_implementationWithBlock(none), method_getTypeEncoding(method))
            }
            objc_registerClassPair(made)
            cls = made
        }
        if let cls { object_setClass(content, cls) }
    }

    /// Fleur de cerisier (même dessin que sur le site), au trait comme les symboles d'iOS.
    private static func flowerIcon() -> UIImage {
        let size = CGSize(width: 26, height: 26)
        let image = UIGraphicsImageRenderer(size: size).image { ctx in
            let g = ctx.cgContext
            g.translateBy(x: 13, y: 13.7)
            g.scaleBy(x: 0.255, y: 0.255)
            let petal = UIBezierPath()
            petal.move(to: .zero)
            petal.addCurve(to: CGPoint(x: -5, y: -42), controlPoint1: CGPoint(x: -16, y: -12), controlPoint2: CGPoint(x: -14, y: -36))
            petal.addLine(to: CGPoint(x: 0, y: -36))
            petal.addLine(to: CGPoint(x: 5, y: -42))
            petal.addCurve(to: .zero, controlPoint1: CGPoint(x: 14, y: -36), controlPoint2: CGPoint(x: 16, y: -12))
            petal.close()
            UIColor.black.setStroke()
            for i in 0..<5 {
                g.saveGState()
                g.rotate(by: CGFloat(i) * 2 * .pi / 5)
                petal.lineWidth = 6.6
                petal.lineJoinStyle = .round
                petal.stroke()
                g.restoreGState()
            }
            let center = UIBezierPath(ovalIn: CGRect(x: -7, y: -7, width: 14, height: 14))
            center.lineWidth = 6.6
            center.stroke()
        }
        return image.withRenderingMode(.alwaysTemplate)
    }

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
        // Sur iPad aussi : version tactile du site (et non la version « ordinateur » de Safari).
        config.defaultWebpagePreferences.preferredContentMode = .mobile
        config.allowsInlineMediaPlayback = true
        // Domaines de l'app (Info.plist) : active le service worker → lecture hors connexion.
        config.limitsNavigationsToAppBoundDomains = true
        config.mediaTypesRequiringUserActionForPlayback = .all
        // « GamingBaseApp » active sur le site le geste « tirer pour actualiser » et le mode application.
        config.applicationNameForUserAgent = "Mobile/15E148 GamingBaseApp/iOS"
        // Le site transmet ses jeux épinglés (📌) pour le widget « Mon jeu épinglé ».
        config.userContentController.add(WeakHandler(self), name: "gamingbase")
        // Pas de zoom (pincement ni double tap) dans l'app, comme une app native.
        // Le site masque sa propre barre d'onglets : c'est celle d'iOS qui s'affiche.
        let nativeTabs = "document.documentElement.setAttribute('data-native-tabs', '1');"
        config.userContentController.addUserScript(WKUserScript(source: nativeTabs, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let noZoom = """
        (function () {
          var m = document.querySelector('meta[name="viewport"]');
          if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
          m.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: noZoom, injectionTime: .atDocumentEnd, forMainFrameOnly: true))

        webView = GBWebView(frame: .zero, configuration: config)
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
        let root = UIView()
        root.backgroundColor = background
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        tabController.viewControllers = hosts
        tabController.delegate = self
        if #available(iOS 26.0, *) { tabController.tabBarMinimizeBehavior = .onScrollDown }
        // iPad : barre en bas comme sur iPhone (et non les onglets en haut d'iPadOS 18, sous l'en-tête du site).
        if #available(iOS 18.0, *), UIDevice.current.userInterfaceIdiom == .pad {
            tabController.traitOverrides.horizontalSizeClass = .compact
        }
        tabController.view.backgroundColor = .clear
        tabController.view.frame = root.bounds
        tabController.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addChild(tabController)
        root.addSubview(tabController.view)
        tabController.didMove(toParent: self)
        attachWebView(to: 0)
        // Cachée pendant l'animation d'ouverture du site ; elle apparaît quand le site le signale (ou après 3,5 s).
        // Masquage complet (isHidden) : la barre « Liquid Glass » d'iOS 26 ne respecte pas toujours la transparence.
        if #available(iOS 18.0, *) { tabController.isTabBarHidden = true } else { tabBar.isHidden = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) { [weak self] in self?.showTabBar() }
        view = root
        Self.current = self
        removeKeyboardBar()
        webView.load(URLRequest(url: Self.pending ?? Self.home))
        Self.pending = nil
    }

    private var tabBarShown = false
    private func showTabBar() {
        guard !tabBarShown else { return }
        tabBarShown = true
        if #available(iOS 18.0, *) {
            tabController.setTabBarHidden(false, animated: true) // la barre monte en glissant, comme dans les applis d'Apple
        } else {
            tabBar.alpha = 0
            tabBar.isHidden = false
            UIView.animate(withDuration: 0.35) { self.tabBar.alpha = 1 }
        }
    }

    /// Couleur d'accent du site (« #fa2d48 ») pour l'onglet sélectionné.
    private func applyAccent(_ hex: String) {
        let clean = hex.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        guard clean.count == 6, let value = UInt32(clean, radix: 16) else { return }
        tabBar.tintColor = UIColor(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255,
                                   blue: CGFloat(value & 0xff) / 255, alpha: 1)
    }

    /// La vue web passe dans l'onglet affiché ; c'est elle que la barre surveille pour se rétracter.
    private func attachWebView(to index: Int) {
        guard hosts.indices.contains(index) else { return }
        let host = hosts[index]
        if webView.superview !== host.view {
            webView.frame = host.view.bounds
            host.view.addSubview(webView)
        }
        host.setContentScrollView(webView.scrollView, for: .bottom)
    }

    func tabBarController(_ controller: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        if let index = hosts.firstIndex(of: viewController) { attachWebView(to: index) }
        return true
    }

    // Onglet touché : le site change de page sans se recharger (navigation de l'app web).
    func tabBarController(_ controller: UITabBarController, didSelect viewController: UIViewController) {
        guard let index = hosts.firstIndex(of: viewController), Self.tabs.indices.contains(index) else { return }
        let path = Self.tabs[index].path
        webView.evaluateJavaScript(
            "window.gbNavigate ? window.gbNavigate('\(path)') : (location.href = '\(Self.path)\(path)/'.replace('//', '/'))",
            completionHandler: nil)
    }

    /// Page affichée par le site → onglet correspondant sélectionné.
    private func selectTab(for route: String) {
        let page = route.hasPrefix(Self.path) ? String(route.dropFirst(Self.path.count)) : route
        let match = Self.tabs.enumerated()
            .filter { $0.element.path == "/" ? (page == "/" || page.isEmpty || page.hasPrefix("/actualites")) : page.hasPrefix($0.element.path) }
            .max { $0.element.path.count < $1.element.path.count }
        // Page hors onglets (fiche, article…) : l'onglet d'origine reste sélectionné.
        guard let index = match?.offset, tabController.selectedIndex != index else { return }
        attachWebView(to: index)
        tabController.selectedIndex = index
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }

    // Pas de rebond natif en haut (il emporterait l'en-tête) : c'est le site qui étire la page sous l'en-tête.
    // Le rebond en bas de page reste.
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        if scrollView.contentOffset.y < 0 { scrollView.contentOffset.y = 0 }
    }

    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
        scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    /// Coffre du mot de passe admin (trousseau + Face ID) : « query », « save », « unlock », « forget ».
    private func handleAdmin(_ request: [String: Any]) {
        switch request["action"] as? String {
        case "query":
            webView.evaluateJavaScript("window.gbAdminSaved && window.gbAdminSaved(\(AdminVault.hasPassword))", completionHandler: nil)
        case "save":
            if let password = request["password"] as? String { AdminVault.save(password) }
        case "forget":
            AdminVault.forget()
        case "unlock":
            Task { @MainActor [weak self] in
                guard let password = await AdminVault.unlock(),
                      let data = try? JSONSerialization.data(withJSONObject: [password]),
                      let json = String(data: data, encoding: .utf8) else { return }
                // Tableau JSON : le mot de passe arrive comme une simple chaîne, jamais interprété comme du code.
                self?.webView.evaluateJavaScript("window.gbAdminPassword && window.gbAdminPassword(\(json)[0])", completionHandler: nil)
            }
        default:
            break
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, Self.isSite(message.frameInfo.request.url ?? Self.home),
              let body = message.body as? [String: Any] else { return }
        // Mot de passe administrateur : seulement depuis la page /admin du site.
        if body["admin"] != nil {
            // URL actuelle de la vue (suit la navigation interne du site, contrairement à celle du chargement initial).
            guard (webView.url?.path ?? "").hasPrefix(Self.path + "/admin") else { return }
            handleAdmin(body["admin"] as? [String: Any] ?? [:])
            return
        }
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
        // Épisodes cochés depuis le widget « Mes épisodes » : transmis au site, puis oubliés.
        if body["pendingEpisodes"] as? Bool == true {
            let pending = FeedLoader.pendingEpisodes
            guard !pending.isEmpty, let data = try? JSONSerialization.data(withJSONObject: pending),
                  let json = String(data: data, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.gbMarkEpisodes ? window.gbMarkEpisodes(\(json)) : false") { result, _ in
                if result as? Bool == true {
                    FeedLoader.setPendingEpisodes([])
                    WidgetCenter.shared.reloadTimelines(ofKind: "EpisodesWidget")
                }
            }
            return
        }
        // « Écouter les actus » : lecture à voix haute.
        // Réglages : liste des voix françaises de l'iPhone.
        if body["speakVoices"] as? Bool == true {
            guard let data = try? JSONSerialization.data(withJSONObject: NewsReader.voiceList()),
                  let json = String(data: data, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('gb-voices',{detail:\(json)}))", completionHandler: nil)
            return
        }
        if let list = body["speak"] as? [[String: Any]] {
            NewsReader.shared.voiceId = (body["speakVoice"] as? String).flatMap { $0.isEmpty ? nil : $0 }
            NewsReader.shared.rate = (body["speakRate"] as? NSNumber)?.floatValue ?? 1
            NewsReader.shared.onState = { [weak self] index, state in
                self?.webView.evaluateJavaScript(
                    "window.dispatchEvent(new CustomEvent('gb-speak',{detail:{index:\(index),state:'\(state)'}}))", completionHandler: nil)
            }
            NewsReader.shared.start(list)
            return
        }
        if let cmd = body["speakControl"] as? String, ["pause", "resume", "next", "previous", "stop"].contains(cmd) {
            NewsReader.shared.control(cmd)
            return
        }
        // Image à partager (récap du mois) : feuille de partage d'iOS (story, Photos, Messages…).
        if let base64 = body["shareImage"] as? String {
            guard base64.count < 8_000_000, let data = Data(base64Encoded: base64), let image = UIImage(data: data) else { return }
            let sheet = UIActivityViewController(activityItems: [image], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = view // iPad : la feuille part du centre de l'écran
            sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            present(sheet, animated: true)
            return
        }
        // Fin de l'animation d'ouverture du site : la barre d'onglets apparaît.
        if body["tabsReady"] as? Bool == true {
            showTabBar()
            return
        }
        if let accent = body["accent"] as? String {
            applyAccent(accent)
            return
        }
        // Changement de page sur le site : la barre d'onglets suit.
        if let route = body["route"] as? String {
            selectTab(for: route)
            return
        }
        // Affichage du compte à rebours en direct : jours et/ou heures : minutes : secondes.
        if let format = body["liveFormat"] as? [String: Any] {
            let days = format["days"] as? Bool ?? true
            let clock = format["clock"] as? Bool ?? true
            Task { await LiveActivities.setFormat(days: days, clock: clock) }
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
        Task { await QuickActions.refresh() } // et le menu de l'appui long sur l'icône
        Task { await NewsAlerts.scheduleReleaseDays() } // et le rappel du jour J
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
