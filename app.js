const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRouter = require("./routes/viewRoutes");
const bookingRouter = require("./routes/bookingRoutes");

const app = express();

app.enable("trust proxy");

app.set("view engine", "pug");
app.set("views", `${__dirname}/views`);

app.use(cors());

//1 global middlewares
//Set security HTTP headers

const connectSrcUrls = [
  "https://unpkg.com",
  "https://tile.openstreetmap.org",
  "https://*.stripe.com",
  "https://bundle.js:*",
  "ws://127.0.0.1:*/",
  "ws://localhost:*/",
];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "data:", "blob:", "https:", "ws:"],
      baseUri: ["'self'"],
      scriptSrc: ["'self'", "https:", "http:", "blob:", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "blob:", "https://js.stripe.com"],
      connectSrc: ["'self'", "'unsafe-inline'", "data:", "blob:", ...connectSrcUrls],
    },
  }),
);

//Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//Limit requests from same ip
const limiter = rateLimit({
  limit: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour.",
});
app.use("/api", limiter);

//Body parser, reading data from the body into req.body
app.use(express.json({ limit: "10kb" }));
//urlencoded serve a passare il req.body da un form post
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

//Data sanitization against NoSQL query injection

app.use(mongoSanitize());

//Data sanitization against XSS (cross site scripting)

app.use(xss());

//Prevent parameter pollution

app.use(
  hpp({
    whitelist: ["duration", "ratingsQuantity", "ratingsAverage", "maxGroupSize", "difficulty", "price"],
  }),
);

//Serving static files
app.use(express.static(`${__dirname}/public`));

app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

/* app.get("/api/v1/tours", getAllTours);
app.get("/api/v1/tours/:id", getTour);
app.post("/api/v1/tours", addTour);
app.patch("/api/v1/tours/:id", updateTour);
app.delete("/api/v1/tours/:id", delTour); */

//3 routes

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

//importante aggiungerlo alla fine, poichè sovrascriverebbe qualsiasi altra chiamata
app.all("*", (req, res, next) => {
  const error = new AppError(`Can't find ${req.originalUrl} on this server.`, 404);
  next(error);
});

//gestione degli errori
app.use(globalErrorHandler);

module.exports = app;
