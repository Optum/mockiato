const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', function(req, res) {
  mongoose.model('SUT').find({}, function(err, systems)	{
      if (err)	{
        handleError(err, res, 500);
        return;
      }

      res.json(systems);
  });
});

router.post('/', function(req, res) {
  const sut = {
    name: req.body.name
  };

  mongoose.model('SUT').findOne(sut, function(err, foundSUT, system) {
    if (err) {
      console.error(err);
      return;
    }
    if (!foundSUT) {
      mongoose.model('SUT').create(sut, function(err)	{
          console.log('New group created');
          if (err) {
            handleError(err, res, 500);
            return;
          }

      });
    }
    res.json(system);
  });
});

module.exports = router;
