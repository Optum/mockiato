const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const authType  = process.env.MOCKIATO_AUTH || 'local';

const userSchema = new mongoose.Schema({
  uid: { 
    type: String, 
    index: true
  },
  mail: String,
  password: String
});

if (authType === 'local') {
  userSchema.plugin(passportLocalMongoose, { usernameField: 'uid', usernameUnique: false });
}

module.exports = mongoose.model('User', userSchema);
