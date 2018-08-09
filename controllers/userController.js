const User = require('../models/User');

function getUser(req, res) {
  User.find({}, function(err, users)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(users);
  });
}

module.exports = {
  getUser: getUser
}