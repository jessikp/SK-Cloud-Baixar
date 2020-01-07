const WebTorrent = require("webtorrent");
const fs = require("fs");
const prettyBytes = require("../utils/prettyBytes");
const humanTime = require("../utils/humanTime");
const mkfile = require("../utils/mkfile");
const downloadsLoad = require("../downloads.json");

class Torrent {
  constructor() {
    this.downloads = downloadsLoad;
    this.client = new WebTorrent();
  }

  updateDownloads = (id, data) => {
    this.downloads[id] = { ...this.downloads[id], ...data };
    const downloads = JSON.stringify(this.downloads);
    fs.writeFileSync("./downloads.json", downloads);
  };

  statusLoader = torrent => {
    return {
      infoHash: torrent.infoHash,
      magnetURI: torrent.magnetURI,
      name: torrent.name,
      speed: `${prettyBytes(torrent.downloadSpeed)}/s`,
      downloaded: prettyBytes(torrent.downloaded),
      total: prettyBytes(torrent.length),
      progress: parseInt(torrent.progress * 100),
      timeRemaining: parseInt(torrent.timeRemaining),
      redableTimeRemaining: humanTime(torrent.timeRemaining),
      files: torrent.files.map(file => ({
        name: file.name,
        downloaded: prettyBytes(file.downloaded),
        total: prettyBytes(file.length),
        progress: parseInt(file.progress * 100),
        path: file.path,
        downloadLink: "/api/v1/downloads/" + file.path
      }))
    };
  };

  addTorrent = link => {
    if (!this.client.get(link)) {
      const torrent = this.client.add(link);
      torrent.once("done", () => this.saveFiles(torrent));
    }
  };

  removeTorrent = link => {
    if (this.client.get(link)) {
      this.client.remove(link);
    }
  };

  getTorrent = link => {
    let torrent = this.client.get(link);
    if (torrent) {
      return this.statusLoader(torrent);
    } else {
      return null;
    }
  };

  listTorrents = () => {
    return this.client.torrents.map(torrent => this.statusLoader(torrent));
  };

  listDownloads = () => {
    return Object.entries(this.downloads).map(v => v[1]);
  };

  saveFiles = torrent => {
    const torrentStatus = this.statusLoader(torrent);
    this.updateDownloads(torrent.infoHash, {
      status: "Saving files...",
      ...torrentStatus
    });
    torrent.files.forEach((file, i) => {
      const filePath = "./downloads/" + torrent.infoHash + file.path;
      mkfile(filePath);
      let toFile = fs.createWriteStream(filePath);
      let torrentFile = file.createReadStream();
      torrentFile.pipe(toFile);
      this.updateDownloads(torrent.infoHash, {
        status: `${i + 1} of ${torrent.files.length} saved`
      });
    });
    this.updateDownloads(torrent.infoHash, {
      status: `Files saved, avail at: /api/v1/downloads/${torrent.infoHash}/`
    });
  };
}

module.exports = Torrent;