import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { createDatabaseChatResource } from "./database-chat/resource.js";

const resource = await createDatabaseChatResource();
const app = await NestFactory.create(AppModule.withDatabaseChat(resource.runtime));
await app.listen(Number(process.env.PORT ?? 3513));
