import AppIntents
import Foundation

// « Dis Siri… » : réponses sans ouvrir l'app (aussi dans l'app Raccourcis et dans Spotlight).

/// Une grosse sortie du site, que Siri sait reconnaître par son nom.
struct ReleaseEntity: AppEntity {
    let id: String
    let title: String
    let atMs: Double

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Jeu" }
    static var defaultQuery: ReleaseQuery { ReleaseQuery() }
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(title)") }
}

struct ReleaseQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [ReleaseEntity] {
        await all().filter { identifiers.contains($0.id) }
    }

    func entities(matching string: String) async throws -> [ReleaseEntity] {
        let q = key(string)
        return await all().filter { key($0.title).contains(q) || q.contains(key($0.title)) }
    }

    func suggestedEntities() async throws -> [ReleaseEntity] { await all() }

    private func all() async -> [ReleaseEntity] {
        (await FeedLoader.load())?.releases.map { ReleaseEntity(id: $0.id, title: $0.title, atMs: $0.atMs) } ?? []
    }

    /// « GTA 6 » = « gta vi » : minuscules, sans accents, chiffres romains en chiffres.
    private func key(_ s: String) -> String {
        let roman = ["ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7", "viii": "8", "ix": "9"]
        return s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "fr_FR"))
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .map { roman[$0] ?? $0 }
            .joined(separator: " ")
    }
}

private func sentence(_ title: String, _ date: Date) -> String {
    let days = Int((date.timeIntervalSinceNow / 86_400).rounded(.up))
    if days <= 0 { return "\(title) est disponible depuis le \(Countdown.day(date))." }
    if days == 1 { return "\(title) sort demain, le \(Countdown.day(date))." }
    return "\(title) sort dans \(days) jours, le \(Countdown.day(date))."
}

struct WhenReleaseIntent: AppIntent {
    static var title: LocalizedStringResource = "Date de sortie d'un jeu"
    static var description = IntentDescription("Dans combien de jours sort un jeu attendu.")

    @Parameter(title: "Jeu")
    var game: ReleaseEntity

    func perform() async throws -> some IntentResult & ProvidesDialog {
        .result(dialog: "\(sentence(game.title, Date(timeIntervalSince1970: game.atMs / 1000)))")
    }
}

struct NextReleaseIntent: AppIntent {
    static var title: LocalizedStringResource = "Prochaine sortie"
    static var description = IntentDescription("Ton jeu épinglé, sinon la prochaine grosse sortie.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let pick = FeedLoader.choose(await FeedLoader.load()) else { return .result(dialog: "Je n'ai pas de sortie à venir pour l'instant.") }
        return .result(dialog: "\(sentence(pick.release.title, pick.release.date))")
    }
}

struct NextEpisodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Prochain épisode"
    static var description = IntentDescription("Le prochain épisode de tes animes suivis, sinon de la semaine.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let e = FeedLoader.episodes(await FeedLoader.load()).first else {
            return .result(dialog: "Aucun épisode annoncé cette semaine.")
        }
        return .result(dialog: "L'épisode \(e.episode) de \(e.title) sort \(FeedLoader.when(e.date)).")
    }
}

struct GamingBaseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: WhenReleaseIntent(),
            phrases: [
                "Quand sort \(\.$game) sur \(.applicationName)",
                "Date de sortie de \(\.$game) sur \(.applicationName)",
            ],
            shortTitle: "Date de sortie",
            systemImageName: "calendar")
        AppShortcut(
            intent: NextReleaseIntent(),
            phrases: ["Prochaine sortie \(.applicationName)", "Mon jeu épinglé sur \(.applicationName)"],
            shortTitle: "Prochaine sortie",
            systemImageName: "gamecontroller")
        AppShortcut(
            intent: NextEpisodeIntent(),
            phrases: ["Prochain épisode \(.applicationName)", "Prochain épisode d'anime sur \(.applicationName)"],
            shortTitle: "Prochain épisode",
            systemImageName: "play.tv")
    }
}
