import Foundation

/// Espace partagé entre l'app et ses widgets (jeux épinglés, dernières données).
/// AltStore renomme le groupe à la signature et l'indique dans « ALTAppGroups » (Info.plist).
enum AppGroup {
    static let fallback = "group.io.github.makaveli63.gamingbase"
    static let pinsKey = "pins"
    static let feedKey = "feed"

    static var identifier: String {
        // Info.plist de l'app ou de l'extension, puis celui de l'app qui contient l'extension.
        let appBundle = Bundle(url: Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent())
        for bundle in [Bundle.main, appBundle].compactMap({ $0 }) {
            if let groups = bundle.object(forInfoDictionaryKey: "ALTAppGroups") as? [String], let first = groups.first {
                return first
            }
        }
        return fallback
    }

    static var defaults: UserDefaults? { UserDefaults(suiteName: identifier) }
}
