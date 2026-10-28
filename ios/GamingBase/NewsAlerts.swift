import BackgroundTasks
import UIKit
import UserNotifications
import WidgetKit

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
            content.threadIdentifier = "digest" // regroupées sur l'iPhone et l'Apple Watch
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
        /// Jeux et animes suivis (🔔) : nom affiché et façons de l'écrire dans les titres d'actus.
        var follows: [Follow]? = []
        /// Prochains épisodes des animes suivis.
        var episodes: [Episode]? = []
        /// Jeux « Je le veux » et alertes prix
        var wanted: [String]? = []
        var priceAlerts: Bool? = true
        /// Bouclier anti-spoiler : titre des actus anime masqué dans les notifications
        var spoilerShield: Bool? = true
    }

    struct Follow: Codable {
        let t: String
        let a: [String]
        /// « game » ou « anime »
        var k: String? = nil
    }

    struct Episode: Codable {
        let title: String
        let episode: Int
        let atMs: Double
        let path: String
    }

    private static let episodeIdsKey = "notif.episodeIds"

    /// Nouvel épisode d'un anime suivi : notification programmée à l'heure de sortie (sans réveiller l'app).
    static func scheduleEpisodes() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: defaults.stringArray(forKey: episodeIdsKey) ?? [])
        guard enabled else { return defaults.set([String](), forKey: episodeIdsKey) }
        let now = Date()
        var ids: [String] = []
        for ep in (prefs.episodes ?? []).prefix(30) {
            let at = Date(timeIntervalSince1970: ep.atMs / 1000)
            guard at > now, ep.path.hasPrefix("/Webapp-/") else { continue }
            let content = UNMutableNotificationContent()
            content.threadIdentifier = "episodes" // regroupées sur l'iPhone et l'Apple Watch
            content.title = "▶️ Nouvel épisode : \(ep.title)"
            content.body = "L'épisode \(ep.episode) est disponible."
            content.sound = .default
            content.userInfo = ["path": ep.path]
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: at.timeIntervalSince(now), repeats: false)
            let id = "ep-\(ep.path)-\(ep.episode)"
            try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            ids.append(id)
        }
        defaults.set(ids, forKey: episodeIdsKey)
    }

    private static let releaseIdsKey = "notif.releaseIds"

    /// 🎉 Jour J des jeux épinglés (📌) ou suivis (🔔) : un rappel la veille à 20 h, puis « est sorti ! » le matin à 9 h.
    /// Programmés à l'avance : ils arrivent à l'heure, même si l'app n'est pas ouverte.
    static func scheduleReleaseDays() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: defaults.stringArray(forKey: releaseIdsKey) ?? [])
        guard enabled, let feed = await FeedLoader.load() else { return }
        let followed = Set((prefs.follows ?? []).map { norm($0.t) })
        let pins = Set(FeedLoader.pins)
        let mine = feed.releases.filter { pins.contains($0.id) || followed.contains(norm($0.title)) }
        let cal = Calendar.current
        let now = Date()
        var ids: [String] = []
        for r in mine.prefix(12) {
            let day = cal.startOfDay(for: r.date)
            let moments: [(String, Date, String, String)] = [
                ("eve", cal.date(byAdding: .hour, value: -4, to: day) ?? day, "⏰ \(r.title) sort demain", "Plus qu'une nuit à attendre !"),
                ("day", cal.date(byAdding: .hour, value: 9, to: day) ?? day, "🎉 \(r.title) est sorti !", "Disponible aujourd'hui. Touche pour la fiche, les premiers tests et les prix."),
            ]
            for (kind, at, title, body) in moments where at > now {
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = .default
                content.threadIdentifier = "releases" // regroupées sur l'iPhone et l'Apple Watch
                content.userInfo = ["path": r.path]
                let parts = cal.dateComponents([.year, .month, .day, .hour, .minute], from: at)
                let id = "release-\(kind)-\(r.id)"
                try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)))
                ids.append(id)
            }
        }
        defaults.set(ids, forKey: releaseIdsKey)
    }

    private static let dealsKey = "notif.deals"

    /// 💸 Promo sur un jeu « Je le veux » : une notification par promo (3 au plus à la fois).
    static func notifyDeals(_ feed: Feed) async {
        let p = prefs
        guard p.priceAlerts ?? true, let wanted = p.wanted, !wanted.isEmpty else { return }
        let names = wanted.map(norm).filter { $0.count >= 6 }
        var done = Set(defaults.stringArray(forKey: dealsKey) ?? [])
        let center = UNUserNotificationCenter.current()
        var sent = 0
        for deal in feed.deals ?? [] where !done.contains(deal.id) && sent < 3 {
            let title = norm(deal.title)
            guard names.contains(where: { title.contains($0) }) else { continue }
            done.insert(deal.id)
            let content = UNMutableNotificationContent()
            content.title = "💸 Prix en baisse : \(deal.title)"
            let price = [deal.price, deal.oldPrice.map { "au lieu de \($0)" }].compactMap { $0 }.joined(separator: " ")
            content.body = "\(price.isEmpty ? "En promo" : price) sur \(deal.store) (−\(Int(deal.discount)) %)"
            content.sound = .default
            content.threadIdentifier = "deals" // regroupées sur l'iPhone et l'Apple Watch
            content.userInfo = ["path": "/Webapp-/promos/"]
            try? await center.add(UNNotificationRequest(identifier: "deal-\(deal.id)", content: content, trigger: nil))
            sent += 1
        }
        defaults.set(Array(done.prefix(300)), forKey: dealsKey)
    }

    /// Nom du jeu ou de l'anime suivi dont parle l'article, s'il y en a un.
    static func followed(_ a: Feed.News, _ p: Prefs) -> Follow? {
        let title = norm(a.title)
        return (p.follows ?? []).first { f in f.a.contains(where: { let n = norm($0); return n.count >= 6 && title.contains(n) }) }
    }

    static func savePrefs(_ raw: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(raw), let data = try? JSONSerialization.data(withJSONObject: raw),
              data.count < 20_000, (try? JSONDecoder().decode(Prefs.self, from: data)) != nil else { return }
        let changed = defaults.data(forKey: prefsKey) != data
        defaults.set(data, forKey: prefsKey)
        if changed { WidgetCenter.shared.reloadAllTimelines() } // animes suivis : le widget les met en tête
        Task {
            await refreshDigest() // programmé (ou retiré) tout de suite
            await scheduleEpisodes()
            await scheduleReleaseDays()
        }
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
            await scheduleEpisodes()
            await scheduleReleaseDays()
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
        if notify { await notifyDeals(feed) }
        let seen = Set(defaults.stringArray(forKey: seenKey) ?? [])
        let unseen = feed.news.filter { !seen.contains($0.path) }
        defaults.set(Array((feed.news.map(\.path) + seen).prefix(200)), forKey: seenKey)
        guard notify, !seen.isEmpty else { return 0 }
        let p = prefs
        let center = UNUserNotificationCenter.current()
        // Jeux et animes suivis (🔔) : notifiés tout de suite, même hors des filtres et du résumé du soir.
        var hits = 0
        for article in unseen {
            guard let follow = followed(article, p) else { continue }
            let content = UNMutableNotificationContent()
            content.threadIdentifier = "follows" // regroupées sur l'iPhone et l'Apple Watch
            content.title = "🔔 \(follow.t)"
            // Anime : le titre de l'actu peut dévoiler la suite, il reste masqué.
            content.body = follow.k == "anime" && (p.spoilerShield ?? true) ? "Nouvelle actu : touche pour la lire (titre masqué, sans spoiler)." : article.title
            content.sound = .default
            content.userInfo = ["path": article.path]
            try? await center.add(UNNotificationRequest(identifier: article.path, content: content, trigger: nil))
            hits += 1
        }
        let fresh = unseen.filter { followed($0, p) == nil && matches($0, p) }

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
            return hits
        }
        guard !fresh.isEmpty else { return hits }

        if fresh.count > 3 {
            let content = UNMutableNotificationContent()
            content.threadIdentifier = "news" // regroupées sur l'iPhone et l'Apple Watch
            content.title = "🎮 \(fresh.count) nouvelles actus"
            content.body = fresh.prefix(3).map(\.title).joined(separator: " · ")
            content.sound = .default
            content.userInfo = ["path": "/Webapp-/actualites/"]
            try? await center.add(UNNotificationRequest(identifier: "news-\(Date().timeIntervalSince1970)", content: content, trigger: nil))
        } else {
            for article in fresh {
                let content = UNMutableNotificationContent()
                content.threadIdentifier = "news" // regroupées sur l'iPhone et l'Apple Watch
                content.title = article.category == "Test" ? "⭐ Nouveau test\(article.score.map { " · \($0)" } ?? "")" : "📰 Nouvelle actu"
                content.body = article.title
                content.sound = .default
                content.userInfo = ["path": article.path]
                try? await center.add(UNNotificationRequest(identifier: article.path, content: content, trigger: nil))
            }
        }
        return hits + fresh.count
    }
}

/// Démarrage de l'app : tâche d'arrière-plan et clics sur les notifications.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        NewsAlerts.register()
        UNUserNotificationCenter.current().delegate = self
        NewsAlerts.schedule()
        GamingBaseShortcuts.updateAppShortcutParameters() // Siri apprend le nom des jeux (« Quand sort GTA 6 sur GamingBase »)
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
