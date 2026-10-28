import Foundation
import ImageIO
import UIKit

/// Données publiées par le site pour les widgets (https://makaveli63.github.io/Webapp-/widget.json).
struct Feed: Codable {
    struct Release: Codable, Hashable {
        let id: String
        let title: String
        let atMs: Double
        let image: String?
        let path: String
        var date: Date { Date(timeIntervalSince1970: atMs / 1000) }
    }

    struct News: Codable, Hashable {
        let title: String
        let score: String?
        let category: String?
        let platforms: [String]?
        let path: String
    }

    struct Free: Codable, Hashable {
        let title: String
        let store: String
    }

    /// Prochain épisode d'un anime (widget « Prochains épisodes »).
    struct Episode: Codable, Hashable {
        let title: String
        let episode: Int
        let atMs: Double
        let path: String
        var image: String? = nil
        /// Anime suivi (🔔) dans l'app
        var followed: Bool? = nil
        var date: Date { Date(timeIntervalSince1970: atMs / 1000) }
    }

    /// Promo en cours (alertes prix sur les jeux « Je le veux »).
    struct Deal: Codable, Hashable {
        let id: String
        let title: String
        let store: String
        let discount: Double
        var price: String? = nil
        var oldPrice: String? = nil
    }

    let releases: [Release]
    let news: [News]
    let free: [Free]
    let freePath: String?
    /// Absent des anciennes versions du fichier
    let anime: [Episode]?
    let deals: [Deal]?
}

enum FeedLoader {
    private static let url = URL(string: "https://makaveli63.github.io/Webapp-/widget.json")!

    /// Dernières données du site ; sans connexion, la dernière version gardée en mémoire.
    static func load() async -> Feed? {
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 10
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let feed = try JSONDecoder().decode(Feed.self, from: data)
            AppGroup.defaults?.set(data, forKey: AppGroup.feedKey)
            return feed
        } catch {
            guard let cached = AppGroup.defaults?.data(forKey: AppGroup.feedKey) else { return nil }
            return try? JSONDecoder().decode(Feed.self, from: cached)
        }
    }

    /// Visuel du jeu en miniature (~600 px) : décodé directement en petit avec ImageIO, sans jamais
    /// charger l'image d'origine en mémoire (un widget est coupé par iOS au-delà de ~30 Mo).
    static func image(_ address: String?) async -> UIImage? {
        guard let address, let url = URL(string: address), url.scheme == "https" else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        guard let result = try? await URLSession.shared.data(for: request), result.0.count < 6_000_000,
              let source = CGImageSourceCreateWithData(result.0 as CFData, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: 600,
        ]
        guard let thumb = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        return UIImage(cgImage: thumb)
    }

    /// Épisodes à afficher : d'abord ceux des animes suivis (🔔, transmis par le site à l'app),
    /// puis ceux de la semaine ; sortis depuis moins de 6 h ou à venir.
    static func episodes(_ feed: Feed?, now: Date = Date()) -> [Feed.Episode] {
        var followed: [Feed.Episode] = []
        if let data = AppGroup.defaults?.data(forKey: "notif.prefs"),
           let prefs = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let list = prefs["episodes"] as? [[String: Any]] {
            followed = list.compactMap { e in
                guard let title = e["title"] as? String, let episode = e["episode"] as? Int,
                      let atMs = (e["atMs"] as? NSNumber)?.doubleValue, let path = e["path"] as? String else { return nil }
                return Feed.Episode(title: title, episode: episode, atMs: atMs, path: path, followed: true)
            }
        }
        let recent = now.addingTimeInterval(-6 * 3600)
        let known = Set(followed.map(\.title))
        let others = (feed?.anime ?? []).filter { !known.contains($0.title) }
        return (followed.sorted { $0.atMs < $1.atMs } + others).filter { $0.date > recent }
    }

    /// « aujourd'hui 17:30 », « demain 9:00 », « jeu. 18:00 », « sorti ».
    static func when(_ date: Date, now: Date = Date()) -> String {
        if date <= now { return "disponible" }
        let cal = Calendar.current
        let f = DateFormatter()
        f.locale = Locale(identifier: "fr_FR")
        f.dateFormat = "H:mm"
        let time = f.string(from: date)
        if cal.isDateInToday(date) { return "aujourd'hui \(time)" }
        if cal.isDateInTomorrow(date) { return "demain \(time)" }
        f.dateFormat = "EEE H:mm"
        return f.string(from: date)
    }

    /// Jeux épinglés dans l'app (📌), le plus récent en premier.
    static var pins: [String] { AppGroup.defaults?.stringArray(forKey: AppGroup.pinsKey) ?? [] }

    /// Sortie à afficher : le jeu choisi dans le widget, sinon le plus récemment épinglé dans l'app,
    /// sinon la grosse sortie la plus proche.
    static func choose(_ feed: Feed?, preferred: String? = nil, now: Date = Date()) -> (release: Feed.Release, pinned: Bool)? {
        guard let releases = feed?.releases else { return nil }
        let upcoming = releases.filter { $0.date > now.addingTimeInterval(-86_400) }
        for id in [preferred].compactMap({ $0 }) + pins {
            if let r = upcoming.first(where: { $0.id == id }) { return (r, true) }
        }
        return upcoming.first.map { ($0, false) }
    }
}

enum Countdown {
    /// « J-23 », « 14 h » ou « Dispo ! ».
    static func text(to date: Date, now: Date = Date()) -> String {
        let left = date.timeIntervalSince(now)
        if left <= 0 { return "Dispo !" }
        if left < 86_400 { return "\(Int(left / 3600)) h" }
        return "J-\(Int((left / 86_400).rounded(.up)))"
    }

    /// « dans 21 j », « dans 5 h » ou « disponible » (menu de l'icône).
    static func long(to date: Date, now: Date = Date()) -> String {
        let left = date.timeIntervalSince(now)
        if left <= 0 { return "disponible" }
        if left < 86_400 { return "dans \(max(1, Int(left / 3600))) h" }
        return "dans \(Int((left / 86_400).rounded(.up))) j"
    }

    static func day(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "fr_FR")
        f.timeZone = TimeZone(identifier: "Europe/Paris")
        f.dateFormat = "d MMMM yyyy"
        return f.string(from: date)
    }
}

/// Lien qui ouvre l'app sur une page du site (gamingbase://open?path=/Webapp-/…).
func appLink(_ path: String?) -> URL {
    var c = URLComponents()
    c.scheme = "gamingbase"
    c.host = "open"
    c.queryItems = [URLQueryItem(name: "path", value: path ?? "/Webapp-/")]
    return c.url!
}
