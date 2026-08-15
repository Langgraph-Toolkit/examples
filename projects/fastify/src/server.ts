import "dotenv/config";
import Fastify from "fastify";
import { createFastifyAdapter } from "@langgraph-toolkit/adapter-fastify";
import { createDbResource } from "./database-chat/resource.js";

const resource = await createDbResource();
const adapter = createFastifyAdapter(resource.runtime, {
  apiKey: process.env.DATABASE_CHAT_API_KEY || undefined,
});
const app = Fastify({ logger: true });
await app.register(adapter.plugin);
await app.listen({ port: Number(process.env.PORT ?? 3512), host: "0.0.0.0" });
