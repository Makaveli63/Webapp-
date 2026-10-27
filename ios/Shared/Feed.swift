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
        let path: String
    }

    struct Free: Codable, Hashable {
        let title: String
        let store: String
    }

    let releases: [Release]
    let news: [News]
    let free: [Free]
    let freePath: String?
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
