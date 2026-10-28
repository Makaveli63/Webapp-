import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Données d'un widget

struct GBEntry: TimelineEntry {
    let date: Date
    let feed: Feed?
    let release: Feed.Release?
    let pinned: Bool
    let image: UIImage?

    static let placeholder = GBEntry(
        date: Date(),
        feed: nil,
        release: Feed.Release(id: "gta-6", title: "GTA VI", atMs: Date().addingTimeInterval(23 * 86_400).timeIntervalSince1970 * 1000,
                              image: nil, path: "/Webapp-/sorties/"),
        pinned: true,
        image: nil)
}

extension GBEntry {
    static func make(chosen: String?, withImage: Bool) async -> GBEntry {
        let feed = await FeedLoader.load()
        let pick = FeedLoader.choose(feed, preferred: chosen)
        let image = withImage ? await FeedLoader.image(pick?.release.image) : nil
        return GBEntry(date: Date(), feed: feed, release: pick?.release, pinned: pick?.pinned ?? false, image: image)
    }

    /// Une entrée par heure pendant 6 h : le compte à rebours avance même sans réseau.
    func timeline() -> Timeline<GBEntry> {
        let entries = (0..<6).map { h in
            GBEntry(date: date.addingTimeInterval(Double(h) * 3600), feed: feed, release: release, pinned: pinned, image: image)
        }
        return Timeline(entries: entries, policy: .after(date.addingTimeInterval(3600)))
    }
}

/// Widgets sans réglage (actus, jeux gratuits).
struct GBProvider: TimelineProvider {
    func placeholder(in context: Context) -> GBEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (GBEntry) -> Void) {
        if context.isPreview { return completion(.placeholder) }
        Task { completion(await GBEntry.make(chosen: nil, withImage: false)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GBEntry>) -> Void) {
        Task { completion(await GBEntry.make(chosen: nil, withImage: false).timeline()) }
    }
}

// MARK: - Choix du jeu (appui long sur le widget → « Modifier le widget »)

struct GameEntity: AppEntity {
    let id: String
    let title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation { "Jeu" }
    static var defaultQuery: GameQuery { GameQuery() }
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(title)") }
}

struct GameQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [GameEntity] {
        await all().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [GameEntity] { await all() }

    private func all() async -> [GameEntity] {
        (await FeedLoader.load())?.releases.map { GameEntity(id: $0.id, title: $0.title) } ?? []
    }
}

struct ChooseGameIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Choisir le jeu" }
    static var description: IntentDescription { IntentDescription("Le jeu dont le widget affiche le compte à rebours.") }

    @Parameter(title: "Jeu")
    var game: GameEntity?
}

/// Widgets de compte à rebours : jeu choisi dans le widget, sinon épinglé, sinon le plus proche.
struct GBGameProvider: AppIntentTimelineProvider {
    var withImage = false

    func placeholder(in context: Context) -> GBEntry { .placeholder }

    func snapshot(for configuration: ChooseGameIntent, in context: Context) async -> GBEntry {
        context.isPreview ? .placeholder : await GBEntry.make(chosen: configuration.game?.id, withImage: withImage)
    }

    func timeline(for configuration: ChooseGameIntent, in context: Context) async -> Timeline<GBEntry> {
        await GBEntry.make(chosen: configuration.game?.id, withImage: withImage).timeline()
    }
}

// MARK: - Style « verre fumé »

private let accent = Color(red: 0.62, green: 0.53, blue: 1)
private let gold = Color(red: 0.98, green: 0.75, blue: 0.14)
private let muted = Color.white.opacity(0.7)
private let glass = LinearGradient(colors: [Color(red: 0.08, green: 0.09, blue: 0.14), Color(red: 0.11, green: 0.08, blue: 0.19)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)

extension View {
    /// Fond du widget (API iOS 17 si disponible, sinon fond classique avec marges).
    @ViewBuilder func widgetBackground<B: View>(_ background: B) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { background }
        } else {
            padding().background(background)
        }
    }
}

// MARK: - 📌 Mon jeu épinglé (image du jeu en fond)

struct PinnedView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content
            .widgetURL(appLink(entry.release?.path ?? "/Webapp-/sorties/"))
            .widgetBackground(background)
    }

    private var background: some View {
        ZStack {
            glass
            if let image = entry.image {
                Image(uiImage: image).resizable().scaledToFill()
            }
            LinearGradient(colors: [.black.opacity(0.1), .black.opacity(0.5), .black.opacity(0.92)], startPoint: .top, endPoint: .bottom)
        }
    }

    @ViewBuilder private var content: some View {
        if let r = entry.release {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.pinned ? "📌 Mon jeu" : "⏳ Prochaine grosse sortie")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Capsule().fill(.white.opacity(0.18)))
                Spacer(minLength: 0)
                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.title).font(family == .systemLarge ? .title.bold() : .title3.bold()).lineLimit(2)
                        Text("Sortie le \(Countdown.day(r.date))").font(.caption).foregroundStyle(muted)
                    }
                    Spacer(minLength: 8)
                    Text(Countdown.text(to: r.date, now: entry.date))
                        .font(.system(size: family == .systemLarge ? 54 : 40, weight: .heavy, design: .rounded))
                        .foregroundStyle(gold)
                        .minimumScaleFactor(0.6)
                }
            }
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.6), radius: 6)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        } else {
            Text(entry.feed == nil ? "Pas de connexion" : "Choisis ton jeu : Modifier le widget")
                .font(.headline).foregroundStyle(.white)
        }
    }
}

struct PinnedWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "PinnedWidget", intent: ChooseGameIntent.self, provider: GBGameProvider(withImage: true)) {
            PinnedView(entry: $0)
        }
            .configurationDisplayName("Mon jeu épinglé")
            .description("Ton jeu (à choisir avec « Modifier le widget »), avec son image et le compte à rebours.")
            .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - ⏳ Prochaine sortie (petit widget et écran verrouillé)

struct ReleaseView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text(entry.release.map { Countdown.text(to: $0.date, now: entry.date) } ?? "—")
                        .font(.system(.body, design: .rounded).weight(.bold)).minimumScaleFactor(0.5)
                    Text(entry.release?.title ?? "").font(.system(size: 9)).lineLimit(1).minimumScaleFactor(0.5)
                }.padding(4)
            }
            .widgetURL(appLink(entry.release?.path))
            .widgetBackground(Color.clear)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.pinned ? "📌 Épinglé" : "⏳ Prochaine sortie").font(.caption2)
                Text(entry.release?.title ?? "GamingBase").font(.headline).lineLimit(1)
                Text(entry.release.map { Countdown.text(to: $0.date, now: entry.date) } ?? "—").font(.body.bold())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(appLink(entry.release?.path))
            .widgetBackground(Color.clear)
        case .accessoryInline:
            Text(entry.release.map { "\($0.title) · \(Countdown.text(to: $0.date, now: entry.date))" } ?? "GamingBase")
                .widgetBackground(Color.clear)
        default:
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.pinned ? "📌 Mon jeu épinglé" : "⏳ Prochaine sortie").font(.caption2).foregroundStyle(muted)
                Text(entry.release?.title ?? "Aucune sortie").font(.headline).lineLimit(2).foregroundStyle(.white)
                Spacer(minLength: 0)
                Text(entry.release.map { Countdown.text(to: $0.date, now: entry.date) } ?? "—")
                    .font(.system(size: 34, weight: .heavy, design: .rounded)).foregroundStyle(accent).minimumScaleFactor(0.6)
                if let r = entry.release { Text("le \(Countdown.day(r.date))").font(.caption2).foregroundStyle(muted) }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .shadow(color: .black.opacity(entry.image == nil ? 0 : 0.6), radius: 5)
            .widgetURL(appLink(entry.release?.path ?? "/Webapp-/sorties/"))
            .widgetBackground(smallBackground)
        }
    }

    /// Image du jeu en fond (assombrie pour lire le compte à rebours), sinon le verre habituel.
    private var smallBackground: some View {
        ZStack {
            glass
            if let image = entry.image {
                Image(uiImage: image).resizable().scaledToFill()
                LinearGradient(colors: [.black.opacity(0.25), .black.opacity(0.55), .black.opacity(0.9)], startPoint: .top, endPoint: .bottom)
            }
        }
    }
}

struct ReleaseWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "ReleaseWidget", intent: ChooseGameIntent.self, provider: GBGameProvider(withImage: true)) {
            ReleaseView(entry: $0)
        }
            .configurationDisplayName("Prochaine sortie")
            .description("Compte à rebours de la prochaine grosse sortie (ou de ton jeu épinglé).")
            .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - 📰 Dernières actus

struct NewsView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let items = Array((entry.feed?.news ?? []).filter { $0.category != "Anime" }.prefix(family == .systemLarge ? 6 : 3))
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("📰 Dernières actus").font(.caption.bold()).foregroundStyle(accent)
                Spacer()
                Text("GamingBase").font(.caption2).foregroundStyle(muted)
            }
            if items.isEmpty {
                Text(entry.feed == nil ? "Pas de connexion" : "Aucune actu").font(.footnote).foregroundStyle(muted)
            }
            ForEach(items, id: \.self) { a in
                Link(destination: appLink(a.path)) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        if let s = a.score {
                            Text(s).font(.caption2.bold()).padding(.horizontal, 5).padding(.vertical, 1)
                                .background(Capsule().fill(gold)).foregroundStyle(.black)
                        }
                        Text(a.title).font(.footnote.weight(.medium)).lineLimit(2).foregroundStyle(.white)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/Webapp-/actualites/"))
        .widgetBackground(glass)
    }
}

struct NewsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NewsWidget", provider: GBProvider()) { NewsView(entry: $0) }
            .configurationDisplayName("Dernières actus")
            .description("Les dernières actus et tests, avec leur note.")
            .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - 🎁 Jeux gratuits

struct FreeView: View {
    let entry: GBEntry

    var body: some View {
        let games = Array((entry.feed?.free ?? []).prefix(3))
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("🎁 Jeux gratuits").font(.caption.bold()).foregroundStyle(accent)
                Spacer()
                if !games.isEmpty { Text("\(entry.feed?.free.count ?? 0) offert(s)").font(.caption2).foregroundStyle(muted) }
            }
            if games.isEmpty {
                Text(entry.feed == nil ? "Pas de connexion" : "Rien de gratuit pour l'instant").font(.footnote).foregroundStyle(muted)
            }
            ForEach(games, id: \.self) { g in
                HStack {
                    Text(g.title).font(.footnote.weight(.semibold)).lineLimit(1).foregroundStyle(.white)
                    Spacer(minLength: 6)
                    Text(g.store).font(.caption2).foregroundStyle(muted)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink(entry.feed?.freePath ?? "/Webapp-/jeux-gratuits/"))
        .widgetBackground(glass)
    }
}

struct FreeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FreeWidget", provider: GBProvider()) { FreeView(entry: $0) }
            .configurationDisplayName("Jeux gratuits")
            .description("Les jeux offerts en ce moment.")
            .supportedFamilies([.systemMedium])
    }
}

// MARK: - ▶️ Prochains épisodes (animes)

struct AnimeView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let all = FeedLoader.episodes(entry.feed, now: entry.date)
        let shown = Array(all.prefix(family == .systemLarge ? 7 : family == .systemSmall ? 1 : 3))
        VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 7) {
            Text("▶️ Prochains épisodes").font(.caption.bold()).foregroundStyle(accent).lineLimit(1)
            if shown.isEmpty {
                Text(entry.feed == nil ? "Pas de connexion" : "Aucun épisode cette semaine").font(.footnote).foregroundStyle(muted)
            }
            if family == .systemSmall, let e = shown.first {
                Spacer(minLength: 0)
                Text(e.title).font(.headline).lineLimit(3).foregroundStyle(.white)
                Text("Épisode \(e.episode)").font(.caption).foregroundStyle(muted)
                Text(FeedLoader.when(e.date, now: entry.date)).font(.caption.bold()).foregroundStyle(accent)
            } else {
                ForEach(shown, id: \.self) { e in
                    Link(destination: appLink(e.path)) {
                        HStack(spacing: 6) {
                            Text(e.followed == true ? "🔔" : "•").font(.caption2)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(e.title).font(.footnote.weight(.semibold)).lineLimit(1).foregroundStyle(.white)
                                Text("Épisode \(e.episode)").font(.caption2).foregroundStyle(muted)
                            }
                            Spacer(minLength: 6)
                            Text(FeedLoader.when(e.date, now: entry.date)).font(.caption2.bold()).foregroundStyle(accent).lineLimit(1)
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink(family == .systemSmall ? (shown.first?.path ?? "/Webapp-/anime/") : "/Webapp-/anime/"))
        .widgetBackground(glass)
    }
}

struct AnimeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AnimeWidget", provider: GBProvider()) { AnimeView(entry: $0) }
            .configurationDisplayName("Prochains épisodes")
            .description("Les prochains épisodes de tes animes suivis, puis ceux de la semaine.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - ✅ Mes épisodes : cocher l'épisode suivant sans ouvrir l'app (iOS 17)

struct MarkEpisodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Cocher l'épisode suivant"
    static var isDiscoverable = false

    @Parameter(title: "Anime") var animeId: String
    @Parameter(title: "Épisode") var episode: Int

    init() {}
    init(animeId: String, episode: Int) {
        self.animeId = animeId
        self.episode = episode
    }

    func perform() async throws -> some IntentResult {
        // Gardé dans le groupe d'apps : le site l'ajoute au suivi à la prochaine ouverture.
        FeedLoader.setPendingEpisodes(FeedLoader.pendingEpisodes + [["id": animeId, "episode": episode]])
        return .result()
    }
}

struct EpisodesView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let list = Array(FeedLoader.tracked().prefix(family == .systemLarge ? 6 : 3))
        VStack(alignment: .leading, spacing: 8) {
            Text("✅ Mes épisodes").font(.caption.bold()).foregroundStyle(accent)
            if list.isEmpty {
                Text("Coche des épisodes d'un anime dans l'app pour le retrouver ici.").font(.footnote).foregroundStyle(muted)
            }
            ForEach(list, id: \.self) { t in
                HStack(spacing: 8) {
                    Link(destination: appLink(t.path)) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(t.title).font(.footnote.weight(.semibold)).lineLimit(1).foregroundStyle(.white)
                            Text(t.total.map { "Épisode \(t.next) sur \($0)" } ?? "Épisode \(t.next)").font(.caption2).foregroundStyle(muted)
                        }
                    }
                    Spacer(minLength: 6)
                    if #available(iOSApplicationExtension 17.0, *), t.total.map({ t.next <= $0 }) ?? true {
                        Button(intent: MarkEpisodeIntent(animeId: t.id, episode: t.next)) {
                            Image(systemName: "plus.circle.fill").font(.title2).foregroundStyle(accent)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Cocher l'épisode \(t.next) de \(t.title)")
                    } else if t.total.map({ t.next > $0 }) ?? false {
                        Image(systemName: "checkmark.circle.fill").font(.title2).foregroundStyle(.green)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(appLink("/Webapp-/collection/"))
        .widgetBackground(glass)
    }
}

struct EpisodesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "EpisodesWidget", provider: GBProvider()) { EpisodesView(entry: $0) }
            .configurationDisplayName("Mes épisodes")
            .description("Coche l'épisode que tu viens de voir, sans ouvrir l'app.")
            .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - 🔒 Écran verrouillé : compte à rebours et prochain épisode

/// Jeu épinglé (sinon prochaine grosse sortie) sous l'heure de l'écran verrouillé.
struct LockReleaseView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let r = entry.release
        let short = r.map { Countdown.text(to: $0.date, now: entry.date) } ?? "–"
        Group {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Image(systemName: entry.pinned ? "pin.fill" : "gamecontroller.fill").font(.caption2)
                        Text(short).font(.system(size: 15, weight: .bold, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1)
                    }
                    .padding(4)
                }
            case .accessoryInline:
                Text("\(Image(systemName: "gamecontroller.fill")) \(r?.title ?? "GamingBase") \(short)")
            default:
                VStack(alignment: .leading, spacing: 1) {
                    Label(entry.pinned ? "Épinglé" : "Prochaine sortie", systemImage: entry.pinned ? "pin.fill" : "gamecontroller.fill")
                        .font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                    Text(r?.title ?? "Pas de sortie").font(.headline).lineLimit(1)
                    if let r { Text("\(Countdown.long(to: r.date, now: entry.date)) · \(Countdown.day(r.date))").font(.caption).lineLimit(1) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(appLink(r?.path))
        .widgetBackground(Color.clear)
    }
}

struct LockReleaseWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LockReleaseWidget", provider: GBProvider()) { LockReleaseView(entry: $0) }
            .configurationDisplayName("Compte à rebours")
            .description("Ton jeu épinglé sur l'écran verrouillé.")
            .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

/// Prochain épisode (anime suivi d'abord) sous l'heure de l'écran verrouillé.
struct LockAnimeView: View {
    let entry: GBEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let e = FeedLoader.episodes(entry.feed, now: entry.date).first
        Group {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) {
                        Image(systemName: "play.tv.fill").font(.caption2)
                        Text(e.map { "ép. \($0.episode)" } ?? "–").font(.system(size: 13, weight: .bold, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1)
                    }
                    .padding(4)
                }
            case .accessoryInline:
                Text("\(Image(systemName: "play.tv.fill")) \(e.map { "\($0.title) ép. \($0.episode)" } ?? "Aucun épisode")")
            default:
                VStack(alignment: .leading, spacing: 1) {
                    Label(e?.followed == true ? "Anime suivi" : "Prochain épisode", systemImage: "play.tv.fill")
                        .font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                    Text(e?.title ?? "Aucun épisode").font(.headline).lineLimit(1)
                    if let e { Text("Épisode \(e.episode) · \(FeedLoader.when(e.date, now: entry.date))").font(.caption).lineLimit(1) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .widgetURL(appLink(e?.path ?? "/Webapp-/anime/"))
        .widgetBackground(Color.clear)
    }
}

struct LockAnimeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LockAnimeWidget", provider: GBProvider()) { LockAnimeView(entry: $0) }
            .configurationDisplayName("Prochain épisode")
            .description("Le prochain épisode de tes animes suivis sur l'écran verrouillé.")
            .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Ensemble des widgets

@main
struct GamingBaseWidgets: WidgetBundle {
    var body: some Widget {
        PinnedWidget()
        ReleaseWidget()
        NewsWidget()
        FreeWidget()
        AnimeWidget()
        EpisodesWidget()
        LockReleaseWidget()
        LockAnimeWidget()
        ReleaseLiveActivity()
    }
}
