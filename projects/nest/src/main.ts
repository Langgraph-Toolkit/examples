import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { createDbResource } from "./database-chat/resource.js";

const resource = await createDbResource();
const app = await NestFactory.create(AppModule.withDatabaseChat(resource));
await app.listen(Number(process.env.PORT ?? 3513));
