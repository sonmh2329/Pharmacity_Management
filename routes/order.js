const express = require('express');
const router = express.Router();
const orderController = require('../middleware/controllers/OrderController');


router.get('/', orderController.show)
      .post('/', orderController.saveInvoice);

      

module.exports = router;