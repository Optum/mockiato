const mongoose = require('mongoose');
const fs = require('fs');
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const router = express.Router();
const User = mongoose.model('User');

passport.use(new LocalStrategy(User.authenticate()));

router.post('/', function (req, res) {
  User.register(new User({ uid: req.body.username, mail: req.body.mail }), req.body.password, function (err, user) {
    if (err) {
      var errName = err.name;
      if (errName == 'UserExistsError') {
        res.append('redirectUrl', '/register?ErrHint=' + encodeURIComponent('DU'));
        res.status(302);
        res.send('Error : This username already exist.');
      }else{
        res.append('redirectUrl', '/register?ErrHint=' + encodeURIComponent('SE'));
        res.status(302);
        res.send('Something went wrong.');
      }
    }
    else {
      res.append('redirectUrl', '/#regS');
      res.status(302);
      res.send('User Registration Successful!');
    }
  });
});

router.get('/', function (req, res) {
  const htmlForm = fs.readFileSync('./assets/register.html');
  res.set('Content-Type', 'text/html');
  res.send(htmlForm);
});

module.exports = router;
