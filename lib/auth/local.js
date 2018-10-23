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
  User.register(new User({ uid: req.body.username, mail: req.body.mail }), req.body.password, function (err, user) {
    if (err) {
      var errName = err.name;
      if (errName == 'UserExistsError') {
        console.log(err);
        res.redirect('/register?ErrHint=' + encodeURIComponent('DU'));
      }else{
        console.log(err);
        res.redirect('/register?ErrHint=' + encodeURIComponent('SE'));
      }
    }
    passport.authenticate('local')(req, res, function () {
      res.redirect('/#regS');
    });
  });
});

router.get('/', function (req, res) {
  const htmlForm = fs.readFileSync('./assets/register.html');
  res.set('Content-Type', 'text/html');
  res.send(htmlForm);
});

module.exports = router;
