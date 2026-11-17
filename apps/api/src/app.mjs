import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { HttpError } from "./context.mjs";
import { registerOperatorRoutes } from "./routes/operator.mjs";
import { registerBusinessRoutes } from "./routes/business.mjs";
import { registerMenuRoutes } from "./routes/menu.mjs";
import { registerOrdersRoutes } from "./routes/orders.mjs";
import { registerKioskRoutes } from "./routes/kiosk.mjs";
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
app.use(helmet());
const origins = (
  process.env.FRONTEND_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173"
).split(",");
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
  }),
);
app.use(express.json({ limit: "1500kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 240,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));
registerOperatorRoutes(app);
registerBusinessRoutes(app);
registerMenuRoutes(app);
registerOrdersRoutes(app);
registerKioskRoutes(app);
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: error.issues[0]?.message || "Check the submitted fields.",
    });
  if (error instanceof HttpError)
    return res.status(error.status).json({ error: error.message });
  if (error.code === "23505")
    return res.status(409).json({
      error: "That address or record already exists. Refresh and try again.",
    });
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "Upload is too large. Use an image up to 1 MB." });
  if (error instanceof SyntaxError && error.status === 400)
    return res.status(400).json({ error: "Invalid JSON request." });
  console.error("Request failed:", error.code || error.name);
  res.status(500).json({
    error:
      "The server could not finish this request. Please retry. If an order was submitted, retry the same request to check its result.",
  });
});
export { app };
