import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import contactsRouter from "./contacts";
import interactionsRouter from "./interactions";
import ingestRouter from "./ingest";
import chatRouter from "./chat";
import agentRouter from "./agent";
import notificationsRouter from "./notifications";
import remindersRouter from "./reminders";
import hubRouter from "./hub";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(contactsRouter);
router.use(interactionsRouter);
router.use(ingestRouter);
router.use(chatRouter);
router.use(agentRouter);
router.use(notificationsRouter);
router.use(remindersRouter);
router.use(hubRouter);
router.use(dashboardRouter);

export default router;
