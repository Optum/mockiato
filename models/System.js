const mongoose = require('mongoose');

const sutSchema = new mongoose.Schema({
  name: String,
  members: {type : Array, "default" : [] }
});

module.exports = mongoose.model('SUT', sutSchema);
