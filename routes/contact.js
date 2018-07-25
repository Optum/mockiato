const express = require('express');
const router = express.Router();
const mailer = require('nodemailer');
const transport = mailer.createTransport();

router.post('/', function(req, res) {
  transport.sendMail({
        from: req.body.contactEmail,
        to: 'SES-TestHarness_DL@ds.uhc.com',
        subject: '[Mockiato Feedback] Message from ' + req.body.contactName + 'on' + req.body.contactTeam,
        text: req.body.contactMsg
  },
  function(err, info) {
    if (err) {
      res.status(400);
      res.send(err);
      return console.error(err);
    }

    res.status(200);
    res.send(info);
  });
});

module.exports = router;
