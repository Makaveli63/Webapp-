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
            .widgetURL(appLink(entry.release?.path ?? "/Webapp-/sorties/"))
            .widgetBackground(glass)
        }
    }
}

struct ReleaseWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "ReleaseWidget", intent: ChooseGameIntent.self, provider: GBGameProvider()) {
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

// MARK: - Ensemble des widgets

@main
struct GamingBaseWidgets: WidgetBundle {
    var body: some Widget {
        PinnedWidget()
        ReleaseWidget()
        NewsWidget()
        FreeWidget()
    }
}
