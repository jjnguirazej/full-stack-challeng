const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const tool = await Model.findByIdAndDelete(req.params.id);

    if (!tool) {
      return next(new AppError('Nenhuma tool encontrada', 404));
    }

    res.status(204).json({
      status: 'No Content',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const tool = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!tool) {
      return next(new AppError('Nenhuma tool encontrada', 404));
    }

    res.status(200).json({
      status: 'success',
      data: tool
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const tool = await Model.create(req.body);

    res.status(201).json({
      status: 'Created',
      data: tool
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const tool = await query;

    if (!tool) {
      return next(new AppError('Nenhuma tool encontrada', 404));
    }

    res.status(200).json({
      status: 'success',
      data: tool
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    
    const tool = await features.query;

   
    res.status(200).json({
      status: 'success',
      results: tool.length,
      data: tool
    });
  });
