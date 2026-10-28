import ActivityKit
import Foundation
import UIKit

/// Démarre, met à jour et arrête la Live Activity du jeu épinglé (réglage « Compte à rebours en direct » du site).
/// Sans compte développeur payant, pas de mise à jour par push : l'app la met à jour à chaque ouverture et
/// quand les épingles changent ; le minuteur des dernières 24 h défile tout seul.
enum LiveActivities {
    private static let key = "live.enabled"
    private static var defaults: UserDefaults { AppGroup.defaults ?? .standard }

    static var enabled: Bool { defaults.bool(forKey: key) }

    /// Affichage choisi sur le site : jours, et/ou heures : minutes : secondes (les deux par défaut).
    static var showDays: Bool { defaults.object(forKey: "live.days") as? Bool ?? true }
    static var showClock: Bool { defaults.object(forKey: "live.clock") as? Bool ?? true }

    static func setFormat(days: Bool, clock: Bool) async {
        defaults.set(days || !clock, forKey: "live.days") // au moins une des deux
        defaults.set(clock, forKey: "live.clock")
        await refresh()
    }

    /// Active ou coupe ; renvoie l'état final et si iOS refuse les Live Activities (Réglages → GamingBase).
    static func setEnabled(_ on: Bool) async -> (enabled: Bool, denied: Bool) {
        guard #available(iOS 16.2, *) else { return (false, true) }
        guard on else {
            defaults.set(false, forKey: key)
            await endAll()
            return (false, false)
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            defaults.set(false, forKey: key)
            return (false, true)
        }
        defaults.set(true, forKey: key)
        await refresh()
        return (true, false)
    }

    /// À l'ouverture de l'app et quand les épingles changent.
    static func refresh() async {
        guard #available(iOS 16.2, *) else { return }
        guard enabled, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        await update()
    }

    @available(iOS 16.2, *)
    private static func update() async {
        let current = Activity<ReleaseActivityAttributes>.activities
        guard let feed = await FeedLoader.load(), let choice = FeedLoader.choose(feed) else {
            await endAll()
            return
        }
        let release = choice.release
        // Sortie passée depuis plus d'une heure : plus rien à compter.
        if release.date.timeIntervalSinceNow < -3600 {
            await endAll()
            return
        }
        let state = ReleaseActivityAttributes.ContentState(
            releaseAt: release.date, day: Countdown.day(release.date), showDays: showDays, showClock: showClock)
        // « Périmée » au prochain passage de jour : iOS redessine alors l'activité, qui recalcule « 21 j » → « 20 j ».
        let left = release.date.timeIntervalSinceNow
        let days = max(0, Int(left / 86_400))
        let stale = days > 0 ? release.date.addingTimeInterval(-Double(days) * 86_400) : release.date.addingTimeInterval(3600)
        let content = ActivityContent(state: state, staleDate: stale)
        // Même jeu déjà affiché (avec son image) : simple mise à jour ; sinon on la recrée.
        if let same = current.first(where: {
            $0.attributes.gameId == release.id && $0.activityState == .active && $0.attributes.image != nil
        }) {
            await same.update(content)
            for other in current where other.id != same.id {
                await other.end(nil, dismissalPolicy: .immediate)
            }
            return
        }
        for activity in current {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        var image: Data?
        if let picture = await FeedLoader.image(release.image) { image = thumbnail(picture) }
        let attributes = ReleaseActivityAttributes(gameId: release.id, title: release.title, path: release.path, image: image)
        do {
            _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
        } catch {
            // Données trop lourdes ou refusées : on réessaie sans l'image.
            let plain = ReleaseActivityAttributes(gameId: release.id, title: release.title, path: release.path, image: nil)
            _ = try? Activity.request(attributes: plain, content: content, pushType: nil)
        }
    }

    /// Vignette JPEG de moins de 3 Ko (limite de taille des données d'une Live Activity).
    private static func thumbnail(_ image: UIImage) -> Data? {
        let size = CGSize(width: 90, height: 120)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let small = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            let scale = max(size.width / max(image.size.width, 1), size.height / max(image.size.height, 1))
            let w = image.size.width * scale
            let h = image.size.height * scale
            image.draw(in: CGRect(x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h))
        }
        for quality in [0.6, 0.45, 0.3, 0.2] as [CGFloat] {
            if let data = small.jpegData(compressionQuality: quality), data.count < 2_800 { return data }
        }
        return nil
    }

    @available(iOS 16.2, *)
    private static func endAll() async {
        for activity in Activity<ReleaseActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
