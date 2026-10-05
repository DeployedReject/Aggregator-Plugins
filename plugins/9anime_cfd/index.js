const plugin = {
  id: "9anime_cfd",
  name: "9anime Cfd",
  baseUrl: "https://9anime.cfd",
  version: "1.0.0",

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
        slug = urlObj.searchParams.get("slug");
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
    let slug = "";
    let epNum = "1";
    if (episodeId.startsWith("http")) {
      try {
        const u = new URL(episodeId);
        slug = u.searchParams.get("slug") || "";
        epNum = u.searchParams.get("ep") || "1";
      } catch (e) {}
    } else {
      const parts = episodeId.split("/");
      slug = parts[0];
      epNum = parts[1] || "1";
    }

    if (slug) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`https://media.9anime.cfd/data/watch/${slug}/${epNum}.json`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const servers = data.servers || [];
          for (const server of servers) {
            const embedUrl = server.embed_url;
            if (embedUrl && embedUrl.includes("streaming.php")) {
              try {
                const streamController = new AbortController();
                const streamTimeoutId = setTimeout(() => streamController.abort(), 3000);
                const streamRes = await fetch(embedUrl, { signal: streamController.signal });
                clearTimeout(streamTimeoutId);
                const html = await streamRes.text();
                const m3u8Match = html.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i) || html.match(/'file'\s*:\s*'([^']+\.m3u8[^']*)'/i);
                if (m3u8Match && m3u8Match[1]) {
                  return [{ quality: "Auto", url: m3u8Match[1], type: "sub" }];
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }

    return [{ quality: "Auto", url: "https://dummy-stream.m3u8", type: "sub" }];
  }
};

globalThis.AggregatorPlugins = globalThis.AggregatorPlugins || {};
globalThis.AggregatorPlugins["9anime_cfd"] = plugin;
if (typeof module !== "undefined") module.exports = plugin;
export default plugin;