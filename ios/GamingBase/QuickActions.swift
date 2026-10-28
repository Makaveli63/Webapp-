import UIKit

/// Menu de l'appui long sur l'icône (comme Spotify) : jeux épinglés avec leur compte à rebours,
/// puis Rechercher et Mon espace. Mis à jour à chaque ouverture et quand les épingles changent.
enum QuickActions {
    private static let type = "io.github.makaveli63.gamingbase.open"

    static func refresh() async {
        var items: [UIApplicationShortcutItem] = []
        if let feed = await FeedLoader.load() {
            let now = Date()
            let upcoming = feed.releases.filter { $0.date > now.addingTimeInterval(-86_400) }
            let pinned = FeedLoader.pins.compactMap { id in upcoming.first { $0.id == id } }
            for release in pinned.prefix(2) {
                items.append(item(release.title, subtitle: "Épinglé · \(Countdown.long(to: release.date, now: now))",
                                  icon: "pin.fill", path: release.path))
            }
            // Aucun jeu épinglé : la prochaine grosse sortie.
            if pinned.isEmpty, let next = upcoming.first {
                items.append(item(next.title, subtitle: "Prochaine sortie · \(Countdown.long(to: next.date, now: now))",
                                  icon: "calendar", path: next.path))
            }
        }
        items.append(item("Mon espace", subtitle: "Favoris, suivi et bibliothèque", icon: "person.crop.circle", path: "/Webapp-/favoris/"))
        items.append(item("Rechercher", subtitle: nil, icon: "magnifyingglass", path: "/Webapp-/recherche/"))
        let final = items
        await MainActor.run { UIApplication.shared.shortcutItems = final }
    }

    private static func item(_ title: String, subtitle: String?, icon: String, path: String) -> UIApplicationShortcutItem {
        UIApplicationShortcutItem(type: type, localizedTitle: title, localizedSubtitle: subtitle,
                                  icon: UIApplicationShortcutIcon(systemImageName: icon), userInfo: ["path": path as NSString])
    }

    /// Raccourci touché : ouvre la page dans l'app (au lancement comme quand elle tourne déjà).
    @discardableResult
    static func handle(_ item: UIApplicationShortcutItem) -> Bool {
        guard item.type == type, let path = item.userInfo?["path"] as? String else { return false }
        WebViewController.open(appLink(path))
        return true
    }
}

/// Reçoit les raccourcis de l'icône quand l'app est déjà ouverte.
final class SceneDelegate: NSObject, UIWindowSceneDelegate {
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        completionHandler(QuickActions.handle(shortcutItem))
    }
}
