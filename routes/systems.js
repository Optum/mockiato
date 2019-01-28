const sysCtrl = require('../controllers/systemController');
const express = require('express');
const router = express.Router();

// middleware for token auth
router.use(tokenMiddleware);

router.get('/', sysCtrl.getSystems);
router.post('/', sysCtrl.addSystem);
router.delete('/:name', sysCtrl.delSystem);
router.get('/:name', sysCtrl.getOneSystem);
router.put('/:name', sysCtrl.updateGroup);

module.exports = router;
