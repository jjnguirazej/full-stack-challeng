const mongoose = require('mongoose');
const validator = require('validator');

const ToolsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campo obrigatorio, Por favor preencha o campo de titulo!']
  },
  description: {
    type: String,
    required: [true, 'Campo obrigatorio, Por favor preencha o campo descricao']
  },
  link: {
    type: String,
    required: [true, 'Campo obrigatorio, Por favor preencha o campo de Link'],
    // validate: [validator.isURL(['http','https']), 'Please provide a valid link']
  },
  tags: {
    type: [String],
    required: [true, 'Campo obrigatorio, Por favor preencha o campo de tags']
  },

});


const Tools = mongoose.model('Tools', ToolsSchema);

module.exports = Tools;
