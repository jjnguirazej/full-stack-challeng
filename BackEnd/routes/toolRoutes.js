const express = require('express');
const toolController = require('../controllers/toolController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(toolController.getAllTools);

router
  .route('/:id')
  .get(toolController.getTool);

// router.use(authController.protect, authController.restrictTo('RESTWriter'));

router
  .route('/')
  .post(toolController.createTool);

router
  .route('/:id')
  .patch(toolController.updateTool)
  .delete(toolController.deleteTool);

module.exports = router;
