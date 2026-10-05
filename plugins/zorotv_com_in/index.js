const plugin = {
  id: "zorotv_com_in",
  name: "Zorotv Com In",
  baseUrl: "https://zorotv.com.in",
  version: "1.2.0",

  async getHome() {
    try {
      const response = await fetch(this.baseUrl);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const items = [];
      
      const articles = doc.querySelectorAll("article, .item, .bs");
      articles.forEach(el => {
        const a = el.querySelector("a");
        const img = el.querySelector("img");
        if (a && a.href) {
          const title = (a.getAttribute("title") || (img ? img.getAttribute("alt") : "") || a.textContent || "").trim();
          let coverUrl = "";
          if (img) {
            coverUrl = img.getAttribute("data-src") || img.getAttribute("src") || "";
          }
          let url = a.href;
          if (url.startsWith("/")) url = this.baseUrl + url;
          const id = url.replace(this.baseUrl, "").replace(/^\//, "").replace(/\/$/, "");
          
          if (title && url && !items.some(x => x.url === url)) {
            items.push({
              id: id || url,
              title: title,
              coverUrl: coverUrl,
              url: url
            });
          }
        }
      });
      return items;
    } catch (e) {
      return [];
    }
  },

  async search(query) {
    try {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const items = [];
      
      const articles = doc.querySelectorAll("article, .item, .bs");
      articles.forEach(el => {
        const a = el.querySelector("a");
        const img = el.querySelector("img");
        if (a && a.href) {
          const title = (a.getAttribute("title") || (img ? img.getAttribute("alt") : "") || a.textContent || "").trim();
          let coverUrl = "";
          if (img) {
            coverUrl = img.getAttribute("data-src") || img.getAttribute("src") || "";
          }
          let url = a.href;
          if (url.startsWith("/")) url = this.baseUrl + url;
          const id = url.replace(this.baseUrl, "").replace(/^\//, "").replace(/\/$/, "");
          
          if (title && url && !items.some(x => x.url === url)) {
            items.push({
              id: id || url,
              title: title,
              coverUrl: coverUrl,
              url: url
            });
          }
        }
      });
      return items;
    } catch (e) {
      return [];
    }
  },

  async getEpisodes(mediaId) {
    try {
      let mediaUrl = mediaId;
      if (!mediaUrl.startsWith("http")) {
        mediaUrl = `${this.baseUrl}/${mediaId}/`;
      }
      const response = await fetch(mediaUrl);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const episodes = [];
      
      const epLinks = doc.querySelectorAll(".episodelist ul li a, .eplister ul li a, .episodelist a");
      epLinks.forEach((a, index) => {
        let url = a.getAttribute("href");
        if (url) {
          if (url.startsWith("/")) url = this.baseUrl + url;
          const titleEl = a.querySelector(".epl-title, .det span") || a;
          const title = titleEl ? titleEl.textContent.trim() : `Episode ${index + 1}`;
          const id = url.replace(this.baseUrl, "").replace(/^\//, "").replace(/\/$/, "");
          episodes.push({
            id: id || url,
            number: index + 1,
            title: title,
            url: url
          });
        }
      });
      return episodes;
    } catch (e) {
      return [];
    }
  },

  /**
   * Universal Background Sniffing Mode:
   * Returns watch target URL and media patterns so the client's headless/background
   * tab loads the site, executes dynamic JS/Turnstile, and intercepts valid M3U8/MPD stream URLs.
   */
  async getStreams(episodeId) {
    let epUrl = episodeId;
    if (!epUrl.startsWith("http")) {
      epUrl = `${this.baseUrl}/${episodeId}/`;
    }

    return [
      {
        mode: "background_sniff",
        targetUrl: epUrl,
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
globalThis.AggregatorPlugins["zorotv_com_in"] = plugin;
if (typeof module !== "undefined") module.exports = plugin;
export default plugin;
