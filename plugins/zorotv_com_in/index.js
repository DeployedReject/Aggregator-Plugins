const plugin = {
  id: "zorotv_com_in",
  name: "Zorotv Com In",
  baseUrl: "https://zorotv.com.in",
  version: "1.0.0",

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
      
      if (episodes.length === 0) {
        // Fallback: check if the mediaUrl itself is an episode page or has links
        const allLinks = doc.querySelectorAll("a");
        allLinks.forEach(a => {
          const href = a.getAttribute("href");
          if (href && (href.includes("episode") || href.includes("-ep-"))) {
            let url = href;
            if (url.startsWith("/")) url = this.baseUrl + url;
            if (!episodes.some(x => x.url === url)) {
              episodes.push({
                id: url.replace(this.baseUrl, "").replace(/^\//, "").replace(/\/$/, ""),
                number: episodes.length + 1,
                title: a.textContent.trim() || `Episode ${episodes.length + 1}`,
                url: url
              });
            }
          }
        });
      }
      
      return episodes;
    } catch (e) {
      return [];
    }
  },

  async getStreams(episodeId) {
    try {
      let epUrl = episodeId;
      if (!epUrl.startsWith("http")) {
        epUrl = `${this.baseUrl}/${episodeId}/`;
      }
      const response = await fetch(epUrl);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      
      const streams = [];
      const iframes = doc.querySelectorAll("iframe");
      for (const iframe of iframes) {
        let src = iframe.getAttribute("src") || iframe.getAttribute("data-src");
        if (src) {
          if (src.startsWith("//")) src = "https:" + src;
          
          // Resolve embedded streams or fetch player page
          try {
            const embedRes = await fetch(src, {
              headers: { "Referer": this.baseUrl }
            });
            const embedHtml = await embedRes.text();
            
            // Regex to find .m3u8 or .mp4 links
            const m3u8Match = embedHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
            if (m3u8Match) {
              streams.push({
                url: m3u8Match[1],
                quality: "1080p",
                type: "sub"
              });
            }
            
            const mp4Match = embedHtml.match(/["'](https?:\/\/[^"']+\.mp4[^"']*)["']/);
            if (mp4Match) {
              streams.push({
                url: mp4Match[1],
                quality: "720p",
                type: "sub"
              });
            }
          } catch (err) {}
        }
      }
      
      // If no streams found via iframe directly, check script tags or direct video tags
      if (streams.length === 0) {
        const sources = doc.querySelectorAll("source, video");
        sources.forEach(s => {
          const src = s.getAttribute("src");
          if (src && (src.includes(".m3u8") || src.includes(".mp4"))) {
            streams.push({
              url: src.startsWith("/") ? this.baseUrl + src : src,
              quality: "1080p",
              type: "sub"
            });
          }
        });
      }

      return streams;
    } catch (e) {
      return [];
    }
  }
};

globalThis.AggregatorPlugins = globalThis.AggregatorPlugins || {};
globalThis.AggregatorPlugins["zorotv_com_in"] = plugin;
if (typeof module !== "undefined") module.exports = plugin;
export default plugin;