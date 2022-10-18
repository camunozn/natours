const AppError = require('../utils/appError');

const handleCastErrorDB = function (err) {
  return new AppError(`Invalid ${err.path}: ${err.value}.`, 400);
};

const handleDuplicatesDB = function (err) {
  return new AppError(
    `Duplicate field value: '${err.keyValue.name}', please use a unique value.`,
    400
  );
};

const handleValidationDB = function (err) {
  const errors = Object.values(err.errors)
    .map(el => el.message)
    .join('. ');
  return new AppError(`Invalid input data. ${errors}.`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }
  // B) RENDERED WEBSITE
  console.error('Error 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A1) OPERATIONAL TRUSTED ERROR: send message to the client.
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // A2) PROGRAMMING UNKNOWN ERROR: don't send error details.
    console.error('Error 💥', err);
    return res.status(500).json({
      status: 'error',
      message: 'Whoops, something went wrong',
    });
  }
  // B) RENDERED WEBSITE
  // B1) OPERATIONAL TRUSTED ERROR: send message to the client.
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // B2) PROGRAMMING UNKNOWN ERROR: don't send error details.
  console.error('Error 💥', err);
  return res.status(500).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  let error = JSON.parse(JSON.stringify(err));

  // ERROR FOR INVALID DATA
  if (error.name === 'CastError') {
    error = handleCastErrorDB(error);
  }
  // ERROR FOR DUPLICATE DATA
  if (error.code === 11000) {
    error = handleDuplicatesDB(error);
  }
  // ERROR FOR DATA VALIDATION
  if (error.name === 'ValidationError') {
    error = handleValidationDB(error);
  }
  // ERROR FOR JWT TOKEN ERROR
  if (error.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  // ERROR FOR JWT EXPIRED ERROR
  if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // COPYING ERROR CODE TO MATCH DEV ERR OR 500 IF IT IS UNDEFINED
  err.statusCode = error.statusCode || 500;
  err.status = error.status || 'error';
  // COPYING ERR MESSAGE TO PRODUCTION ERROR IF IT IS UNDEFINED
  error.message = error.message || err.message;

  // SEND ERROR
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  }
  next();
};
