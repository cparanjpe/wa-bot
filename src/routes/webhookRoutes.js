const express = require('express');
const router = express.Router();

// Import controllers
const {handleNewMessage} = require('../controllers/webhookController.js');


// Define user routes
router.post('/handleNewMessage',handleNewMessage);


module.exports = router;
