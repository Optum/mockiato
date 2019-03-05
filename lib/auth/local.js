const mongoose = require('mongoose');
const debug = require('debug')('default');
const fs = require('fs');
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const router = express.Router();
const User = mongoose.model('User');

passport.use(new LocalStrategy(User.authenticate()));

router.post('/', function (req, res) {
  var uname, email, pwd;
  let bodyString = req.body;
  var vars = bodyString.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (pair[0] == 'username') {
            uname = decodeURIComponent(pair[1]);
        }else if(pair[0] == 'mail'){
            email = decodeURIComponent(pair[1]);
        }else{
          pwd = decodeURIComponent(pair[1]);
        }
    }
  User.register(new User({ uid: uname, mail: email }), pwd, function (err, user) {
    if (err) {
      var errName = err.name;
      if (errName == 'UserExistsError') {
        console.log(err);
        res.redirect('/register?ErrHint=' + encodeURIComponent('DU'));
      } else {
        console.log(err);
        res.redirect('/register?ErrHint=' + encodeURIComponent('SE'));
      }
    } else {
      res.redirect('/#regS');
    }
  });
});

router.get('/', function (req, res) {
  const htmlForm = fs.readFileSync('./assets/register.html');
  res.set('Content-Type', 'text/html');
  res.send(htmlForm);
});

module.exports = router;
