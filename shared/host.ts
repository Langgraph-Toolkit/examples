/**
 * Host example conventions: keep framework lifecycle concerns explicit and
 * leave graph, model, MCP and permission composition inside the resource.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface HostConfig {
  readonly host: string;
  readonly port: number;
}

export function readHostConfig(defaultPort: number): HostConfig {
  const portValue = Number(process.env.PORT ?? defaultPort);
  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number.isInteger(portValue) && portValue > 0 ? portValue : defaultPort,
  };
}

export function isMainModule(metaUrl: string): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && resolve(fileURLToPath(metaUrl)) === resolve(entrypoint);
}
