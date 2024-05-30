const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

//return viene omesso poichè è un arrow function
const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  };

  res.cookie("jwt", token, cookieOptions);

  //remove password from http response
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const url = `${req.protocol}://${req.get("host")}/me`;
  /* console.log(url); */
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    photo: req.body.photo,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Controlliamo se sono stati forniti email e password
  if (!email || !password) return next(new AppError("Please provide email and password.", 400));

  const user = await User.findOne({ email }).select("+password");

  //il controllo della password lo facciamo direttamente nel controllo finale
  //poichè da errori alla lettura di "correctPassword"
  //const correct = await user.correctPassword(password, user.password);

  //2) Controlliamo se email e password siano corretti
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError("Incorrect email or password", 401));

  //3) Mandiamo il token di accesso in caso tutto sia corretto

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedOut", {
    expires: new Date(Date.now() + 10000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) getting token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError("You are not logged in, log in to get access", 401));

  //2) validate token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) check if user still exists

  const freshUser = await User.findById(decoded.id);

  if (!freshUser) return next(new AppError("The user belonging to this token no longer exists.", 401));

  //4) check if user changed the password after the token was issued

  if (freshUser.changedPasswordAfter(decoded.iat))
    return next(new AppError("User recently changed password, please log in again.", 401));

  //Dai accesso alla rotta protetta
  res.locals.user = freshUser;
  req.user = freshUser;
  next();
});

//Only for render pages, no errors
// rimosso catchAsync perchè vogliamo gestire gli errori globalmente per il logout
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) Verify token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      //2) check if user still exists

      const freshUser = await User.findById(decoded.id);

      if (!freshUser) return next();

      //3) check if user changed the password after the token was issued

      if (freshUser.changedPasswordAfter(decoded.iat)) return next();

      //4) There is a logged user, give authorization
      //Dai accesso alla rotta protetta
      res.locals.user = freshUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  //If there is no cookie, simply go next
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(new AppError("You do not have permission to perform this action.", 403));

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) return next(new AppError("No user found with email address", 404));

  //2) Generate the reset token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send it to user email

  try {
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to mail successfully.",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was an error sending an email, please try again later.", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token

  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });

  //2) If the token hasn't expired, and there is user, set the new password.

  if (!user) return next(new AppError("Token is invalid or expired.", 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) Update changedPasswordAt propriety at user
  // Abbiamo usato il middleware in userModel alla fine

  //4) Log the user in, send JWT

  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm, passwordCurrent } = req.body;
  //1) Get user from the database
  const user = await User.findById(req.user.id).select("+password");

  if (!user.correctPassword(password, passwordConfirm)) return next(new AppError("User not found.", 400));

  //2) Check if POSTed current password is correct

  if (!(await user.correctPassword(passwordCurrent, user.password)))
    return next(new AppError("Wrong password, try again.", 401));

  //3) Update password

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  //4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
