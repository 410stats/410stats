const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const moment = require('moment');
const urlify = require('urlify');
const blackhole = require('stream-blackhole');
const fetch = require("node-fetch");

const RequestManager = require('./class/requestManager');
const QueryLogger = require('./class/queryLogger');
const config = require('./config/config.js');

const promiseTimeout = ms => new Promise(resolve => setTimeout(resolve, ms));

const version = "beta 2.31"

console.log(version);
console.log("WARNING : Le script necessite que votre timezone soit celle de Europe/Paris: Verifiez si le temps suivant est bien celui de la France");
console.log(moment().format('MMMM Do YYYY, HH:mm:ss'));

let connection;

function handleRequestError(error) {
  if (error.errno === 'ECONNRESET')
    console.error("Banni par JVC");
  if (error instanceof fetch.FetchError) {
    if (error.type === 'body-timeout' || error.type === 'request-timeout')
      console.error("Timeout");
  } else
    console.error("Request unhandled", error);
}

async function update410status(arrayStatus) {
  if (Array.isArray(arrayStatus) && arrayStatus.length > 0) {
    const dateActuelle = moment().format("YYYY-MM-DD HH:mm:ss");
    const baseQuery = 'INSERT INTO topics (`id`, `dateDerniereAnalyse`, `dateSupression`)' +
      'VALUES ? ON DUPLICATE KEY UPDATE ' +
      '`dateDerniereAnalyse`= VALUES(`dateDerniereAnalyse`),' +
      '`dateSupression` = IF(dateSupression IS NOT NULL, dateSupression, VALUES(`dateSupression`))';
    const insertArray = [];
    for (const status of arrayStatus) {
      queryLogger.add('checkTopicStatus');
      if (status.is410 === true) {
        insertArray.push([status.id, dateActuelle, dateActuelle]);
      } else {
        insertArray.push([status.id, dateActuelle, null]);
      }
    }
    try {
      await connection.query(baseQuery, [insertArray]);
    } catch (error) {
      console.log(error);
      console.log(insertArray);
    }
  } else {
    throw new TypeError("L'argument attendu est un array d'objet");
  }
}

async function updateConnected() {
  queryLogger.add('updateConnected');
  try {
    const response = await requestManager.request('/forums/0-51-0-1-0-1-0-blabla-18-25-ans.htm', config.target.desktop);
    if (response.ok) {
      const body = await response.text();
      const $ = cheerio.load(body);
      const nbConnected = parseInt($('span.nb-connect-fofo').text());
      if (Number.isNaN(nbConnected) === false) {
        console.log("Nombre connectés: " + nbConnected);
        await connection.query('INSERT INTO connected SET ?', {
          date: moment().format("YYYY-MM-DD HH:mm:ss"),
          connected: nbConnected
        });
      } else {
        console.error("Erreur lors du parsing de nombre de connectés");
      }
    } else if (response.status === 503 || response.status === 500)
      console.error("Error updateConnected:", response.status, " JVC down");
    else
      console.error("Error updateConnected:", response.status);
  } catch (error) {
    handleRequestError(error);
  }
}

async function updateTopicList() {
  const insertArray = [];
  try {
    const response = await requestManager.request('/forums/0-51-0-1-0-1-0-blabla-18-25-ans.htm', config.target.mobile);
    if (response.ok) {
      const body = await response.text();
      const $ = cheerio.load(body, {
        normalizeWhitespace: true,
      });
      $('ul.liste-topics').find('li').each(function() {
        const topicData = [];
        try {
          const url = $(this).find('a.a-topic').attr('href');
          //const regexResult = url.match(/\/forums\/\d{1,2}-51-(\d*)-.*\.htm/i);
          const regexResult = url.match(/\/forums\/42-51-(\d*)-.*\.htm/i); //Pour l'instant on ne gère pas topics avant Respawn
          if (regexResult != null) {
            const id = parseInt(regexResult[1]);
            const titre = $(this).find('a.a-topic > div.topic-inner > div.titre-topic').text().trim().split("\n")[0];
            const messages = parseInt($(this).find('a.a-topic > div.topic-inner > div.titre-topic > span.nb-comm-topic').text().slice(1, -1));
            const auteur = $(this).find('a.a-topic > div.topic-inner > div.info-post-topic > span.text-user').text().trim();
            let dateDernierMessage = null;
            if (messages === 0) { //Si 0 message = nouveau topic, donc on recupère la date de creation
              const textDateDernierMessage = $(this).find('a.a-topic > div.topic-inner > div.info-post-topic > time.date-post-topic').text().trim();
              if (textDateDernierMessage.length === 8) //Si la longueur du texte de dernier message = 8, ça veut dire que la date est au format heure et non jour
                dateDernierMessage = moment(textDateDernierMessage, 'HH:mm:ss').format("YYYY-MM-DD HH:mm:ss");
            }
            const dateNow = moment().format("YYYY-MM-DD HH:mm:ss");
            topicData.push(id, messages, titre, auteur, dateNow, dateNow, dateDernierMessage);
            insertArray.push(topicData);
          }
        } catch (error) {
          console.error('updateTopicList parsing error', error);
        }
      })
      if (insertArray.length > 0) {
        const baseQuery = 'INSERT INTO topics (`id`, `messages`, `titre`, `auteur`, `dateDerniereAnalyse`, `datePremierePage`, `dateCreation` )' +
          'VALUES ? ON DUPLICATE KEY UPDATE ' +
          '`titre`=VALUES(`titre`), `messages`= VALUES(`messages`), `dateDerniereAnalyse`= VALUES(`dateDerniereAnalyse`), `datePremierePage`= VALUES(`dateDerniereAnalyse`), ' +
          '`restaure` = IF(dateSupression IS NOT NULL AND NOW() > dateSupression + INTERVAL 3 minute , restaure + 1, restaure), ' +
          '`dateSupression` = IF(dateSupression IS NOT NULL AND NOW() > dateSupression + INTERVAL 3 minute, null, dateSupression)';
        await connection.query(baseQuery, [insertArray]);
        queryLogger.add('updateTopicList');
      } else {
        console.error('insertArrayEmpty');
      }
    } else if (response.status === 503 || response.status === 500)
      console.error("Error updateTopicList:", response.status, " JVC down");
    else
      console.error("Error updateTopicList:", response.status);
  } catch (error) {
    handleRequestError(error);
  }
}

async function updateCreationDate(id, titre) {
  const dateActuelle = moment().format("YYYY-MM-DD HH:mm:ss");
  try {
    const response = await requestManager.request(getTopicUrl(id, titre), config.target.mobile);
    if (response.ok) {
      const body = await response.text();
      const $ = cheerio.load(body, {
        normalizeWhitespace: true,
      });
      const dateText = $('body.mobile').find('div.post').first().find('div.date-post').text().trim();
      if (dateText) {
        const topicData = {};
        topicData.dateDerniereAnalyse = moment().format("YYYY-MM-DD HH:mm:ss");
        topicData.dateCreation = moment(dateText, 'DD MMMM YYYY à HH:mm:ss', 'fr').format("YYYY-MM-DD HH:mm:ss");
        const baseQuery = 'UPDATE topics SET ? WHERE ?'
        await connection.query(baseQuery, [topicData, {
          id: id
        }]);
        queryLogger.add('updateCreationDate');
      } else {
        console.log(id, titre);
        console.log(getTopicUrl(id, titre));
        console.log(body);
        console.error('errordate1: no date');
      }
    } else {
      if (response.status === 410) {
        await update410status([{
          id: id,
          is410: true
        }]);
      } else if (response.status === 503 || response.status === 500) {
        console.error("Error updateCreationDate:", response.status, " JVC down");
      } else {
        console.error("Error updateCreationDate");
      }
    }
  } catch (error) {
    handleRequestError(error);
  }
}

function getTopicUrl(id, titre) {
  const urlifyOptions = urlify.create({
    addEToUmlauts: true,
    szToSs: true,
    spaces: "-",
    nonPrintable: "-",
    trim: true,
    toLower: true
  });

  let titreUrl = urlifyOptions(titre);

  if (titreUrl.charAt(titreUrl.length - 1) === '-') {
    titreUrl = titreUrl.substr(0, titreUrl.length - 1);
  }

  return '/forums/42-51-' + id + '-1-0-1-0-' + titreUrl + '.htm';
}

async function checkTopicStatus(id, titre) {
  const dateActuelle = moment().format("YYYY-MM-DD HH:mm:ss");
  try {
    const response = await requestManager.request(getTopicUrl(id, titre), config.target.mobile)
    if (response.ok) {
      response.body.pipe(blackhole()); //Debug, sinon memory leak...
      return {
        id: id,
        is410: false
      };
    } else {
      if (response.status === 410) {
        return {
          id: id,
          is410: true
        };
      } else if (response.status === 503 || response.status === 500) {
        console.error("Error checkTopicStatus:", response.status, " JVC down");
      } else {
        console.error("Error checkTopicStatus", error);
      }
    }
    queryLogger.add('checkTopicStatus');
  } catch (error) {
    handleRequestError(error);
  }
}

//Process de topics à vérifier
async function processTopicStatus() {
  const baseQuery = 'SELECT id, titre FROM topics WHERE dateSupression IS NULL AND (' +
    '(`dateDerniereAnalyse` < NOW() - INTERVAL 2 minute AND datePremierePage > NOW() - INTERVAL 3 minute)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 5 minute AND datePremierePage > NOW() - INTERVAL 8 minute)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 9 minute AND datePremierePage > NOW() - INTERVAL 10 minute)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 15 minute AND datePremierePage > NOW() - INTERVAL 20 minute)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 25 minute AND datePremierePage > NOW() - INTERVAL 60 minute)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 2 hour AND datePremierePage > NOW() - INTERVAL 6 hour)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 6 hour AND datePremierePage > NOW() - INTERVAL 24 hour)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 1 day AND datePremierePage > NOW() - INTERVAL 7 day)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 7 day AND datePremierePage > NOW() - INTERVAL 1 month)' +
    ' || (`dateDerniereAnalyse` < NOW() - INTERVAL 1 month AND datePremierePage < NOW() - INTERVAL 1 month)' +
    ') ORDER BY datePremierePage DESC LIMIT 5';
  while (true) {
    const [results] = await connection.query(baseQuery);
    const promises = [];
    for (const topic of results) {
      promises.push(checkTopicStatus(topic.id, topic.titre));
    }
    let checkTopicResult = await Promise.all(promises);
    checkTopicResult = checkTopicResult.filter(result => result !== undefined);
    if (checkTopicResult.length > 0)
      await update410status(checkTopicResult);
    await promiseTimeout(6000);
  }
}

//Check les topics n'ayant pas de date de création et les ajoute a MySQL.
async function processDateCreation() {
  const baseQuery = 'SELECT id, titre FROM topics WHERE dateCreation IS NULL AND dateSupression IS NULL ORDER BY datePremierePage DESC LIMIT 5';
  while (true) {
    const [results] = await connection.query(baseQuery);
    const promises = [];
    for (const topic of results) {
      promises.push(updateCreationDate(topic.id, topic.titre));
    }
    await Promise.all(promises);
    await promiseTimeout(10000);
  }
}

async function init() {
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      database: config.database.database,
      password: config.database.password,
      debug: config.database.debug
    });
  } catch (err) {
    console.error("Mysql ERROR", err);
    process.exit(1)
  }

  setInterval(updateConnected, 60000);
  setInterval(updateTopicList, 4500);
  updateConnected();
  updateTopicList();

  processTopicStatus();
  processDateCreation();
}

const queryLogger = new QueryLogger();
const requestManager = new RequestManager();

init();
