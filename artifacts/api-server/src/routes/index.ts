import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import styleRouter from "./style";
import productsRouter from "./products";
import sessionsRouter from "./sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(styleRouter);
router.use(productsRouter);
router.use(sessionsRouter);

export default router;
