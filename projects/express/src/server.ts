import "dotenv/config";
import express from "express";
import { langgraphRouter, sseMiddleware } from "@langgraph-toolkit/adapter-express";
import { createDbResource } from "./database-chat/resource.js";

const resource = await createDbResource();
const app = express();
app.use(express.json());
app.use(sseMiddleware);
app.use(langgraphRouter({ path: "/agents/:name", runtime: resource.runtime, apiKey: process.env.DATABASE_CHAT_API_KEY || undefined }));

const port = Number(process.env.PORT ?? 3511);
const server = app.listen(port, () => console.log(`Express database-chat listening on ${port}`));
const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
