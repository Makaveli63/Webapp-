"use client";

/**
 * Badges de cet appareil : calculés à partir de l'activité (commentaires, votes, notes, pronostics, favoris).
 * Les compteurs « serveur » (sondages, notes, pronostics, j'aime) viennent de get_my_activity ;
 * les commentaires et les pronostics réussis sont comptés ici.
 */
const KEY = "gb-activite";

export interface Activity {
  comments: number;
  ratings: number;
  predictions: number;
  /** Pronostics à 1 point près de la moyenne de la presse */
  goodPredictions: string[];
}

export function readActivity(): Activity {
  try {
    return { comments: 0, ratings: 0, predictions: 0, goodPredictions: [], ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { comments: 0, ratings: 0, predictions: 0, goodPredictions: [] };
  }
}

function write(a: Activity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* stockage indisponible */
  }
}

export function bumpActivity(kind: "comments" | "ratings" | "predictions") {
  const a = readActivity();
  a[kind] += 1;
  write(a);
}

export function recordPrediction(game: string, mine: number, press: number) {
  const a = readActivity();
  if (Math.abs(mine - press) <= 1 && !a.goodPredictions.includes(game)) {
    a.goodPredictions = [...a.goodPredictions, game].slice(-200);
    write(a);
  }
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  earned: boolean;
}

export function computeBadges(a: Activity, server: { polls: number; ratings: number; predictions: number; likes: number }, favorites: number): Badge[] {
  return [
    { id: "bavard", emoji: "💬", label: "Bavard", hint: "Écrire 5 commentaires", earned: a.comments >= 5 },
    { id: "fidele", emoji: "🏅", label: "Fidèle", hint: "Écrire 20 commentaires", earned: a.comments >= 20 },
    { id: "votant", emoji: "🗳️", label: "Votant", hint: "Voter à 3 sondages", earned: server.polls >= 3 },
    { id: "critique", emoji: "⭐", label: "Critique", hint: "Noter 5 jeux", earned: Math.max(server.ratings, a.ratings) >= 5 },
    { id: "parieur", emoji: "🎲", label: "Parieur", hint: "Faire 3 pronostics", earned: Math.max(server.predictions, a.predictions) >= 3 },
    { id: "pronostiqueur", emoji: "🎯", label: "Pronostiqueur", hint: "Un pronostic à 1 point près", earned: a.goodPredictions.length >= 1 },
    { id: "fan", emoji: "❤️", label: "Fan", hint: "Donner 25 j'aime", earned: server.likes >= 25 },
    { id: "collectionneur", emoji: "📚", label: "Lecteur assidu", hint: "Enregistrer 10 articles", earned: favorites >= 10 },
  ];
}
