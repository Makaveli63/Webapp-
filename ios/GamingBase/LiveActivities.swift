import ActivityKit
import Foundation

/// Démarre, met à jour et arrête la Live Activity du jeu épinglé (réglage « Compte à rebours en direct » du site).
/// Sans compte développeur payant, pas de mise à jour par push : l'app la met à jour à chaque ouverture et
/// quand les épingles changent ; le minuteur des dernières 24 h défile tout seul.
enum LiveActivities {
    private static let key = "live.enabled"
    private static var defaults: UserDefaults { AppGroup.defaults ?? .standard }

    static var enabled: Bool { defaults.bool(forKey: key) }

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
        let state = ReleaseActivityAttributes.ContentState(releaseAt: release.date, day: Countdown.day(release.date))
        let content = ActivityContent(state: state, staleDate: release.date.addingTimeInterval(3600))
        if let same = current.first(where: { $0.attributes.gameId == release.id && $0.activityState == .active }) {
            await same.update(content)
            for other in current where other.id != same.id {
                await other.end(nil, dismissalPolicy: .immediate)
            }
            return
        }
        for activity in current {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        let attributes = ReleaseActivityAttributes(gameId: release.id, title: release.title, path: release.path)
        _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
    }

    @available(iOS 16.2, *)
    private static func endAll() async {
        for activity in Activity<ReleaseActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
