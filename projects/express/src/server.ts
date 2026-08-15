import "dotenv/config";
import express from "express";
import { createExpressAdapter } from "@langgraph-toolkit/adapter-express";
import { createDbResource } from "./database-chat/resource.js";

const resource = await createDbResource();
const adapter = createExpressAdapter(resource.runtime, {
  path: "/agents/:name",
  apiKey: process.env.DATABASE_CHAT_API_KEY || undefined,
});
const app = express();
app.use(express.json());
app.use(adapter.middleware);
app.use(adapter.router);

const port = Number(process.env.PORT ?? 3511);
const server = app.listen(port, () => console.log(`Express database-chat listening on ${port}`));
const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
