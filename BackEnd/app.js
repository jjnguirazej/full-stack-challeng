const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const toolRouter = require('./routes/toolRoutes');
const userRouter = require('./routes/userRoutes');


const app = express();

app.enable('trust proxy');

app.use(cors());

app.options('*', cors());

app.use(express.static(path.join(__dirname, 'public')));


app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Muitas solicitações deste IP, tente novamente em uma hora!'
});
app.use('/tools', limiter);


app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(mongoSanitize());

app.use(xss());

app.use(
  hpp({
    whitelist: [
      'tags'
    ]
  })
);

app.use(compression());


app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// ROUTAS
app.use('/tools', toolRouter);
app.use('/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Não é possível encontrar  ${req.originalUrl} neste servidor!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
