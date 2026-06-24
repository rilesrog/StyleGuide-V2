import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import styleRouter from "./style";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(styleRouter);

export default router;
