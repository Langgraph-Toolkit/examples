import "dotenv/config";
import Fastify from "fastify";
import { langgraphFastify } from "@langgraph-toolkit/adapter-fastify";
import { createDbResource } from "./database-chat/resource.js";

const resource = await createDbResource();
const app = Fastify({ logger: true });
await app.register(langgraphFastify, {
  runtime: resource.runtime,
  apiKey: process.env.DATABASE_CHAT_API_KEY || undefined,
});
await app.listen({ port: Number(process.env.PORT ?? 3512), host: "0.0.0.0" });
