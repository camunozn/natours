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

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // OPERATIONAL TRUSTED ERROR: send message to the client.
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // PROGRAMMING UNKNOWN ERROR: don't send error details.
  } else {
    console.error('Error 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Whoops, something went wrong',
    });
  }
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
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  }
  next();
};
