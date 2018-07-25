const mongoose = require('mongoose');

const sutSchema = new mongoose.Schema({
  name: String
});
mongoose.model('SUT', sutSchema);

module.exports = {
  schema: sutSchema
};