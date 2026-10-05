const plugin = {
  id: "9anime_cfd",
  name: "9anime Cfd",
  baseUrl: "https://9anime.cfd",
  version: "1.2.0",

  async getHome() {
    try {
      const response = await fetch("https://media.9anime.cfd/data/home.json");
      const data = await response.json();
      const items = data.featured || [];
      return items.map(item => ({
        id: item.slug || String(item.id),
        title: item.title || "Unknown Title",
        coverUrl: item.poster_url || "",
        url: `${this.baseUrl}/watch.html?slug=${item.slug}&ep=1`
      }));
    } catch (e) {
      return [];
    }
  },

  async search(query) {
    try {
      const response = await fetch("https://media.9anime.cfd/data/search_index.json");
      const data = await response.json();
      const lowerQuery = query.toLowerCase();
      const filtered = data.filter(item => item.t && item.t.toLowerCase().includes(lowerQuery));
      return filtered.map(item => ({
        id: item.s,
        title: item.t,
        coverUrl: item.p || "",
        url: `${this.baseUrl}/watch.html?slug=${item.s}&ep=1`
      }));
    } catch (e) {
      return [];
    }
  },

  async getEpisodes(mediaId) {
    try {
      let slug = mediaId;
      if (mediaId.startsWith("http")) {
        const urlObj = new URL(mediaId);
        slug = urlObj.searchParams.get("slug") || mediaId.split("/").pop();
      }
      const response = await fetch(`https://media.9anime.cfd/data/watch/${slug}/1.json`);
      const data = await response.json();
      const allEps = data.all_episodes || [1];
      
      return allEps.map(epNum => ({
        id: `${slug}/${epNum}`,
        number: Number(epNum),
        title: `Episode ${epNum}`,
        url: `${this.baseUrl}/watch.html?slug=${slug}&ep=${epNum}`
      }));
    } catch (e) {
      return [];
    }
  },

  async getStreams(episodeId) {
    let watchUrl = episodeId;
    if (!episodeId.startsWith("http")) {
      const parts = episodeId.split("/");
      const slug = parts[0];
      const epNum = parts[1] || "1";
      watchUrl = `${this.baseUrl}/watch.html?slug=${slug}&ep=${epNum}`;
    }

    return [
      {
        mode: "background_sniff",
        targetUrl: watchUrl,
        type: "sub",
        mediaPatterns: [
          "\\.m3u8(?:\\?.*)?$",
          "\\.mpd(?:\\?.*)?$",
          "\\.mp4(?:\\?.*)?$"
        ],
        headers: {
          "Referer": this.baseUrl,
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"
        },
        timeoutMs: 12000
      }
    ];
  }
};

globalThis.AggregatorPlugins = globalThis.AggregatorPlugins || {};
globalThis.AggregatorPlugins["9anime_cfd"] = plugin;
if (typeof module !== "undefined") module.exports = plugin;
export default plugin;
