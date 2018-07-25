const mongoose = require('mongoose');
const db = require('../../model/db');
const fs = require('fs');

const express = require('express');
const router = express.Router();

const passport = require('passport');
const passportOpts = { session: false };
const LocalStrategy = require('passport-local');

const User = mongoose.model('User');
passport.use(new LocalStrategy(User.authenticate()));

router.post('/', function(req, res) {
  User.register(new User({ uid: req.body.username, mail: req.body.mail }), req.body.password, function(err, user) {
    if (err) {
      return console.error(err);
    }

    passport.authenticate('local')(req, res, function() {
      res.redirect('/');
    });
  });
});

router.get('/', function(req, res) {
  const htmlForm = fs.readFileSync('./assets/register.html');
  res.set('Content-Type', 'text/html');
  res.send(htmlForm);
});

module.exports = router;
