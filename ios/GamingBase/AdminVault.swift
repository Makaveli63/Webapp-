import Foundation
import LocalAuthentication
import Security

/// Mot de passe du tableau de bord administrateur, gardé dans le trousseau de l'iPhone (jamais sur le site,
/// jamais synchronisé) et rendu au site seulement après Face ID, Touch ID ou le code de l'appareil.
enum AdminVault {
    private static let service = "io.github.makaveli63.gamingbase.admin"
    private static let account = "admin"

    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
    }

    static var hasPassword: Bool {
        var q = query
        q[kSecReturnData as String] = false
        return SecItemCopyMatching(q as CFDictionary, nil) == errSecSuccess
    }

    static func save(_ password: String) {
        guard !password.isEmpty, password.count <= 200, let data = password.data(using: .utf8) else { return }
        SecItemDelete(query as CFDictionary)
        var item = query
        item[kSecValueData as String] = data
        // Seulement sur cet iPhone, et seulement quand il est déverrouillé (pas de sauvegarde iCloud).
        item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }

    static func forget() {
        SecItemDelete(query as CFDictionary)
    }

    /// Face ID (ou code de l'appareil), puis lecture du trousseau. nil si refusé ou rien d'enregistré.
    static func unlock() async -> String? {
        let context = LAContext()
        context.localizedCancelTitle = "Annuler"
        guard (try? await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Ouvrir le tableau de bord GamingBase")) == true
        else { return nil }
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
