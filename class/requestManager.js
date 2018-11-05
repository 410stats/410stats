const fetch = require("node-fetch");
const rs = require('random-strings');
const random_ua = require('random-ua');
const SocksProxyAgent = require('socks-proxy-agent');
const config = require('../config/config.js');

class RequestManager {
  constructor() {
    this.instanceList = [];
    this.init();
  }

  init() {
    if (typeof config.proxy != 'undefined') {
      if (typeof config.proxy.socks != 'undefined') {
        for (const socksParams of config.proxy.socks) {
          console.log(socksParams);
          const socksAgent = new SocksProxyAgent(socksParams);
          this.addInstance(socksAgent);
        }
      }
    }
    this.addInstance();
    return;
  }

  addInstance(socksAgent) {
    try {
      for (const serverIp in config.target.ip) {
        const randomCookie = "coniunctio=" + rs.newBase64(52);
        const randomUA = random_ua.generate();
        const instance = {
          baseURL: 'http://' + config.target.ip[serverIp],
          headers: new fetch.Headers({
            "User-Agent": randomUA,
            "Cookie": randomCookie
          })
        };
        if (typeof socksAgent == "object") {
          console.log("IP JVC:", config.target.ip[serverIp], " avec proxy socks:", socksAgent.proxy.href);
          instance.httpAgent = socksAgent;
        } else
          console.log("IP JVC", config.target.ip[serverIp]);
        this.instanceList.push(instance);
      }
    } catch (error) {
      console.error("add instance", error);
    }
    return;
  }

  request(url, target) {
    /*const instanceListReady = this.instanceList.filter(instance => instance.ready == true);
    if (instanceListReady.length == 0) {
      console.log("no instance free");
    }*/ //Pas besoin pour l'instant
    const randomInstance = this.instanceList[Math.floor(Math.random() * this.instanceList.length)];
    const completeURL = randomInstance.baseURL + url;
    randomInstance.headers.set("Host", target);
    const options = {
      timeout: 5000,
      headers: randomInstance.headers
    };
    if (randomInstance.httpAgent)
      options.agent = randomInstance.httpAgent;
    return fetch(completeURL, options);
  }
}

module.exports = RequestManager;
