# SK Cloud Torrent

Eu sou muito preguiçoso para descobrir o que isso faz você mesmo

Você pode ser preguiçoso também, então aqui está:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/jessikp/SK-Cloud-Baixar-aio-bot)

Por favor, não inicie um download de torrent de teste no meu site, ele funciona, e você não precisa apenas desperdiçar ai espaço em disco. Tenha cuidado ao adicionar torrents à minha implantação, pois ela é implantada toda vez que eu coloco o código aqui para que seus downloads sejam interrompidos.

## TODO após implantação - deploy

### Para desativar o site

Se você apenas deseja que o bot do telegram  funcione, defina o valor de DISABLE_WEB env var para true. (true - verdadeiro)

### Para fazer o download do torrent funcionar:

Defina uma variável com a chave "SITE" e o valor é o link do seu site. por exemplo. "https://\<nome do projeto>.herokuapp.com". Isso é importante para manter o bot ativo ou o servidor irá parar após 30 minutos de inatividade.
   
### Para fazer a pesquisa funcionar:

A biblioteca usada para web scrapping dos sites de torrent requer um buildpack personalizado no heroku. Por padrão, a pesquisa acontecerá em sua implantação e você precisará configurar o buildpack conforme descrito abaixo. Mas se não quiser fazer isso, você pode especificar e env SEARCH_SITE e definir o valor para https://torrent-aio-bot.herokuapp.com/. A barra frwd no final é necessária. Isso fará com que todas as pesquisas passem por minha implantação e você não precisará configurar o buildpack.

Vá para a seção de pacotes de compilação em configurações e clique em adicionar buildpack e digite "https://github.com/jontewks/puppeteer-heroku-buildpack.git" como o url do buildpack e clique em salvar alterações. E então faça um git commit fictício para que o heroku o construa usando o buildpack desta vez. Em seguida, defina SEARCH_SITE env para o mesmo valor de SITE.

### Para fazer o upload do gdrive:

1. Acesse https://developers.google.com/drive/api/v3/quickstart/nodejs e clique em Enable the Drive API
copie o id do cliente e defina uma variável de ambiente no heroku com o nome CLIENT_ID e copie o segredo do cliente e defina outro env chamado CLIENT_SECRET.
    
2. Vá para https: // \ <nome do projeto> .herokuapp.com / drivehelp e cole seu ID de cliente e segredo e clique em "Obter código de autenticação", isso o redirecionará para o login e você obterá um código de autenticação após colar o login aquele código de autenticação no campo de código de autenticação e clique em "Gerar token - Generate token" ele lhe dará um token agora defina-os como a variável env CLIENT_ID, CLIENT_SECRET, AUTH_CODE e TOKEN.

3. Por padrão, os arquivos são carregados na raiz do drive, se você não quiser fazer o upload na pasta raiz, faça uma cópia da pasta com seu id e defina um env var GDRIVE_PARENT_FOLDER e um id de valor da pasta desejada. A id da pasta será a última parte da url, como na url "https://drive.google.com/drive/folders/1rpk7tGWs_lv_kZ_W4EPaKj8brfFVLOH-" a id da pasta é "1rpk7tGWs_lv_kZ_W4EPaKj8brfF".

4. Se você deseja suporte para o Team Drive, abra o seu Teamdrive e copie o ID da pasta do url, por exemplo. https://drive.google.com/drive/u/0/folders/0ABZHZpfYfdVCUk9PVA este é o link de um drive de equipe copie a última parte "0ABZHZpfYfdVCUk9PVA" este será seu GDRIVE_PARENT_FOLDER. Se você quiser que eles fiquem em uma pasta no teamdrive, abra a pasta e use o id dessa pasta.

5. Você está pronto para ir. O status do gdrive será mostrado no arquivo gdrive.txt quando você clicar em Abrir na página de downloads do site. O bot enviará automaticamente o link da unidade quando for carregado.

> Use este torrent para teste ou ao fazer o download para a unidade de configuração, ele é bem propagado e baixa em ~ 10s
>
> magnet:? xt = urn: btih: dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c & dn = Big + Buck + Bunny

### Para iniciar um bot torrent:

Defina uma variável de ambiente com a chave "TELEGRAM_TOKEN" e o token do seu bot como valor. [How to get token] (https://core.telegram.org/bots/#creating-a-new-bot)
Para definir uma variável de ambiente, vá para o painel do heroku, abra o aplicativo e vá para Configurações> Vars de configuração> Vars de configuração de revelação.

(Heroku Dashboard -- Settings > Config vars > Reveal Config vars.)

## Alterar os sites usados para pesquisa

Para alterar o site do pirate bay, visite o site que deseja usar, pesquise algo lá, copie o url, por exemplo. https://thepiratebay.org/search/whatisearched e substitua a pesquisa por {term} para que o url se pareça com https://thepiratebay.org/search/{term} e defina-o como env var PIRATEBAY_SITE

Da mesma forma, se você deseja alterar o site do limetorrents, visite o site que deseja usar e pesquise algo, substitua o que você pesquisou por {term} para que o URL final fique parecido com https://limetorrents.at/search?search= {term} e defina este valor para env var LIMETORRENT_SITE

Para 1337x env, o nome da var será O337X_SITE

## Endpoints da API

prefixo: https://<nome do projeto>.herokuapp.com/api/v1

### Para baixar:

| Ponto Final       | Parametros   |                                                               Returno |
| :---------------- | :----------: | --------------------------------------------------------------------: |
| /torrent/download | link: string | { error: bool, link: string, infohash: string errorMessage?: string } |
| /torrent/list     |     none     |                    {error: bool, torrents: [ torrent, torrent, ... ]} |
| /torrent/remove   | link: string |                                { error: bool, errorMessage?: string } |
| /torrent/status   | link: string |                 {error: bool, status: torrent, errorMessage?: string} |

o link é o uri magnético do torrent
```
torrent:  {
  magnetURI: string,
  speed: string,
  downloaded: string,
  total: string,
  progress: number,
  timeRemaining: number,
  redableTimeRemaining: string,
  downloadLink: string,
  status: string,
  done: bool
}
```

### Para pesquisar:

| Ponto Final     |            Parametros        |                                                         Returno |
| :-------------- | :--------------------------: | --------------------------------------------------------------: |
| /search/{site}  | query: string, site?: string | {error: bool, results: [ result, ... ], totalResults: number, } |
| /details/{site} |        query: string         |                                         {error: bool, torrent } |

consulta é o que você deseja pesquisar ou o link da página do torrent
site é o link para a página inicial do proxy a ser usado deve ter um '/' à direita

```
result: {
  name: string,
  link: string,
  seeds: number,
  details: string
}

torrent: {
  title: string,
  info: string,
  downloadLink: string,
  details: [ { infoTitle: string, infoText: string } ]
}
```

sites disponíveis piratebay, 1337x, limetorrent
