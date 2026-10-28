import AVFoundation
import MediaPlayer

/// « Écouter les actus » : lit les résumés avec la voix de l'iPhone, l'un après l'autre, même écran verrouillé
/// (commandes sur l'écran verrouillé et dans le Centre de contrôle). L'avancement est renvoyé au site.
final class NewsReader: NSObject, AVSpeechSynthesizerDelegate {
    static let shared = NewsReader()

    /// (index, état) → site ; état : playing, paused, stopped
    var onState: ((Int, String) -> Void)?

    private let synth = AVSpeechSynthesizer()
    private var items: [(title: String, text: String)] = []
    private var index = -1
    private var commandsReady = false

    override init() {
        super.init()
        synth.delegate = self
    }

    /// Voix choisie dans les réglages du site (identifiant iOS), sinon la plus naturelle installée ; vitesse 0,8 à 1,3.
    var voiceId: String?
    var rate: Float = 1

    /// Voix françaises de l'iPhone, les plus naturelles d'abord (Premium, puis Améliorée, puis standard).
    static func frenchVoices() -> [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.hasPrefix("fr") }
            .sorted { a, b in
                a.quality.rawValue != b.quality.rawValue ? a.quality.rawValue > b.quality.rawValue
                    : (a.language == "fr-FR") != (b.language == "fr-FR") ? a.language == "fr-FR" : a.name < b.name
            }
    }

    static func voiceList() -> [[String: Any]] {
        frenchVoices().map { v in
            let quality = v.quality == .premium ? "Premium" : v.quality == .enhanced ? "Améliorée" : "Standard"
            let region = v.language == "fr-FR" ? "France" : v.language == "fr-CA" ? "Canada" : v.language
            return ["id": v.identifier, "name": v.name, "detail": "\(quality) · \(region)", "natural": v.quality != .default]
        }
    }

    private var voice: AVSpeechSynthesisVoice? {
        if let id = voiceId, let chosen = AVSpeechSynthesisVoice(identifier: id) { return chosen }
        return Self.frenchVoices().first ?? AVSpeechSynthesisVoice(language: "fr-FR")
    }

    func start(_ list: [[String: Any]]) {
        items = list.prefix(20).compactMap { item in
            guard let text = item["text"] as? String, !text.isEmpty else { return nil }
            return (item["title"] as? String ?? "GamingBase", String(text.prefix(3000)))
        }
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        setUpCommands()
        play(0)
    }

    func control(_ cmd: String) {
        switch cmd {
        case "pause":
            synth.pauseSpeaking(at: .word)
            report("paused")
        case "resume":
            if synth.isPaused { synth.continueSpeaking(); report("playing") } else { play(max(0, index)) }
        case "next": play(index + 1)
        case "previous": play(max(0, index - 1))
        default: stop()
        }
    }

    private func play(_ i: Int) {
        synth.stopSpeaking(at: .immediate)
        guard items.indices.contains(i) else { return stop() }
        index = i
        let utterance = AVSpeechUtterance(string: items[i].text)
        utterance.voice = voice
        utterance.rate = min(AVSpeechUtteranceMaximumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * max(0.7, min(rate, 1.4)))
        utterance.pitchMultiplier = 1
        utterance.postUtteranceDelay = 0.35 // petite respiration entre deux actus
        synth.speak(utterance)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [
            MPMediaItemPropertyTitle: items[i].title,
            MPMediaItemPropertyArtist: "GamingBase · actu \(i + 1) sur \(items.count)",
        ]
        report("playing")
    }

    private func stop() {
        synth.stopSpeaking(at: .immediate)
        index = -1
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        report("stopped")
    }

    private func report(_ state: String) {
        let i = index
        DispatchQueue.main.async { self.onState?(i, state) }
    }

    /// Lecture / pause / suivant sur l'écran verrouillé, les écouteurs et le Centre de contrôle.
    private func setUpCommands() {
        guard !commandsReady else { return }
        commandsReady = true
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { [weak self] _ in self?.control("resume"); return .success }
        c.pauseCommand.addTarget { [weak self] _ in self?.control("pause"); return .success }
        c.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.control(self.synth.isPaused ? "resume" : "pause")
            return .success
        }
        c.nextTrackCommand.addTarget { [weak self] _ in self?.control("next"); return .success }
        c.previousTrackCommand.addTarget { [weak self] _ in self?.control("previous"); return .success }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { if self.index >= 0 { self.play(self.index + 1) } }
    }
}
