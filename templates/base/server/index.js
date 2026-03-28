import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import testRoutes from "./routes/testRoutes.js";
/* QUICKSTACK_AUTH_IMPORTS */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

connectDB();

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
/* QUICKSTACK_AUTH_MIDDLEWARE */

app.use("/api", testRoutes);
/* QUICKSTACK_AUTH_ROUTES */

// Global error handler — must be registered AFTER all routes.
// Express identifies it by the 4-argument signature (err, req, res, next).
// Catches anything forwarded via next(err) or thrown inside async middleware.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const message    = err.message   ?? "Internal Server Error";
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

app.listen(process.env.PORT || 5000, () => console.log("Server running..."));
