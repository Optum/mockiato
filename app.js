// get environment variables
require('dotenv').config();

// import dependencies
const express = require('express');
const app = express();
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');

// connect to database
const db = require('./model/db');
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log(`Successfully connected to Mongo (${process.env.MONGODB_HOST})`);

  // tell the app we're ready to start
  app.emit('ready');
});
app.on('ready', init);

function init() {
  // register middleware
  app.use(helmet());
  app.use(logger('dev'));
  app.use(bodyParser.json({ type: 'application/json' }));
  app.use(bodyParser.text({ type: [ 'application/xml', 'text/xml' ]}));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // expose swagger ui for internal api docs
  const YAML = require('yamljs');
  const apiDocs = YAML.load('./api-docs.yaml');
  const swaggerUI = require('swagger-ui-express');
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(apiDocs));

  // configure auth
  const passport = require('passport');
  const passportOpts = { session: false };
  const authType = process.env.MOCKIATO_AUTH || 'local';

  // setup local authentication
  if (authType === 'local') {
    console.log('Using local auth strategy');
    const local = require('./lib/auth/local');
    app.use('/register', local);
  }
  // setup ldap authentication
  else if (authType === 'ldapauth') {
    console.log('Using LDAP auth strategy');
    require('./lib/auth/ldap');
  }

  // route to retrieve login token
  const jwt = require('jsonwebtoken');
  const secret = process.env.MOCKIATO_SECRET;
  app.set('secret', secret);
  app.post('/api/login', passport.authenticate(authType, passportOpts),
    function(req, res) {
      const user = {
        uid: req.user.uid,
        mail: req.user.mail
      };

      if (authType === 'ldapauth') {
        // create new user on first login
        user.uid = req.user.sAMAccountName;
        mongoose.model('User').findOne({uid: user.uid}, function(err, foundUser) {
          if (err) {
            console.error(err);
            return;
          }
          if (!foundUser) {
            mongoose.model('User').create(user,
              function(err, newUser) {
                if (err) {
                  console.error(err);
                  return;
                }
                console.log('New user created: ' + newUser.uid);
              });
          }
        });
      }

      // create access token
      const token = jwt.sign(user, app.get('secret'), {
        expiresIn: '1d'
      });

      // return the token as JSON
      res.json({
        success: true,
        token: token
      });
  });

  // expose API and virtual SOAP / REST services
  const virtual = require('./routes/virtual');
  const api = require('./routes/api');

  // register SOAP / REST virts from DB
  virtual.registerAllRRPairsForAllServices();
  app.use('/api/services', api);
  app.use('/virtual', virtual.router);

  // expose api methods for users and groups
  const systems = require('./routes/systems');
  app.use('/api/systems', systems);

  const users = require('./routes/users');
  app.use('/api/users', users);

  // initialize MQ connection and register MQ virts from DB
  const mq = require('./lib/mq/virtual-mq');
  mq.connect();
  mq.registerAll();

  // email for contact form
  const contact = require('./routes/contact');
  app.use('/contact', contact);

  // ready for testing (see test/test.js)
  app.emit('started');
}

// polyfill for Object.entries()
if (!Object.entries)
  Object.entries = function(obj) {
    var ownProps = Object.keys(obj),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
};

module.exports = app;
