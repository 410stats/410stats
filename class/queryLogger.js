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
      console.error("Warning : No check status for 2 minutes");
    }
    this.history = this.count;

    for (var key in this.count) {
      console.log(key + ": " + this.count[key] + " queries")
      this.count[key] = 0;
    }
  }
}

module.exports = QueryLogger;
