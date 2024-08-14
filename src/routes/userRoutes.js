const express = require('express');
const router = express.Router();

// Import controllers
const {updateProfile,logWorkout,generateReport,userQuery,qnaDocQuery} = require('../controllers/userController.js');


// Define user routes
router.post('/updateProfile',updateProfile);
router.post('/logWorkout',logWorkout);
router.post('/generateReport',generateReport);
router.post('/userQuery',userQuery);
router.post('/qnaDocQuery',qnaDocQuery)


module.exports = router;
