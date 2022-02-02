const Tool = require('./../models/toolModel');
const tools = require('./handlerTools');

exports.getAllTools = tools.getAll(Tool);
exports.getTool = tools.getOne(Tool);
exports.createTool = tools.createOne(Tool);
exports.updateTool = tools.updateOne(Tool);
exports.deleteTool = tools.deleteOne(Tool);
