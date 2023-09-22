/* eslint-disable global-require */
const NODE_ENV = "development";
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config({ path: `.${NODE_ENV}.env` });
require("./jobs/installmentDue");
const fileUpload = require("express-fileupload");
const compression = require("compression");

const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const bodyParser = require("body-parser");
const swaggerDocument = require("./swagger.json");
const morganMiddleware = require("./middleware/morgan");

const app = express();

app.use(
  bodyParser.urlencoded({
    limit: "3mb",
    extended: false,
  })
);
app.use(bodyParser.json({ limit: "3mb" }));
app.use(fileUpload());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});
app.use(express.json());
app.use(cors());

app.use(
  compression({
    level: 6,
    threshold: 1000, // 1kb
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

const options = {
  explorer: true,
  swaggerOptions: {
    validatorUrl: null,
  },
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, options)
);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`MongoDB Database Connected`);
    const { authenticateUser } = require("./middleware/authorize");

    app.use(morganMiddleware);

    app.get("/", (req, res) => {
      res.send("Server is up and Running👨‍💻👩‍💻");
    });

    //
    app.use(authenticateUser);

    app.use("/api/v1/config", require("./router/academicYear"));
    app.use("/api/v1/feetype", require("./router/feeType"));
    app.use("/api/v1/expenseType", require("./router/expenseType"));
    app.use("/api/v1/expense", require("./router/expense"));
    app.use("/api/v1/donor", require("./router/donor"));
    app.use("/api/v1/feeschedule", require("./router/feeSchedule"));
    app.use("/api/v1/feecategory", require("./router/feeCategory"));
    app.use("/api/v1/feestructure", require("./router/feeStructure"));
    app.use("/api/v1/feeinstallment", require("./router/feeInstallment"));
    app.use("/api/v1/discount", require("./router/discountCategory"));
    app.use("/api/v1/applicationfee", require("./router/applicationFee"));
    app.use("/api/v1/feereceipt", require("./router/feeReceipt"));
    app.use("/api/v1/previousfees", require("./router/previousFeesBalance"));
    app.use("/api/v1/duelist", require("./router/dueList"));
    app.use(
      "/api/v1/transfercertificate",
      require("./router/transferCertificate")
    );

    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        status: err.status || "error",
        message: err.message || "Something went wrong",
      });
    });

    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Servers is listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log(err.message);
    process.exit(1);
  });

module.exports = { app };
