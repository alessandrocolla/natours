const AppError = require("../utils/appError");

const handleJWTError = () => new AppError("Invalid token, please log in again", 401);
const handleTEError = () => new AppError("Token expired, please log in again.", 401);

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  const message = `Duplicate field value: ${value}, use another name. `;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  // Trova il messaggio che inizia con "Validator failed for path `passwordConfirm`"
  const errorMessage = errors.find((msg) => msg.startsWith("Validator failed for path `passwordConfirm`"));

  // Se viene trovato il messaggio, restituisci solo il messaggio fino alla posizione di 'with value'
  const message = errorMessage
    ? `Invalid input data! ${errorMessage.slice(0, errorMessage.indexOf("with value"))}`
    : `Invalid input data. ${errors.join(". ")}`;

  return new AppError(message, 400);
};

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }

  //RENDER WEBSITE
  else {
    res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith("/api")) {
    //Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    //Programming or other unknown error: dont'leak error details
    //1) log error
    console.error("ERROR! ", err);

    //2) send generic error
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
    });
  }
  //B) RENDERED WEBSITE
  console.error("ERROR! ", err);
  //Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }

  //Programming or other unknown error: dont'leak error details
  //1) log error
  console.error("ERROR! ", err);

  //2) send generic error
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: "Please, try again later.",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    //Bug risolto con il Q&A
    //let error = { ...err };
    let error = Object.create(err);

    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError") error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleTEError();

    sendErrorProd(error, req, res);
  }
};
