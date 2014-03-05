(function() {
  var settings = require('./settings.json');
  var collections = ["users", "useridentities", "useremails", "sessions", "files", "filerevisions", "fileusers"];
  var db = require("mongojs").connect(settings.mongo.url, collections);
  module.exports = db;
}).call(this);