/**
 * Typed Nest transport for the generic graph adapter. The controller accepts
 * JSON input for run and query-string JSON for SSE so the same contract works
 * for every registered graph name.
 */
import { Body, Controller, Get, Inject, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import type { JsonObject, StepEvent } from "@langgraph-toolkit/core";
import { GraphService } from "@langgraph-toolkit/adapter-nestjs";

function parseInput(serialized: string | undefined): JsonObject {
  if (serialized === undefined || serialized.length === 0) return {};
  const value = JSON.parse(serialized) as JsonObject;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stream input must be a JSON object");
  }
  return value;
}

@Controller("agents")
export class DatabaseChatController {
  constructor(@Inject(GraphService) private readonly graphs: GraphService) {}

  @Get()
  list(): string[] {
    return this.graphs.list();
  }

  @Post(":name/run")
  run(@Param("name") name: string, @Body() input: JsonObject) {
    return this.graphs.run<JsonObject, JsonObject, JsonObject>(name, input);
  }

  @Get(":name/stream")
  async stream(
    @Param("name") name: string,
    @Query("input") serializedInput: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.flushHeaders();
    for await (const event of this.graphs.stream<JsonObject, JsonObject, JsonObject>(name, parseInput(serializedInput))) {
      const payload = JSON.stringify(event as StepEvent<JsonObject>);
      response.write(`data: ${payload}\n\n`);
    }
    response.end();
  }
}
