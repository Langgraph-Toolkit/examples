import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule.withAsyncChat());
  await app.listen(Number(process.env.PORT ?? '3000'));
}

void bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
