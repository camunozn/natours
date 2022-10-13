const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const AppError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewsRouter = require('./routes/reviewRoutes');

console.log(`Environment: ${process.env.NODE_ENV}`);

/////////////////////////////////////////////
// GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Set development loggin
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Limit requests from same IP (for brute force attacks)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP. Please try again in an hour.',
});
app.use('/api', limiter);

// Set body parser: for reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Test middleware to calculate request time
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   console.log(req.headers)
//   next();
// });

/////////////////////////////////////////////
// SERVER-SIDE RENDER
app.get('/', (req, res) => {
  res.status(200).render('base', {});
});

/////////////////////////////////////////////
// HANDLED ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewsRouter);

// UNHANDLED ROUTES
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// ERROR HANDLER MIDDLEWARE
app.use(errorHandler);

module.exports = app;
