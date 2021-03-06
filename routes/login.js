const express = require('express');
const router = express.Router();
const loginController = require('../middleware/controllers/LoginController');


router.get('/logout', loginController.logOut);
router.get('/', loginController.show);
router.post('/', loginController.authenticate);

module.exports = router;