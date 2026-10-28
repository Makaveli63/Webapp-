import ActivityKit
import Foundation

/// Live Activity « compte à rebours du jeu épinglé » : écran verrouillé et Dynamic Island.
/// Partagée entre l'app (qui la démarre) et l'extension des widgets (qui l'affiche).
@available(iOS 16.1, *)
struct ReleaseActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var releaseAt: Date
        /// « 19 novembre 2026 »
        var day: String
        // Champs ajoutés après la première version : facultatifs, pour qu'une Live Activity déjà
        // lancée par l'ancienne version de l'app se relise sans erreur (sinon iOS ferme l'app).
        /// Afficher les jours (« 21 j »)
        var showDays: Bool?
        /// Afficher heures : minutes : secondes (minuteur en direct)
        var showClock: Bool?
    }

    var gameId: String
    var title: String
    var path: String
    /// Vignette du jeu (JPEG de quelques Ko) : l'extension ne peut pas télécharger d'image elle-même.
    var image: Data?
}
