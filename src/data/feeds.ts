export interface Feed {
  name: string;
  url: string;
}

/**
 * Flux RSS francophones agrégés à chaque reconstruction du site.
 * Un flux qui ne répond pas est simplement ignoré (voir le journal de build).
 * La variable d'environnement RSS_FEEDS ("Nom|URL,Nom|URL") remplace cette liste.
 */
export const DEFAULT_FEEDS: Feed[] = [
  { name: "Jeuxvideo.com", url: "https://www.jeuxvideo.com/rss/rss.xml" },
  { name: "Gamekult", url: "https://www.gamekult.com/feed.xml" },
  { name: "ActuGaming", url: "https://www.actugaming.net/feed/" },
  { name: "Gameblog", url: "https://www.gameblog.fr/rss.php" },
  { name: "JeuxActu", url: "https://www.jeuxactu.com/rss/news.rss" },
  { name: "Millenium", url: "https://www.millenium.org/rss" },
  { name: "GamerGen", url: "https://gamergen.com/rss" },
  { name: "Nintendo-Town", url: "https://www.nintendo-town.fr/feed/" },
  { name: "PlayStation Blog FR", url: "https://blog.fr.playstation.com/feed/" },
  { name: "Xbox Wire FR", url: "https://news.xbox.com/fr-fr/feed/" },
];
