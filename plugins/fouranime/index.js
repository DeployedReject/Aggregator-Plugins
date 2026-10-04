function decodeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default {
  id: "fouranime",
  name: "4Anime",
  baseUrl: "https://4anime.com.ro",
  version: "1.1.0",

  async search(query) {
    const form = new URLSearchParams();
    form.append("action", "ts_ac_do_search");
    form.append("ts_ac_query", query);

    const res = await fetch(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
      },
      body: form.toString(),
    });

    const data = await res.json();
    const items = data?.posts?.default?.all || [];

    return items.map((item) => {
      const imgMatch = item.thumbnail ? item.thumbnail.match(/src="([^"]+)"/) : null;
      return {
        id: item.permalink,
        title: decodeHtml(item.autotitle || ""),
        coverUrl: imgMatch ? imgMatch[1] : "",
        url: item.permalink,
      };
    });
  },

  async getHome() {
    const res = await fetch(this.baseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
      },
    });

    const html = await res.text();
    const items = [];
    const seen = new Set();

    const popRegex = /<a[^>]*class="series"[^>]*href="([^"]+)"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g;
    let match;

    while ((match = popRegex.exec(html)) !== null) {
      const url = match[1];
      const title = decodeHtml(match[3]?.trim() || "Untitled");
      const normKey = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normKey) && !seen.has(url)) {
        seen.add(normKey);
        seen.add(url);
        items.push({
          id: url,
          title,
          coverUrl: match[2],
          url,
        });
      }
    }

    const articleRegex = /<article[^>]*class="[^"]*bs[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<div class="tt">\s*([^\s<][^<]*)/g;
    let am;

    while ((am = articleRegex.exec(html)) !== null) {
      const epUrl = am[1];
      const cover = am[2];
      const title = decodeHtml(am[4]?.trim() || "Untitled");
      const normKey = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normKey) && !seen.has(epUrl)) {
        seen.add(normKey);
        seen.add(epUrl);
        items.push({
          id: epUrl,
          title,
          coverUrl: cover,
          url: epUrl,
        });
      }
    }

    return items;
  },

  async getEpisodes(mediaId) {
    let targetUrl = mediaId;
    let res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
      },
    });

    let html = await res.text();
    const seriesMatch = html.match(/href="(https:\/\/4anime\.com\.ro\/anime\/[^"]+)"/);
    if (!html.includes('class="epl-num"') && seriesMatch) {
      targetUrl = seriesMatch[1];
      res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
        },
      });
      html = await res.text();
    }

    const epRegex = /<li>\s*<a\s+href="([^"]+)"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<div\s+class="epl-num">([^<]+)<\/div>[\s\S]*?<div\s+class="epl-title">([^<]*)<\/div>/g;
    const episodes = [];
    let match;

    while ((match = epRegex.exec(html)) !== null) {
      episodes.push({
        id: match[1],
        number: parseFloat(match[3]) || episodes.length + 1,
        title: decodeHtml(match[4]?.trim() || match[2]?.trim()),
        url: match[1],
      });
    }

    return episodes.reverse();
  },

  async getStreams(episodeId) {
    const res = await fetch(episodeId, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
        Referer: this.baseUrl,
      },
    });

    const html = await res.text();
    const streams = [];
    const servers = [];
    const seenUrls = new Set();

    const groupRegex = /<div class="server-group">([\s\S]*?)<\/div>\s*<\/div>/g;
    let gm;

    while ((gm = groupRegex.exec(html)) !== null) {
      const groupContent = gm[1];
      const isDub = /DUB:/i.test(groupContent);
      const type = isDub ? "dub" : "sub";
      const btnRegex = /<button[^>]*class="[^"]*server-button[^"]*"[^>]*onclick="loadMi\(\{\s*value:\s*'([^']+)'\s*\}\);"[^>]*>\s*([^<]+)\s*<\/button>/g;
      let bm;

      while ((bm = btnRegex.exec(groupContent)) !== null) {
        try {
          const decoded = atob(bm[1]);
          const srcMatch = decoded.match(/src="([^"]+)"/);
          if (srcMatch) {
            let s = srcMatch[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
            if (s.startsWith("//")) s = `https:${s}`;
            servers.push({
              name: bm[2].trim(),
              src: s,
              type,
            });
          }
        } catch (e) {}
      }
    }

    if (servers.length === 0) {
      const defaultIframe = html.match(/<div[^>]*class="[^"]*player-embed[^"]*"[^>]*>[\s\S]*?<iframe[^>]+src="([^">]+)"/);
      if (defaultIframe) {
        let s = defaultIframe[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
        if (s.startsWith("//")) s = `https:${s}`;
        servers.push({ name: "Default", src: s, type: "sub" });
      }

      const btnRegex = /<button[^>]*class="[^"]*server-button[^"]*"[^>]*onclick="loadMi\(\{\s*value:\s*'([^']+)'\s*\}\);"[^>]*>\s*([^<]+)\s*<\/button>/g;
      let btnMatch;

      while ((btnMatch = btnRegex.exec(html)) !== null) {
        try {
          const decoded = atob(btnMatch[1]);
          const srcMatch = decoded.match(/src="([^"]+)"/);
          if (srcMatch) {
            let s = srcMatch[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
            if (s.startsWith("//")) s = `https:${s}`;
            servers.push({
              name: btnMatch[2].trim(),
              src: s,
              type: "sub",
            });
          }
        } catch (e) {}
      }
    }

    for (const s of servers) {
      let playerUrl = s.src;
      if (playerUrl.startsWith("//")) playerUrl = `https:${playerUrl}`;

      try {
        const pRes = await fetch(playerUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
            Referer: episodeId,
          },
        });
        const pHtml = await pRes.text();

        const embedIframe = pHtml.match(/<iframe[^>]+src="([^">]+)"/);
        if (embedIframe) {
          let embedUrl = embedIframe[1].replace(/&#038;/g, "&").replace(/&amp;/g, "&");
          if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`;

          const sType = s.type || (embedUrl.includes("/dub") ? "dub" : "sub");

          if (!seenUrls.has(embedUrl)) {
            seenUrls.add(embedUrl);
            streams.push({
              quality: `[${sType.toUpperCase()}] ${s.name} (Embed)`,
              url: embedUrl,
              type: sType,
            });
          }

          if (embedUrl.includes("megavid.buzz")) {
            try {
              const srcApi = `${embedUrl.replace(/\/$/, "")}/source`;
              const sRes = await fetch(srcApi, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
                  Referer: embedUrl,
                  Accept: "application/json",
                },
              });
              const sData = await sRes.json();
              if (sData?.status === "ok" && sData.source && !seenUrls.has(sData.source)) {
                seenUrls.add(sData.source);
                const subTracks = Array.isArray(sData.tracks)
                  ? sData.tracks
                      .filter((t) => t.file)
                      .map((t) => ({ file: t.file, label: t.label || "Sub" }))
                  : undefined;
                streams.push({
                  quality: `[${sType.toUpperCase()}] ${s.name} 1080p (HLS)`,
                  url: sData.source,
                  subtitles: subTracks,
                  type: sType,
                });
              }
            } catch (err) {}
          }

          if (embedUrl.includes("megaplay.su")) {
            try {
              const eRes = await fetch(embedUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
                  Referer: this.baseUrl,
                },
              });
              const eHtml = await eRes.text();

              const m3u8Match = eHtml.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
              if (m3u8Match && !seenUrls.has(m3u8Match[0])) {
                seenUrls.add(m3u8Match[0]);
                streams.push({
                  quality: `[${sType.toUpperCase()}] ${s.name} (HLS)`,
                  url: m3u8Match[0],
                  type: sType,
                });
              }
            } catch (err) {}
          }

          continue;
        }

        const sourcesMatch = pHtml.match(/var\s+sources\s*=\s*(\[[^\]]+\])/);
        if (sourcesMatch) {
          try {
            const raw = JSON.parse(sourcesMatch[1]);
            for (const item of raw) {
              if (item.file && !item.file.includes("googlevideo.com") && !seenUrls.has(item.file)) {
                seenUrls.add(item.file);
                streams.push({
                  quality: `[${(s.type || "sub").toUpperCase()}] ${s.name} ${item.label || item.type || ""}`.trim(),
                  url: item.file,
                  type: s.type || "sub",
                });
              }
            }
          } catch (e) {}
        }

        if (!seenUrls.has(playerUrl)) {
          seenUrls.add(playerUrl);
          streams.push({
            quality: `[${(s.type || "sub").toUpperCase()}] ${s.name} [Player Embed]`,
            url: playerUrl,
            type: s.type || "sub",
          });
        }
      } catch (e) {
        if (!seenUrls.has(playerUrl)) {
          seenUrls.add(playerUrl);
          streams.push({
            quality: `[${(s.type || "sub").toUpperCase()}] ${s.name} [Player Embed]`,
            url: playerUrl,
            type: s.type || "sub",
          });
        }
      }
    }

    return streams;
  },
};
