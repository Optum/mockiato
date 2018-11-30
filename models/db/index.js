const mongoose = require('mongoose');
const debug  = require('debug')('default');

const mongoUser = process.env.MONGODB_USER;
const mongoPass = process.env.MONGODB_PASSWORD;
const mongoHost = process.env.MONGODB_HOST;

let mongoURI;
if (mongoUser && mongoPass) {
  mongoURI = 'mongodb://' + mongoUser + ':' + mongoPass + '@' + mongoHost;
}
else {
  mongoURI = 'mongodb://' + mongoHost;
}

const Service = require('../http/Service');

Service.on('index', function(err) {
  if (err) debug(err); // error occurred during index creation
  else debug('Service models indexed successfully');
})

module.exports = mongoose.connect(mongoURI, { useMongoClient: true });