const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty."],
    },

    rating: {
      type: Number,
      required: [true, "A review must have a rating between 1 and 5."],
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },

    createdAt: {
      type: Date,
      default: Date.now(),
    },

    tour: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Tour",
        required: [true, "A review must belong to a tour."],
      },
    ],

    user: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: [true, "A review must belong to a user."],
      },
    ],
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  /* this.populate({
    path: "tour",
    select: "name",
  }).populate({
    path: "user",
    select: "name photo",
  });
 */

  this.populate({
    path: "user",
    select: "name photo",
  });

  next();
});

reviewSchema.statics.calcAverageRatings = catchAsync(async (tourId) => {
  const Review = mongoose.model("Review");

  //lui utilizzava this.aggregate, ma per qualche motivo non riconosceva this come Review, quindi ho dovuto importarlo
  const stats = await Review.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
    {
      $addFields: {
        avgRating: { $round: ["$avgRating", 2] }, //per avere i decimali dopo la virgola
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  }
  //se non ci sono più commenti, torna ai valori di default
  else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
});

reviewSchema.post("save", function () {
  //this points to current review

  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await this.model.calcAverageRatings(doc.tour);
});

//NON FUNZIONA!!! METODO USATO DAL CORSO: GIU', QUELLO CORRETTO: SU

/* reviewSchema.pre(
  /^findOneAnd/,
  catchAsync(async function (next) {
    console.log("Eccomi1");
    const review = await this.clone().findOne(); // Utilizza this.constructor invece di this
    console.log(`Review: ${review}`);

    next();
  }),
);

reviewSchema.post(
  /^findOneAnd/,
  catchAsync(async () => {
    console.log("Eccomi2");
    const Review = mongoose.model("Review");
    await Review.constructor.calcAverageRatings(Review.review.tour);
  }),
); */

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
