
const defaultConfig = {
  target: {
    ip: ["127.0.0.1", "127.0.0.2"],  //Les IP du load balancer du site cible. Il faudra faire un peu de recherche pour trouver celles du celèbre site de jeux vidéo !
    desktop: "www.jaimelesjeuxvideo.com", //L'adresse de la version desktop du site cible
    mobile: "m.jaimelesjeuxvideo.com" //L'adresse la version mobile du site cible
  },
  database: { //Paramètres de connexion de la base de données MySQL. Voir la doc de la lib utilisée pour une description complète: https://github.com/sidorares/node-mysql2
    host: '127.0.0.1',
    user: 'dev',
    database: '410stats_dev',
    password: 'qsdqsdqsdqsd',
    debug: false
  },
  proxy: {
    socks: ['socks5://myproxy:8080', 'socks4://myproxy2:8080'] //Liste d'url de proxy socks. Peut être laissé vide, et seulement votre IP sera utilisée pour les requètes
  }
};


const production = {
  database: {
    host: 'localhost',
    user: '410stats',
    database: '410stats',
    password: 'qsqsdqdddd',
    debug: false
  },
};

if (process.env.NODE_ENV === "production") {
  console.log("Production mode");
  module.exports = Object.assign({}, defaultConfig, production);
}
else {
  console.log("Dev mode");
  module.exports = defaultConfig;
}
