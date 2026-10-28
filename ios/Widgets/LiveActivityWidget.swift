import ActivityKit
import SwiftUI
import WidgetKit

private let liveAccent = Color(red: 0.55, green: 0.42, blue: 1.0)

/// Moins de 24 h avant la sortie : minuteur qui défile tout seul ; sinon « J-21 ».
struct LiveCountdownText: View {
    let date: Date
    var compact = false

    var body: some View {
        if date > Date(), date.timeIntervalSinceNow < 86_400 {
            Text(timerInterval: Date()...date, countsDown: true)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: compact ? 52 : 110, alignment: .trailing)
        } else {
            Text(Countdown.text(to: date))
        }
    }
}

/// Écran verrouillé (et bannière) : le jeu, sa date et le compte à rebours.
struct LiveLockScreenView: View {
    let context: ActivityViewContext<ReleaseActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "gamecontroller.fill")
                .font(.title2)
                .foregroundStyle(liveAccent)
            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("Sortie le \(context.state.day)")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
            Spacer(minLength: 8)
            LiveCountdownText(date: context.state.releaseAt)
                .font(.title2.bold())
                .foregroundStyle(liveAccent)
        }
        .padding(16)
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
                    Image(systemName: "gamecontroller.fill")
                        .font(.title2)
                        .foregroundStyle(liveAccent)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    LiveCountdownText(date: context.state.releaseAt)
                        .font(.title3.bold())
                        .foregroundStyle(liveAccent)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title)
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Sortie le \(context.state.day)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "gamecontroller.fill")
                    .foregroundStyle(liveAccent)
            } compactTrailing: {
                LiveCountdownText(date: context.state.releaseAt, compact: true)
                    .font(.caption.bold())
                    .foregroundStyle(liveAccent)
            } minimal: {
                Image(systemName: "gamecontroller.fill")
                    .foregroundStyle(liveAccent)
            }
            .widgetURL(appLink(context.attributes.path))
        }
    }
}
