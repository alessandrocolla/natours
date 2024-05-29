const mongoose = require("mongoose");
const slugify = require("slugify");
const User = require("./userModel");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      trim: true,
      required: [true, "A tour must have a name."],
      minlength: [8, "A tour name can't be less than 8 characters."],
      maxlength: [40, "A tour name can't exceed 40 characters."],
      // controlla che ci siano solo caratteri in un a stringa, gli spazi non sono ammessi
      //validate: [validator.isAlpha, "Tour name must only contain characters."],
    },

    slug: String,

    duration: {
      type: Number,
      required: [true, "A tour must have a duration."],
    },

    maxGroupSize: {
      type: Number,
      //required: [true, "A tour must have a max group size."],
    },

    difficulty: {
      type: String,
      trim: true,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty must be either easy, medium or difficult.",
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      //required: [true, "A tour must have a price."],
    },

    priceDiscount: {
      type: Number,
      validate: {
        //questo non funziona su update
        validator: function (val) {
          return val < this.price;
        },
      },
      message: "Discount price ({VALUE}) should be below regular price.",
    },

    summary: {
      type: String,
      trim: true,
      //required: [true, "A tour must have a summary."],
    },

    description: {
      type: String,
      trim: true,
    },

    imageCover: {
      type: String,
      trim: true,
      //required: [true, "A tour must have an image."],
    },

    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },

    startDates: [Date],

    secretTour: {
      type: Boolean,
      default: false,
    },

    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },

    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],

    //guides: Array,
    //Child referencing, foreign key
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//indexing: l'obbiettivo sarebbe controllare il minor numero di documenti possibili quando avviene una query
//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

// variabile virtuale da mostrare ad una chiamata get
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

//middleware di mongoose: questo si avvia prima .save() e .create()
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

/*
tourSchema.pre("save", function (next) {
  console.log("Will save document...");
  next();
});

tourSchema.post("save", function (doc, next) {
  console.log(doc);
  next();
}); */

//tourSchema.pre("find", function (next) {
/* tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
}); */

/* tourSchema.post(/^find/, function (doc, next) {
  console.log(`The query took ${Date.now() - this.start} milliseconds.`);
  next();
}); */

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt",
  });

  next();
});

tourSchema.pre("save", async function (next) {
  const guidesPromise = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromise);
  next();
});

tourSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
