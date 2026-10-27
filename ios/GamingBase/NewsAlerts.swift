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
        let fresh = feed.news.filter { !seen.contains($0.path) }
        defaults.set(Array((feed.news.map(\.path) + seen).prefix(200)), forKey: seenKey)
        guard notify, !seen.isEmpty, !fresh.isEmpty else { return 0 }

        let center = UNUserNotificationCenter.current()
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
