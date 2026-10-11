# Aggregator Plugins (Sample Repository)

> Official reference and sample plugin repository for the **Aggregator** media aggregation ecosystem.

This repository serves as a **sample showcase repository** containing reference implementations of legal, safe, and public-domain media source plugins.

---

## Included Sample Plugins

### [Internet Archive](plugins/internet-archive) (`internet-archive`)
- **Source:** [archive.org](https://archive.org)
- **Content:** Public domain movies, classic archival films, historical educational videos, and cultural footage.
- **Protocol:** Public Internet Archive metadata API and direct MP4 media streams.

---

## Plugin File Structure

Every plugin directory in this repository consists of two files:

```
plugins/
└── your-plugin-id/
    ├── plugin.json       # Metadata descriptor
    └── index.js          # ES6 Module plugin implementation
```

### `plugin.json`
```json
{
  "id": "internet-archive",
  "name": "Internet Archive",
  "description": "Public domain movies and cultural archives from archive.org",
  "baseUrl": "https://archive.org",
  "version": "1.0.0",
  "author": "Community",
  "channel": "STABLE"
}
```

### `index.js`
Plugins implement standard async functions:
- `getHome()`: Returns default or trending content.
- `search(query)`: Searches the source for items matching `query`.
- `getEpisodes(mediaId)`: Enumerates available video tracks or parts for a selected title.
- `getStreams(episodeId)`: Resolves direct streaming media URLs or background sniffing patterns.

---

## Self-Hosting Your Own Repository

Anyone can fork or create their own plugin repository and connect it to a self-hosted [Aggregator-Backend](https://github.com/DeployedReject/Aggregator-Backend) registry by setting the `APP_GIT_REMOTE_URL` environment variable.

Users can also load `.js` plugins locally directly within the **Aggregator** browser extension without hosting a Git repository.

---

## License

This repository and its sample plugins are licensed under the [GNU General Public License v3.0](LICENSE).
