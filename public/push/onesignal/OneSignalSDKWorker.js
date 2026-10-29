// Notifications web (OneSignal). Service worker à part, dans son propre dossier :
// il ne touche pas à /sw.js (lecture hors connexion), qui garde la portée du site entier.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
