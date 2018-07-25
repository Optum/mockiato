const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', function(req, res) {
  mongoose.model('User').find({}, function(err, users)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(users);
  });
});

module.exports = router;
