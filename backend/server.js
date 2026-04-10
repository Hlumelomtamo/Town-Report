require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const rateLimit    = require("express-rate-limit");
const reportRoutes = require("./routes/reports");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/reports", limiter, reportRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

app.use((req, res) => {
  console.log("NO ROUTE MATCHED:", req.method, req.originalUrl);
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));