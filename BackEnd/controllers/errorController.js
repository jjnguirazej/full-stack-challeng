const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Inválido ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  const message = `Valor do campo: ${value}.  duplicado, Por favor, use outro valor!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Dados de entrada inválidos. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Token inválido. Por favor faça login novamente!', 401);

const handleJWTExpiredError = () =>
  new AppError('Seu token expirou! Por favor faça login novamente.', 401);

const sendErrorDev = (err, req, res) => {
 
  if (req.originalUrl.startsWith('/')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }


  console.error('ERROR ...', err);
  return res.status(err.statusCode).render('error', {
    title: 'Algo deu errado!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {

  if (req.originalUrl.startsWith('/api')) {
    
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    console.error('Algo deu errado...', err);

    return res.status(500).json({
      status: 'error',
      message: 'Algo deu errado!'
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Algo deu errado!',
      msg: err.message
    });
  }

  console.error('ERROR...', err);
 
  return res.status(err.statusCode).render('error', {
    title: 'Algo deu errado!',
    msg: 'Por favor tente de novo.'
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
