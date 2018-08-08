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

require('./Service');
module.exports = mongoose.connect(mongoURI, { useMongoClient: true });