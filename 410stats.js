const osmosis = require('osmosis');
const axios = require('axios');
const async = require('async');
const mysql = require('mysql2');
const moment = require('moment');
const randomUseragent = require('random-useragent');
const http = require('http');
const urlify = require('urlify');

const config = require('./config/config.js');

const version = "beta 2.1.9"

console.log(version);
console.log("WARNING : Le script necessite que votre timezone soit celle de Paris: Verifiez si le temps suivant est bien celui de la France");
console.log(moment().format('MMMM Do YYYY, HH:mm:ss'));

const connection = mysql.createConnection({
  host: config.database.host,
  user: config.database.user,
  database: config.database.database,
  password: config.database.password,
  debug: config.database.debug
});

console.log("Initiate MySQL connection");

class RequestManager {
  constructor() {
    this.instanceList = [];
  }

  async init() {
    console.log("initiate RequestManager")
    const promises = [];
    promises.push(this.addInstance());
    await Promise.all(promises);

    return;
  }

  async addInstance() {
    try {
      const httpAgent = new http.Agent({ keepAlive: true });
      httpAgent.maxSockets = 10; //N'autorise qu'une connection ouverte. Utilisé pour être plus discret (sinon 10 requètes parrèles lanceront 10 nouvelles connexions)
      const axiosInstance = axios.create({
        httpAgent: httpAgent,
      });
      axiosInstance.defaults.headers.common["User-Agent"] = randomUseragent.getRandom();
      const newInstance = { httpAgent: httpAgent, axiosInstance: axiosInstance, ready: true };
      this.instanceList.push(newInstance);
    } catch (error) {
      console.log("add instance", error);
    }
    return;
  }

  get axios() {
    const instanceListReady = this.instanceList.filter(instance => instance.ready == true);
    if (instanceListReady.length == 0)
      console.log("no instance free");
    return instanceListReady[Math.floor(Math.random() * instanceListReady.length)].axiosInstance;
  }

}

class QueryLogger {
  constructor() {
    this.count = {
      'updateConnected': 0,
      'updateCreationDate': 0,
      'checkTopicStatus': 0,
      'updateTopicList': 0,
      'postArchive_is': 0
    };
    this.history = null;
    console.log("query logger init");
    setInterval(this.update.bind(this), 60000); //1 minute
  }

  add(id) {
    if (typeof(this.count[id]) !== 'undefined') {
      this.count[id]++;
    }
  }
  update() {
    console.log(moment().format('MMMM Do YYYY, HH:mm:ss'));
    if (this.history != null && this.history.checkTopicStatus == 0 && this.count.checkTopicStatus == 0) {
      //console.error("FATAL ERROR : Closing SQL connection and Node");
      console.error("Warning : No check status for 2 minutes");
      /*connection.end(function(err) {
        process.exitCode = 1;
      });*/
    }
    this.history = this.count;

    for (var key in this.count) {
      console.log(key + ": " + this.count[key] + " queries")
      this.count[key] = 0;
    }
  }
}

function updateConnected() {
  queryLogger.add('updateConnected');
  requestManager.axios.get('http://' + config.target.desktop + '/forums/0-51-0-1-0-1-0-blabla-18-25-ans.htm', {
      responseType: 'document'
    })
    .then(function(response) {
      osmosis
        .parse(response.data)
        .find('span.nb-connect-fofo')
        .set('span')
        .data(function(item) {
          const str = parseInt(item.span.slice(0, -((" connecté(s)").length)));
          connection.query('INSERT INTO connected SET ?', {
            date: moment().format("YYYY-MM-DD HH:mm:ss"),
            connected: str
          }, function(error, results, fields) {
            if (error) throw error;
            if (error) console.error('error6: ', error);
            console.log("Connected: " + str);
          });
        })
        .error(function(msg) {
          console.error(msg);
        });
    })
    .catch(function(error) {
      if (error && error.response && (error.response.status == 503 || error.response.status == 500))
        console.error("Error updateConnected:", error.response.status, " JVC down");
      else if (error.errno == 'ECONNRESET')
        console.error("Banni par JVC");
      else
        console.error("Error updateConnected unhandled", error);
    });
}

async function updateTopicList() {
  var insertArray = [];
  requestManager.axios.get('http://' + config.target.mobile + '/forums/0-51-0-1-0-1-0-blabla-18-25-ans.htm', {
      responseType: 'document'
    })
    .then(function(response) {
      const serverDay = moment(response.headers.date).startOf('day');
      new Promise(resolve => {
          osmosis
            .parse(response.data)
            .find('body.mobile > section#content-fmobile > div.bloc-topics > ul.liste-topics > li')
            .set({
              'url': 'a.a-topic @href',
              'titre': 'a.a-topic > div.topic-inner > div.titre-topic',
              'messages': 'a.a-topic > div.topic-inner > div.titre-topic > span.nb-comm-topic',
              'auteur': 'a.a-topic > div.topic-inner > div.info-post-topic > span.text-user',
              'dateDernierMessage': 'a.a-topic > div.topic-inner > div.info-post-topic > time.date-post-topic'
            })
            .data(function(item) {
              const topicData = [];
              const regexResult = item.url.match(/\/forums\/42-51-(\d*)-.*\.htm/i);
              if (regexResult != null) {
                topicData.push(parseInt(regexResult[1]));
                topicData.push(parseInt(item.messages.slice(1, -1)));
                topicData.push(item.titre.split("\n")[0]);
                topicData.push(item.auteur);
                topicData.push(moment().format("YYYY-MM-DD HH:mm:ss")); //Maintenant
                topicData.push(moment().format("YYYY-MM-DD HH:mm:ss"));
                if (topicData[1] == 0) {
                  let topicCreationDate = moment(item.dateDernierMessage, 'HH:mm:ss');
                  //console.error("serverDay before");
                  //console.error("creation date before", topicCreationDate);

                  //Tentative de debug du bug de quand la date du server JVC est différente de la date réelle (echec)

                  // topicCreationDate = serverDay.set({
                  //   'hour': topicCreationDate.get('hour'),
                  //   'minute': topicCreationDate.get('minute'),
                  //   'second': topicCreationDate.get('second')
                  // });
                  // if (topicCreationDate > moment()) {
                  //   console.error("date dans le futur :");
                  //   console.error("date serveur original", moment(response.headers.date));
                  //   console.error("creation date original", moment(item.dateDernierMessage));
                  //   console.error("serverday after", serverDay);
                  //   console.error("creation date after", topicCreationDate);
                  //   console.error("now", moment());
                  // }

                  topicData.push(topicCreationDate.format("YYYY-MM-DD HH:mm:ss"));
                } else {
                  topicData.push(null);
                }
                insertArray.push(topicData);
              } else {

              }
            })
            .error(function(msg) {
              console.error('updateTopicList error', msg);
              return Promise.resolve(1)
            })
            .done(function() {
              if (insertArray.length > 0) {
                var baseQuery = 'INSERT INTO topics (`id`, `messages`, `titre`, `auteur`, `dateDerniereAnalyse`, `datePremierePage`, `dateCreation` ) VALUES ? ON DUPLICATE KEY UPDATE `titre`=VALUES(`titre`), `messages`= VALUES(`messages`), `dateDerniereAnalyse`= VALUES(`dateDerniereAnalyse`), `datePremierePage`= VALUES(`dateDerniereAnalyse`), `restaure` = IF(dateSupression IS NOT NULL AND NOW() > dateSupression + INTERVAL 3 minute , restaure + 1, restaure), `dateSupression` = IF(dateSupression IS NOT NULL AND NOW() > dateSupression + INTERVAL 3 minute, null, dateSupression)';
                connection.query(baseQuery, [insertArray], function(error, results, fields) {
                  if (error) console.error('error query: ', insertArray);
                  else {
                    queryLogger.add('updateTopicList');
                    return Promise.resolve()
                  }
                });
              } else {
                console.error('insertArrayEmpty');
              }
            });
        })
        .catch(function(error) {
          if (error && error.response && (error.response.status == 503 || error.response.status == 500))
            console.error("Error updateTopicList:", error.response.status, " JVC down");
          else if (error.errno == 'ECONNRESET')
            console.error("Banni par JVC");
          else
            console.error("Error updateTopicList unhandled", error);

        });
    });
}

function updateCreationDate(id, callback) {
  const dateActuelle = moment().format("YYYY-MM-DD HH:mm:ss");
  requestManager.axios.get('http://' + config.target.mobile + '/forums/42-51-' + id + '-1-0-1-0-e.htm', {
      responseType: 'document'
    })
    .then(function(response) {
      const chunks = [];
      osmosis
        .parse(response.data)
        .find('body.mobile > section#content-fmobile > div.bloc-messages > div.liste-messages > div.post:first-child')
        .set({
          'date': 'div.head > div.bloc-info-post > div.date-post',
        })
        .data(function(item) {
          var topicData = {};
          if (item.date) {
            topicData.dateDerniereAnalyse = moment().format("YYYY-MM-DD HH:mm:ss");
            topicData.dateCreation = moment(item.date, 'DD MMMM YYYY à HH:mm:ss', 'fr').format("YYYY-MM-DD HH:mm:ss");

            var baseQuery = 'UPDATE topics SET ? WHERE ?'
            connection.query(baseQuery, [topicData, {
              id: id
            }], function(error, results, fields) {
              //if (error) throw error;
              if (error) console.error('errordate1: ', error);
              else queryLogger.add('updateCreationDate');
              return callback();
            });
          } else {
            return callback();
          }
          //console.log(item);
          //console.log(topicData);
        })
        .error(function(msg) {
          console.error('errordate2: ', msg, body.toString('utf8'));
          return callback();
        })
    })
    .catch(function(error) {
      if (error.response) {
        if (error.response.status == 410) { // (I don't know if the 3xx responses come here, if so you'll want to handle them appropriately
          //console.log('410');
          connection.query('UPDATE topics SET ? WHERE ? ', [{
            dateDerniereAnalyse: dateActuelle,
            dateSupression: dateActuelle
          }, {
            id: id
          }], function(error, results, fields) {
            if (error) console.error('error5: ', error)
            else {
              queryLogger.add('updateCreationDate');
            }
          });
        } else if (error.response.status == 503 || error.response.status == 500) {
          console.error("Error updateCreationDate:", error.response.status, " JVC down");
        }
      } else if (error.errno == 'ECONNRESET') {
        console.error("Banni par JVC");
      } else {
        console.error("Error updateCreationDate unhandled", error);
      }
      return callback();
    });
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

  if (titreUrl.charAt(titreUrl.length - 1) == '-') {
    titreUrl = titreUrl.substr(0, titreUrl.length - 1);
  }

  return '/forums/42-51-' + id + '-1-0-1-0-' + titreUrl + '.htm';
}

function checkTopicStatus(id, titre, callback) {
  queryLogger.add('checkTopicStatus');
  const dateActuelle = moment().format("YYYY-MM-DD HH:mm:ss");
  requestManager.axios.get('http://' + config.target.mobile + getTopicUrl(id, titre), {
      responseType: 'document'
    })
    .then(function(response) {
      connection.query('UPDATE topics SET ? WHERE ? ', [{
        dateDerniereAnalyse: dateActuelle
      }, {
        id: id
      }], function(error, results, fields) {
        if (error) console.error('error4: ', error);
        return callback();
      });
    })
    .catch(function(error) {
      if (error.response) {
        if (error.response.status == 410) {
          connection.query('UPDATE topics SET ? WHERE ? ', [{
            dateDerniereAnalyse: dateActuelle,
            dateSupression: dateActuelle
          }, {
            id: id
          }], function(error, results, fields) {
            if (error) console.error('error3: ', error);
            return callback();
          });
        } else if (error.response.status == 503 || error.response.status == 500) {
          console.error("Error updateCreationDate:", error.response.status, " JVC down");
          return callback();
        }
      } else if (error.errno == 'ECONNRESET') {
        console.error("Banni par JVC");
        return callback();
      } else {
        console.error("Error checkTopicStatus", error);
        return callback();
      }
    });
}

//Process de topics à vérifier
function processTopicStatus() {
  async.forever(
    function(next) {
      baseQuery = 'SELECT id, titre FROM topics WHERE dateSupression IS NULL AND (' +
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
        ') ORDER BY datePremierePage DESC LIMIT 10';
      connection.query(baseQuery, function(error, results, fields) {
        if (error) {
          console.error('error2: ', error);
          throw error;
        }
        async.each(results, function(topic, callbackEachSeries) {
            checkTopicStatus(topic.id, topic.titre, function() {
              callbackEachSeries();
            });
          },
          function(err) {
            if (err) {
              setTimeout(function() {
                next();
              }, 1000);
              //console.error('Fail processTopicStatus');
            } else {
              setTimeout(function() {
                next();
              }, 1000);
            }
          }
        );
      });
    },
    function(err) {
      if (err) {
        console.error('A file failed to process');
      } else {
        console.error('All files have been processed successfully');
      }
      // if next is called with a value in its first parameter, it will appear
      // in here as 'err', and execution will stop.
    }
  );
}

//Check les topics n'ayant pas de date de création et les ajoute a MySQL.
function processDateCreation() {
  async.forever(
    function(next) {
      connection.query('SELECT id FROM topics WHERE dateCreation IS NULL AND dateSupression IS NULL ORDER BY datePremierePage DESC LIMIT 10', function(error, results, fields) {
        if (error) console.error('error1: ', error);
        async.eachSeries(results, function(topic, callback) {
            updateCreationDate(topic.id, function() {
              callback();
            });
          },
          function(err) {
            if (err) {
              console.error('A file failed to process');
            } else {
              //console.log('All files have been processed successfully');
            }
            setTimeout(function() {
              next();
            }, 6000);
          }
        );
      })
    },
    function(err) {
      if (err) {
        console.error('error processDateCreation');
      }
    }
  );
}

async function init() {
  await requestManager.init();

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
