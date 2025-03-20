import express from "express";
import { getStats } from "./../application/admin";
import { isAdmin } from "./middlewares/authorization-middleware";

const adminRouter = express.Router();

adminRouter.use(isAdmin);

adminRouter.get("/stats", getStats);

export default adminRouter;