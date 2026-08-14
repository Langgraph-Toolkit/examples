import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { GraphService } from "@langgraph-toolkit/adapter-nestjs";

@Controller("agents")
export class AppController {
  constructor(private readonly graphs: GraphService) {}

  @Get()
  list(): string[] {
    return this.graphs.list();
  }

  @Post(":name/run")
  run(@Param("name") name: string, @Body() body: Record<string, unknown>) {
    return this.graphs.run(name, body, { threadId: typeof body.threadId === "string" ? body.threadId : undefined });
  }

  @Get(":name/stream")
  async stream(@Param("name") name: string, @Res() response: Response): Promise<void> {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    for await (const event of this.graphs.stream(name, {})) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    response.end();
  }
}
