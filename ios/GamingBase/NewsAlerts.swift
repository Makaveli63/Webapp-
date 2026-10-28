import BackgroundTasks
import UIKit
import UserNotifications

/// Notifications des nouveaux articles (au choix de l'utilisateur, réglage sur le site dans l'app).
/// Sans compte développeur payant, pas de « push » Apple : l'app vérifie le site en arrière-plan
/// quand iOS le permet (actualisation en arrière-plan) et affiche une notification locale.
enum NewsAlerts {
    static let taskId = "io.github.makaveli63.gamingbase.news"
    private static let enabledKey = "notif.enabled"
    private static let seenKey = "notif.seen"
    private static let prefsKey = "notif.prefs"
    private static let pendingKey = "notif.pending"
    private static let digestFireKey = "notif.digestFire"
    private static let digestCutKey = "notif.digestCut"

    /// Article en attente du résumé du soir, avec la date à laquelle il a été trouvé.
    struct Pending: Codable {
        let news: Feed.News
        let at: Date
    }

    /// (Re)programme le résumé du soir : le prochain 19 h avec les articles en attente, puis un rappel
    /// les 6 soirs suivants. iOS réveille rarement l'app en arrière-plan : sans ces rappels programmés
    /// à l'avance, le résumé ne partirait pas les jours où l'app n'a rien pu mettre de côté.
    static func scheduleDigest(_ pending: [Pending], now: Date) async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: digestIds)
        let cal = Calendar.current
        var fire = cal.date(bySettingHour: 19, minute: 0, second: 0, of: now) ?? now
        if fire <= now { fire = cal.date(byAdding: .day, value: 1, to: fire) ?? fire }
        for (index, id) in digestIds.enumerated() {
            guard let day = cal.date(byAdding: .day, value: index, to: fire) else { continue }
            let content = UNMutableNotificationContent()
            if index == 0, !pending.isEmpty {
                content.title = "🌙 Ton résumé du soir : \(pending.count) actu\(pending.count > 1 ? "s" : "")"
                content.body = pending.prefix(4).map { "• \($0.news.title)" }.joined(separator: "\n")
            } else {
                content.title = "🌙 Ton résumé du soir"
                content.body = "Les actus du jour t'attendent : touche pour voir ce qui est sorti aujourd'hui."
            }
            content.sound = .default
            content.userInfo = ["path": "/Webapp-/actualites/"]
            let parts = cal.dateComponents([.year, .month, .day, .hour, .minute], from: day)
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
        defaults.set(fire, forKey: digestFireKey)
        defaults.set(now, forKey: digestCutKey)
    }

    private static let digestIds = (0..<7).map { $0 == 0 ? "digest" : "digest-\($0)" }

    /// Articles en attente du résumé (ceux déjà partis dans un résumé sont retirés).
    private static func pendingDigest(now: Date) -> [Pending] {
        var pending = (defaults.data(forKey: pendingKey).flatMap { try? JSONDecoder().decode([Pending].self, from: $0) }) ?? []
        if let fire = defaults.object(forKey: digestFireKey) as? Date, fire <= now {
            let cut = defaults.object(forKey: digestCutKey) as? Date ?? .distantPast
            pending = pending.filter { $0.at > cut }
            defaults.removeObject(forKey: digestFireKey)
            defaults.set(try? JSONEncoder().encode(pending), forKey: pendingKey)
        }
        return pending
    }

    /// À l'ouverture de l'app et quand le réglage change : le résumé reste programmé pour les soirs à venir.
    static func refreshDigest() async {
        guard enabled, prefs.digest else {
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: digestIds)
            return
        }
        let now = Date()
        await scheduleDigest(pendingDigest(now: now), now: now)
    }

    /// Réglages envoyés par le site : plateformes, tests seulement, jeux de Ma collection, résumé du soir.
    struct Prefs: Codable {
        var platforms: [String] = []
        var testsOnly = false
        var myGames = false
        var digest = false
        var anime: Bool? = true
        var games: [String] = []
    }

    static func savePrefs(_ raw: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(raw), let data = try? JSONSerialization.data(withJSONObject: raw),
              data.count < 20_000, (try? JSONDecoder().decode(Prefs.self, from: data)) != nil else { return }
        defaults.set(data, forKey: prefsKey)
        Task { await refreshDigest() } // programmé (ou retiré) tout de suite
    }

    private static var prefs: Prefs {
        defaults.data(forKey: prefsKey).flatMap { try? JSONDecoder().decode(Prefs.self, from: $0) } ?? Prefs()
    }

    private static func norm(_ s: String) -> String {
        let folded = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR"))
        let words = folded.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }
        return " " + words.joined(separator: " ") + " "
    }

    static func matches(_ a: Feed.News, _ p: Prefs) -> Bool {
        let anime = a.category == "Anime"
        if anime && (!(p.anime ?? true) || p.testsOnly) { return false }
        if !anime && !p.platforms.isEmpty { // l'anime n'a pas de plateforme de jeu
            let plats = a.platforms ?? []
            if !plats.contains("Multi") && Set(plats).isDisjoint(with: p.platforms) { return false }
        }
        if p.testsOnly && a.category != "Test" { return false }
        if p.myGames {
            let title = norm(a.title)
            if !p.games.contains(where: { let g = norm($0); return g.count >= 5 && title.contains(g) }) { return false }
        }
        return true
    }
    private static var defaults: UserDefaults { AppGroup.defaults ?? .standard }

    static var enabled: Bool { defaults.bool(forKey: enabledKey) }

    /// Active ou coupe les notifications ; renvoie l'état final (false si l'autorisation est refusée).
    static func setEnabled(_ on: Bool) async -> Bool {
        guard on else {
            defaults.set(false, forKey: enabledKey)
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskId)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: digestIds)
            return false
        }
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        defaults.set(granted, forKey: enabledKey)
        if granted {
            _ = await check(notify: false) // mémorise les articles actuels : pas d'avalanche au départ
            schedule()
            await refreshDigest()
        }
        return granted
    }

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskId, using: nil) { task in
            guard let task = task as? BGAppRefreshTask else { return }
            schedule() // la suivante
            let work = Task {
                _ = await check(notify: true)
                task.setTaskCompleted(success: true)
            }
            task.expirationHandler = { work.cancel() }
        }
    }

    /// Prochaine vérification dans 30 min au plus tôt (iOS décide du moment exact).
    static func schedule() {
        guard enabled else { return }
        let request = BGAppRefreshTaskRequest(identifier: taskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    /// Compare les derniers articles à ceux déjà vus et notifie les nouveaux.
    static func check(notify: Bool) async -> Int {
        guard enabled, let feed = await FeedLoader.load() else { return 0 }
        let seen = Set(defaults.stringArray(forKey: seenKey) ?? [])
        let unseen = feed.news.filter { !seen.contains($0.path) }
        defaults.set(Array((feed.news.map(\.path) + seen).prefix(200)), forKey: seenKey)
        guard notify, !seen.isEmpty else { return 0 }
        let p = prefs
        let fresh = unseen.filter { matches($0, p) }
        let center = UNUserNotificationCenter.current()

        // Résumé du soir : les articles sont mis de côté et la notification de 19 h est PROGRAMMÉE à l'avance
        // (iOS l'affiche à l'heure pile, même si l'app n'est pas réveillée à ce moment-là).
        if p.digest {
            let now = Date()
            // Résumé déjà parti : les articles qu'il contenait sont retirés.
            var pending = pendingDigest(now: now)
            let known = Set(pending.map(\.news.path))
            pending += fresh.filter { !known.contains($0.path) }.map { Pending(news: $0, at: now) }
            pending = Array(pending.suffix(50))
            defaults.set(try? JSONEncoder().encode(pending), forKey: pendingKey)
            await scheduleDigest(pending, now: now)
            return 0
        }
        guard !fresh.isEmpty else { return 0 }

        if fresh.count > 3 {
            let content = UNMutableNotificationContent()
            content.title = "🎮 \(fresh.count) nouvelles actus"
            content.body = fresh.prefix(3).map(\.title).joined(separator: " · ")
            content.sound = .default
            content.userInfo = ["path": "/Webapp-/actualites/"]
            try? await center.add(UNNotificationRequest(identifier: "news-\(Date().timeIntervalSince1970)", content: content, trigger: nil))
        } else {
            for article in fresh {
                let content = UNMutableNotificationContent()
                content.title = article.category == "Test" ? "⭐ Nouveau test\(article.score.map { " · \($0)" } ?? "")" : "📰 Nouvelle actu"
                content.body = article.title
                content.sound = .default
                content.userInfo = ["path": article.path]
                try? await center.add(UNNotificationRequest(identifier: article.path, content: content, trigger: nil))
            }
        }
        return fresh.count
    }
}

/// Démarrage de l'app : tâche d'arrière-plan et clics sur les notifications.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        NewsAlerts.register()
        UNUserNotificationCenter.current().delegate = self
        NewsAlerts.schedule()
        return true
    }

    // Menu de l'appui long sur l'icône : raccourci touché pour lancer l'app, puis quand elle tourne déjà.
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if let item = options.shortcutItem { QuickActions.handle(item) }
        let config = UISceneConfiguration(name: nil, sessionRole: session.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // Notification touchée : ouvre l'article dans l'app.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let path = response.notification.request.content.userInfo["path"] as? String {
            var c = URLComponents()
            c.scheme = "gamingbase"
            c.host = "open"
            c.queryItems = [URLQueryItem(name: "path", value: path)]
            if let link = c.url { DispatchQueue.main.async { WebViewController.open(link) } }
        }
        completionHandler()
    }

    // App ouverte : la notification s'affiche quand même en bannière.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
}
