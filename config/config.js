
const defaultConfig = {
  target: {
    desktop: "jaimelesjv.com",
    mobile: "m.jaimelesjv.com"
  },
  database: {
    host: '127.0.0.1',
    user: 'dev',
    database: '410stats_dev',
    password: 'qsdqsdqsdqsd',
    debug: false
  },
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
