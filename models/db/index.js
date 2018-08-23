const mongoose = require('mongoose');
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

const Service = require('../Service');

Service.on('index', function(err) {
  if (err) console.error(err); // error occurred during index creation
  else console.log('Service models indexed successfully');
})

module.exports = mongoose.connect(mongoURI, { useMongoClient: true });