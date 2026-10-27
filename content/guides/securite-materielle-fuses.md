---
title: "Sécurité matérielle : fuses, bootrom et coldboot"
description: "Pourquoi les failles matérielles sont si convoitées et comment les constructeurs s'en protègent."
console: "Switch 2"
level: "Intermédiaire"
tags: ["Fuses", "Bootrom", "Coldboot", "Matériel"]
updatedAt: "2026-10-22"
---

La première Switch est célèbre pour une faille dans sa **bootrom**, une mémoire gravée dans le processeur et donc impossible à corriger par mise à jour. Les constructeurs ont tiré les leçons de cet épisode.

## La bootrom

C'est le tout premier code exécuté au démarrage. Une faille à ce niveau est **permanente** pour les puces concernées : seule une nouvelle révision matérielle peut la corriger.

## Les fuses (eFuses)

Des fusibles électroniques « grillés » de façon irréversible. Ils servent notamment à stocker des clés et à **empêcher le retour à un ancien firmware** (anti-downgrade) : chaque mise à jour majeure peut en griller un.

## Le coldboot

On parle de faille *coldboot* lorsqu'elle s'exécute dès un démarrage à froid, sans action de l'utilisateur. C'est le Graal de la scène, car elle est persistante.

## Les contre-mesures modernes

- Chaîne de démarrage vérifiée cryptographiquement (*secure boot*) ;
- Détection des tentatives d'injection de fautes (*glitching*) ;
- Révisions matérielles silencieuses.
