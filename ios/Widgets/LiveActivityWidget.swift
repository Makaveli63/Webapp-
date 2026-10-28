import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

private let liveAccent = Color(red: 0.486, green: 0.361, blue: 1.0) // violet GamingBase (#7c5cff)

/// Temps restant, recalculé à chaque affichage :
/// jours (« 21 j ») et/ou minuteur heures : minutes : secondes qui défile tout seul.
/// Sans les jours, le minuteur compte toutes les heures restantes (« 525:12:33 »).
struct LiveCountdownText: View {
    enum Part { case all, days, clock }

    let state: ReleaseActivityAttributes.ContentState
    var compact = false
    /// Dynamic Island agrandie : les jours en haut, le minuteur en bas (pour ne jamais couper la ligne).
    var part: Part = .all
    /// Écran verrouillé : jours en petit au-dessus du minuteur.
    var stacked = false

    var body: some View {
        let now = Date()
        let left = state.releaseAt.timeIntervalSince(now)
        let days = max(0, Int(left / 86_400))
        let showClock = state.showClock ?? true
        let showDays = (state.showDays ?? true) || !showClock
        // Fin du jour en cours du compte à rebours (quand « 21 j » passera à « 20 j »).
        let boundary = showDays ? state.releaseAt.addingTimeInterval(-Double(days) * 86_400) : state.releaseAt
        if left <= 0 {
            Text("Dispo !")
        } else if compact {
            // Dynamic Island réduite : peu de place, une seule information.
            if showDays && days > 0 {
                Text("\(days) j")
            } else {
                Text(timerInterval: now...max(boundary, now.addingTimeInterval(1)), countsDown: true)
                    .monospacedDigit()
                    .frame(maxWidth: 60, alignment: .trailing)
            }
        } else if stacked {
            VStack(alignment: .trailing, spacing: 0) {
                if showDays && days > 0 {
                    Text(showClock ? "\(days) jour\(days > 1 ? "s" : "")" : "\(days) j")
                        .font(showClock ? .subheadline.bold() : nil)
                        .lineLimit(1)
                }
                if showClock {
                    timer(until: boundary, now: now, alignment: .trailing)
                }
            }
        } else {
            HStack(spacing: 6) {
                if showDays && days > 0 && part != .clock {
                    Text("\(days) j")
                        .lineLimit(1)
                        .fixedSize()
                } else if days == 0 && !showClock && part != .clock {
                    Text("Aujourd'hui").lineLimit(1).fixedSize()
                }
                if showClock && part != .days {
                    timer(until: boundary, now: now, alignment: .leading)
                }
            }
        }
    }
}

extension LiveCountdownText {
    /// Minuteur qui défile tout seul. Sa largeur est fixée (le minuteur prendrait sinon toute la place),
    /// collée aux jours (à gauche) ou au bord (à droite).
    func timer(until end: Date, now: Date, alignment: Alignment) -> some View {
        Text(timerInterval: now...max(end, now.addingTimeInterval(1)), countsDown: true)
            .monospacedDigit()
            .lineLimit(1)
            .multilineTextAlignment(alignment == .leading ? .leading : .trailing)
            .frame(width: 104, alignment: alignment)
            .minimumScaleFactor(0.7)
    }
}

/// Vignette du jeu envoyée par l'app (sinon l'icône manette).
struct LiveGameImage: View {
    let data: Data?
    var width: CGFloat
    var height: CGFloat
    var corner: CGFloat = 8

    var body: some View {
        if let data, let image = UIImage(data: data) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: width, height: height)
                .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
        } else {
            Image(systemName: "gamecontroller.fill")
                .font(.system(size: min(width, height) * 0.6))
                .foregroundStyle(liveAccent)
                .frame(width: width, height: height)
        }
    }
}

/// Écran verrouillé (et bannière) : image, nom, date et compte à rebours.
struct LiveLockScreenView: View {
    let context: ActivityViewContext<ReleaseActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            LiveGameImage(data: context.attributes.image, width: 48, height: 64)
            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("Sortie le \(context.state.day)")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            Spacer(minLength: 8)
            LiveCountdownText(state: context.state, stacked: true)
                .font(.title2.bold())
                .foregroundStyle(liveAccent)
                .layoutPriority(1)
        }
        .padding(14)
    }
}

/// Live Activity du jeu épinglé : écran verrouillé et Dynamic Island.
struct ReleaseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ReleaseActivityAttributes.self) { context in
            LiveLockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.82))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(appLink(context.attributes.path))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    LiveGameImage(data: context.attributes.image, width: 44, height: 58)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Sortie le \(context.state.day)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        Spacer(minLength: 8)
                        // Jours et minuteur ensemble, en bas sur toute la largeur : loin des bords arrondis.
                        LiveCountdownText(state: context.state)
                            .font(.title3.bold())
                            .foregroundStyle(liveAccent)
                            .minimumScaleFactor(0.75)
                            .layoutPriority(1)
                    }
                }
            } compactLeading: {
                LiveGameImage(data: context.attributes.image, width: 22, height: 22, corner: 11)
            } compactTrailing: {
                LiveCountdownText(state: context.state, compact: true)
                    .font(.caption.bold())
                    .foregroundStyle(liveAccent)
            } minimal: {
                LiveGameImage(data: context.attributes.image, width: 22, height: 22, corner: 11)
            }
            .widgetURL(appLink(context.attributes.path))
        }
    }
}
