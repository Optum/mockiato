const mongoose = require('mongoose');

const sutSchema = new mongoose.Schema({
  name: String
});

module.exports = mongoose.model('SUT', sutSchema);
