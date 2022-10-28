const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const AppError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewsRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

console.log(`Environment: ${process.env.NODE_ENV}`);

/////////////////////////////////////////////
// GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https://*.stripe.com'],
      connectSrc: [
        "'self'",
        "'unsafe-inline'",
        'data:',
        'blob:',
        'https://unpkg.com',
        'https://tile.openstreetmap.org',
        'https://*.stripe.com',
        'ws://127.0.0.1:*/',
      ],
      scriptSrc: [
        "'self'",
        'https://unpkg.com/',
        'https://tile.openstreetmap.org',
        'https://unpkg.com/leaflet@1.9.2/dist/leaflet.js',
        'https://cdn.jsdelivr.net/npm/axios@1.1.2/dist/axios.min.js',
        'https://js.stripe.com/v3/',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://unpkg.com/',
        'https://tile.openstreetmap.org',
        'https://fonts.googleapis.com/',
        'https://unpkg.com/leaflet@1.9.2/dist/leaflet.css',
      ],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
    },
  })
);
app.use(
  helmet.crossOriginEmbedderPolicy({
    policy: 'credentialless',
  })
);
app.use(helmet.crossOriginOpenerPolicy());
app.use(
  helmet.crossOriginResourcePolicy({
    policy: 'cross-origin',
  })
);
app.use(helmet.dnsPrefetchControl());
app.use(helmet.expectCt());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

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
// Cookie parser
app.use(cookieParser());

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
// HANDLED ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/bookings', bookingRouter);

// UNHANDLED ROUTES
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// ERROR HANDLER MIDDLEWARE
app.use(errorHandler);

module.exports = app;
