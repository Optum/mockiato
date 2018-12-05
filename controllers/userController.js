const User = require('../models/common/User');

function getUsers(req, res) {
  User.find({}, function(err, users)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(users);
  });
}

function delUser(req, res) {
  User.findOneAndRemove({ uid : req.params.name }, function(err)	{
    if (err) {
      handleError(err, res, 400);
      return;
    }
    res.json({ 'message' : 'deleted  user', 'username' : req.params.name });
  });
}

module.exports = {
  getUsers: getUsers,
  delUser: delUser
}