import { Router } from "express";
import { testHandler } from "../controllers/testController.js";

const router = Router();

//Route for testing the API
router.get("/test", testHandler);

export default router;
