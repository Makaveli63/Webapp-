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
    private static let digestDayKey = "notif.digestDay"

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
            return false
        }
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        defaults.set(granted, forKey: enabledKey)
        if granted {
            _ = await check(notify: false) // mémorise les articles actuels : pas d'avalanche au départ
            schedule()
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

        // Résumé du soir : on met de côté, une seule notification par jour à partir de 19 h.
        if p.digest {
            var pending = (defaults.data(forKey: pendingKey).flatMap { try? JSONDecoder().decode([Feed.News].self, from: $0) }) ?? []
            pending = Array((pending + fresh).prefix(50))
            let now = Date()
            let cal = Calendar.current
            let today = "\(cal.component(.year, from: now))-\(cal.ordinality(of: .day, in: .year, for: now) ?? 0)"
            let due = cal.component(.hour, from: now) >= 19 && defaults.string(forKey: digestDayKey) != today
            guard due, !pending.isEmpty else {
                defaults.set(try? JSONEncoder().encode(pending), forKey: pendingKey)
                return 0
            }
            defaults.set(try? JSONEncoder().encode([Feed.News]()), forKey: pendingKey)
            defaults.set(today, forKey: digestDayKey)
            let content = UNMutableNotificationContent()
            content.title = "🌙 Ton résumé du soir : \(pending.count) actu\(pending.count > 1 ? "s" : "")"
            content.body = pending.prefix(4).map { "• \($0.title)" }.joined(separator: "\n")
            content.sound = .default
            content.userInfo = ["path": "/Webapp-/actualites/"]
            try? await center.add(UNNotificationRequest(identifier: "digest-\(today)", content: content, trigger: nil))
            return pending.count
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
