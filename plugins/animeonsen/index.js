export default {
  id: "animeonsen",
  name: "AnimeOnsen",
  baseUrl: "https://www.animeonsen.xyz",
  version: "1.0.0",

  async getHome() {
    return this.search("");
  },

  async search(query) {
    try {
      const res = await fetch("https://search.animeonsen.xyz/indexes/content/search", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 0e36d0275d16b40d7cf153634df78bc229320d073f565db2aaf6d027e0c30b13",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query || "", limit: 20 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const hits = data?.hits || [];
      return hits.map((item) => ({
        id: item.content_id,
        title: item.content_title_en || item.content_title || item.content_title_jp || "",
        coverUrl: `https://api.animeonsen.xyz/v4/image/210x300/${item.content_id}`,
        url: `${this.baseUrl}/details/${item.content_id}`,
      }));
    } catch (e) {
      return [];
    }
  },

  async getEpisodes(mediaId) {
    try {
      const cleanId = mediaId.replace(/^https?:\/\/[^\/]+\/(details\/)?/, "").split("?")[0];
      const res = await fetch(`${this.baseUrl}/details/${cleanId}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) return [];
      const html = await res.text();
      let totalEpisodes = 1;
      const countMatch = html.match(/<i>Episodes<\/i>\s*(\d+)/i);
      if (countMatch && countMatch[1]) {
        totalEpisodes = parseInt(countMatch[1], 10);
      }
      const episodes = [];
      for (let i = 1; i <= totalEpisodes; i++) {
        episodes.push({
          id: `${cleanId}:${i}`,
          number: i,
          title: `Episode ${i}`,
          url: `${this.baseUrl}/watch/${cleanId}?episode=${i}`,
        });
      }
      return episodes;
    } catch (e) {
      return [];
    }
  },

  async getStreams(episodeId) {
    try {
      const parts = episodeId.split(":");
      const contentId = parts[0];
      const epNum = parts[1] || "1";
      return [
        {
          quality: "720p",
          url: `https://cdn.animeonsen.xyz/video/mp4-dash/${contentId}/${epNum}/manifest.mpd`,
          type: "sub",
          headers: {
            "Referer": "https://www.animeonsen.xyz/",
            "Origin": "https://www.animeonsen.xyz",
          },
          subtitles: [
            {
              file: `https://api.animeonsen.xyz/v4/subtitles/${contentId}/en-US/${epNum}`,
              label: "English",
            },
          ],
        },
      ];
    } catch (e) {
      return [];
    }
  },
};
