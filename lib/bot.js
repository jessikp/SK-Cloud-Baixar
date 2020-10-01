const axios = require("axios");

const status = require("../utils/status");
const diskinfo = require("../utils/diskinfo");
const humanTime = require("../utils/humanTime");
const { uploadFileStream } = require("../utils/gdrive");

const api = process.env.SEARCH_SITE || "https://torrent-aio-bot.herokuapp.com/";
console.log("Using api: ", api);

const startMessage = `Olá, carrego o link magnético para o Gdrive e envio o link do GDrive`;

const searchRegex = /\/search (piratebay|limetorrent|1337x) (.+)/;
const detailsRegex = /\/details (piratebay|limetorrent|1337x) (.+)/;
const downloadRegex = /\/download (.+)/;
const statusRegex = /\/status (.+)/;
const removeRegex = /\/remove (.+)/;

const help = `Aqui estão alguns comandos para você começar:

Existem 3 sites disponíveis no movimento: piratebay, 1337x e limetorrent

/search {site} {query} - Para procurar torrents
consulta é o que você deseja pesquisar.
por exemplo:
    /search piratebay Chernobyl
    /search piratebay Chernobyl 720p
    /search 1337x Lust Stories

/details {site} {link} - Para obter detalhes do torrentlink é o link para a página do torrent.
por exemplo:
    /details piratebay https://bayunblocked net/torrent/.....
    /details 1337x https://1337x to/torrent/.....

/download {magnet link} - Para Iniciar o download
por exemplo:
    /download magnet:?xt=urn:btih:sdfasdfas

/status {magnet link} - TPara verificar o status de um torrent baixando
hash de informações é fornecido quando o download do torrent começa
Ex.
    /status magnet:?xt=urn:btih:sdfasdfas

/remove {magnet link} - To remove an already added torrent
Ex.
    /remove magnet:?xt=urn:btih:sdfasdfas

Para fazer upload de um arquivo, envie o arquivo para este bot; ele será carregado diretamente para o drive

Comandos de status do servidor

/server status
/server uptime
/server diskinfo


`;

function bot(torrent, bot) {
  bot.onText(/\/start/, async msg => {
    bot.sendMessage(msg.chat.id, startMessage);
});
bot.onText(/\/help/, async msg => {
    bot.sendMessage(msg.chat.id, help);
  }
);

  bot.on("message", async msg => {
    if (!msg.document) return;
    const chatId = msg.chat.id;
    const mimeType = msg.document.mimeType;
    const fileName = msg.document.file_name;
    const fileId = msg.document.file_id;

    bot.sendMessage(chatId, "Uploading file...");
    try {
      const uploadedFile = await uploadFileStream(fileName, bot.getFileStream(fileId));
      const driveId = uploadedFile.data.id;
      const driveLink = `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
      const publicLink = `${process.env.SITE}api/v1/drive/file/${fileName}?id=${driveId}`;
      bot.sendMessage(chatId, `${fileName} Carregado com sucesso\nDrive link: ${driveLink}\nPublic link: ${publicLink}`);
    } catch (e) {
      bot.sendMessage(chatId, e.message || "Um erro ocorreu");
    }
  });

  bot.onText(/\/server diskinfo (.+)/, async (msg, match) => {
    const from = msg.chat.id;
    const path = match[1];
    const info = await diskinfo(path);
    bot.sendMessage(from, info);
  });

  bot.onText(/\/server uptime/, async msg => {
    const from = msg.chat.id;
    bot.sendMessage(from, humanTime(process.uptime() * 1000));
  });

  bot.onText(/\/server status/, async msg => {
    const from = msg.chat.id;
    const currStatus = await status();
    bot.sendMessage(from, currStatus);
  });

  bot.onText(searchRegex, async (msg, match) => {
    var from = msg.from.id;
    var site = match[1];
    var query = match[2];

    bot.sendMessage(from, "Searching...");

    const data = await axios(`${api}api/v1/search/${site}?query=${query}`).then(({ data }) => data);

    if (!data || data.error) {
      bot.sendMessage(from, "Ocorreu um erro no servidor");
    } else if (!data.results || data.results.length === 0) {
      bot.sendMessage(from, "Nenhum resultado encontrado.");
    } else if (data.results.length > 0) {
      let results1 = "";
      let results2 = "";
      let results3 = "";

      data.results.forEach((result, i) => {
        if (i <= 2) {
          results1 += `Name: ${result.name} \nSeeds: ${result.seeds} \nDetails: ${result.details} \nLink: ${result.link} \n\n`;
        } else if (2 < i && i <= 5) {
          results2 += `Name: ${result.name} \nSeeds: ${result.seeds} \nDetails: ${result.details} \nLink: ${result.link} \n\n`;
        } else if (5 < i && i <= 8) {
          results3 += `Name: ${result.name} \nSeeds: ${result.seeds} \nDetails: ${result.details} \nLink: ${result.link} \n\n`;
        }
      });

      bot.sendMessage(from, results1);
      bot.sendMessage(from, results2);
      bot.sendMessage(from, results3);
    }
  });

  bot.onText(detailsRegex, async (msg, match) => {
    var from = msg.from.id;
    var site = match[1];
    var query = match[2];

    bot.sendMessage(from, "Loading...");

    const data = await axios(`${api}/details/${site}?query=${query}`).then(({ data }) => data);
    if (!data || data.error) {
      bot.sendMessage(from, "An error occured");
    } else if (data.torrent) {
      const torrent = data.torrent;
      let result1 = "";
      let result2 = "";

      result1 += `Title: ${torrent.title} \n\nInfo: ${torrent.info}`;
      torrent.details.forEach(item => {
        result2 += `${item.infoTitle} ${item.infoText} \n\n`;
      });
      result2 += "Magnet Link:";

      await bot.sendMessage(from, result1);
      await bot.sendMessage(from, result2);
      await bot.sendMessage(from, torrent.downloadLink);
    }
  });

  bot.onText(downloadRegex, (msg, match) => {
    var from = msg.from.id;
    var link = match[1];
    let messageObj = null;
    let torrInterv = null;

    const reply = async torr => {
      let mess1 = "";
      mess1 += `Name: ${torr.name}\n\n`;
      mess1 += `Status: ${torr.status}\n\n`;
      mess1 += `Size: ${torr.total}\n\n`;
      if (!torr.done) {
        mess1 += `Downloaded: ${torr.downloaded}\n\n`;
        mess1 += `Speed: ${torr.speed}\n\n`;
        mess1 += `Progress: ${torr.progress}%\n\n`;
        mess1 += `Time Remaining: ${torr.redableTimeRemaining}\n\n`;
      } else {
        mess1 += `Link: ${torr.downloadLink}\n\n`;
        clearInterval(torrInterv);
        torrInterv = null;
      }
      mess1 += `Magnet URI: ${torr.magnetURI}`;
      try {
        if (messageObj) {
          if (messageObj.text !== mess1) bot.editMessageText(mess1, { chat_id: messageObj.chat.id, message_id: messageObj.message_id });
        } else messageObj = await bot.sendMessage(from, mess1);
      } catch (e) {
        console.log(e.message);
      }
    };

    const onDriveUpload = (torr, url) => bot.sendMessage(from, `${torr.name} uploaded to drive\n${url}`);
    const onDriveUploadStart = torr => bot.sendMessage(from, `Uploading ${torr.name} to gdrive`);

    if (link.indexOf("magnet:") !== 0) {
      bot.sendMessage(from, "O link não é um link magnético");
    } else {
      bot.sendMessage(from, "Iniciando download...");
      try {
        const torren = torrent.download(
          link,
          torr => reply(torr),
          torr => reply(torr),
          onDriveUpload,
          onDriveUploadStart
        );
        torrInterv = setInterval(() => reply(torrent.statusLoader(torren)), 5000);
      } catch (e) {
        bot.sendMessage(from, "Um erro ocorreu\n" + e.message);
      }
    }
  });

  bot.onText(statusRegex, (msg, match) => {
    var from = msg.from.id;
    var link = match[1];

    const torr = torrent.get(link);
    if (link.indexOf("magnet:") !== 0) {
      bot.sendMessage(from, "O link não é um link magnético");
    } else if (!torr) {
      bot.sendMessage(from, "Não baixando, por favor, adicione");
    } else {
      let mess1 = "";
      mess1 += `Name: ${torr.name}\n\n`;
      mess1 += `Status: ${torr.status}\n\n`;
      mess1 += `Size: ${torr.total}\n\n`;
      if (!torr.done) {
        mess1 += `Downloaded: ${torr.downloaded}\n\n`;
        mess1 += `Speed: ${torr.speed}\n\n`;
        mess1 += `Progress: ${torr.progress}\n\n`;
        mess1 += `Time Remaining: ${torr.redableTimeRemaining}\n\n`;
      } else {
        mess1 += `Link: ${torr.downloadLink}\n\n`;
      }
      mess1 += `Magnet URI: ${torr.magnetURI}`;
      bot.sendMessage(from, mess1);
    }
  });

  bot.onText(removeRegex, (msg, match) => {
    var from = msg.from.id;
    var link = match[1];

    try {
      torrent.remove(link);
      bot.sendMessage(from, "Removido");
    } catch (e) {
      bot.sendMessage(from, `${e.message}`);
    }
  });
}

module.exports = bot;
