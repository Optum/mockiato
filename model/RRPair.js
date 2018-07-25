const mongoose = require('mongoose');

const rrSchema = new mongoose.Schema({
  verb: String,
  path: String,
  payloadType: String,
  // use schema-less data-types
  queries: mongoose.Schema.Types.Mixed,
  reqHeaders: mongoose.Schema.Types.Mixed,
  reqData: mongoose.Schema.Types.Mixed,
  resStatus: {
    // force integer only
    type: Number,
    get: function(v) { return Math.round(v); },
    set: function(v) { return Math.round(v); }
  },
  resHeaders: mongoose.Schema.Types.Mixed,
  resData: mongoose.Schema.Types.Mixed
});
mongoose.model('RRPair', rrSchema);

module.exports = {
  schema: rrSchema
};