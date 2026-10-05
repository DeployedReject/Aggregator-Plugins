const plugin = {
  id: "barelystarted_miruro",
  name: "Barelystarted Miruro",
  baseUrl: "https://barelystarted.miruro.tv",
  version: "1.0.0",

  /**
   * Helper function to decode standard HTML entities in strings.
   */
  _cleanText(str) {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'")
      .trim();
  },

  /**
   * Helper to parse SvelteKit serialized __data.json structures safely.
   */
  _parseSvelteKitData(json) {
    if (!json || !json.nodes) return [];
    const results = [];

    const unwrap = (val, dataList) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number" && dataList[val] !== undefined) {
        return dataList[val];
      }
      return val;
    };

    try {
      for (const node of json.nodes) {
        if (!node || !node.data) continue;
        const dataList = node.data;

        for (let i = 0; i < dataList.length; i++) {
          const item = dataList[i];
          if (item && typeof item === "object" && !Array.isArray(item)) {
            if (item.id && (item.title !== undefined || item.cover_url !== undefined)) {
              let rawId = unwrap(item.id, dataList);
              if (typeof rawId !== "string" && typeof rawId !== "number") continue;

              let titleObj = unwrap(item.title, dataList);
              let titleStr = "";
              if (typeof titleObj === "string") {
                titleStr = titleObj;
              } else if (titleObj && typeof titleObj === "object") {
                titleStr = titleObj.english || titleObj.romaji || titleObj.native || "";
              }

              let coverUrl = unwrap(item.cover_url, dataList) || "";
              if (typeof coverUrl !== "string") coverUrl = "";

              if (titleStr || rawId) {
                const mediaId = String(rawId);
                const title = this._cleanText(titleStr || mediaId);
                const fullCover = coverUrl.startsWith("/") ? `${this.baseUrl}${coverUrl}` : coverUrl;
                const url = `${this.baseUrl}/info/${mediaId}`;

                results.push({
                  id: mediaId,
                  title: title || "Unknown Title",
                  coverUrl: fullCover,
                  url: url,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      // Fallback on error
    }

    // Deduplicate by ID
    const uniqueMap = new Map();
    for (const item of results) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
    return Array.from(uniqueMap.values());
  },

  async getHome() {
    return this.search("a");
  },

  async search(query) {
    try {
      const targetUrl = `${this.baseUrl}/search/__data.json?q=${encodeURIComponent(query)}&x-sveltekit-invalidated=01`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:157.0) Gecko/20100101 Firefox/157.0",
        },
      });

      if (!response.ok) return [];
      const json = await response.json();
      return this._parseSvelteKitData(json);
    } catch (err) {
      return [];
    }
  },

  async getEpisodes(mediaId) {
    try {
      const cleanId = mediaId.replace(/^https?:\/\/[^\/]+\/(info|watch)\//, "");
      const targetUrl = `${this.baseUrl}/info/${cleanId}/__data.json?x-sveltekit-invalidated=01`;

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:157.0) Gecko/20100101 Firefox/157.0",
        },
      });

      let episodeCount = 1;
      if (response.ok) {
        const json = await response.json();
        if (json?.nodes) {
          for (const node of json.nodes) {
            if (!node?.data) continue;
            for (const item of node.data) {
              if (item && typeof item === "object" && item.episode_count) {
                const count = typeof item.episode_count === "number" ? item.episode_count : parseInt(item.episode_count, 10);
                if (!isNaN(count) && count > 0) {
                  episodeCount = count;
                  break;
                }
              }
            }
          }
        }
      }

      const episodes = [];
      for (let i = 1; i <= episodeCount; i++) {
        const epId = `${cleanId}?ep=${i}`;
        episodes.push({
          id: epId,
          number: i,
          title: `Episode ${i}`,
          url: `${this.baseUrl}/watch/${epId}`,
        });
      }
      return episodes;
    } catch (err) {
      return [{
        id: `${mediaId}?ep=1`,
        number: 1,
        title: "Episode 1",
        url: `${this.baseUrl}/watch/${mediaId}?ep=1`,
      }];
    }
  },

  async getStreams(episodeId) {
    const watchUrl = episodeId.startsWith("http") ? episodeId : `${this.baseUrl}/watch/${episodeId}`;
    const browserAPI = globalThis.browser || globalThis.chrome;
    if (browserAPI?.runtime?.sendMessage) {
      const res = await browserAPI.runtime.sendMessage({
        action: "STREAM_BACKGROUND_TAB",
        url: watchUrl,
      });
      if (res?.status === "FOUND" && res.url) {
        return [{ quality: "Auto", url: res.url, type: "sub" }];
      }
    }
    return [];
  }
};

globalThis.AggregatorPlugins = globalThis.AggregatorPlugins || {};
globalThis.AggregatorPlugins["barelystarted_miruro"] = plugin;
if (typeof module !== "undefined") module.exports = plugin;
export default plugin;