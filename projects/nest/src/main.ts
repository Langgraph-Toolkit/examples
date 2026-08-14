import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule.withDatabaseChat());
await app.listen(Number(process.env.PORT ?? 3513));
