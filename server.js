const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: `${__dirname}/config.env` });

const app = require("./app");

const DB = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to DB successfully");
  });

const port = process.env.PORT || 3000;

//4 server

const server = app.listen(port, () => {
  console.log(`Running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unahndler rejection! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM RECEIVED, SHUTTING DOWN.");
  server.close(() => {
    console.log("PROCESS TERMINATED, SHUT DOWN COMPLETED.");
  });
});

/* process.on("uncaughtException", (err) => {
  console.log("Unahndler rejection! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
}); */
