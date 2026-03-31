import { Router } from "express";
import { testHandler } from "../controllers/testController.js";

const router = Router();

// GET /api/test
router.get("/test", testHandler);

export default router;
