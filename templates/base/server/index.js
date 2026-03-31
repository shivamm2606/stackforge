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

// CORS: set CLIENT_URL in .env for production
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
/* QUICKSTACK_AUTH_MIDDLEWARE */

app.use("/api", testRoutes);
/* QUICKSTACK_AUTH_ROUTES */

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const message    = err.message   ?? "Internal Server Error";
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(process.env.PORT || 5000, () => console.log("Server running..."));
