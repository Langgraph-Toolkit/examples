/**
 * examples/nest-app: the SAME database-chat resource on NestJS.
 *
 *   npm install @nestjs/common @nestjs/platform-express @nestjs/core rxjs
 *        @langgraph-toolkit/core @langgraph-toolkit/adapter-nestjs
 *
 * Graph code untouched. Nest binds via DynamicModule + Injectable service,
 * controllers use Nest's own @Sse() decorator over the async iterable.
 */
import { GraphRegistry, ToolkitModelRegistry } from "@langgraph-toolkit/core";
import { GraphService, LangGraphModule } from "@langgraph-toolkit/adapter-nestjs";
import { databaseChatGraph } from "../shared/agent.js";

const registry = new GraphRegistry();
registry.add(databaseChatGraph);
const provider = new ToolkitModelRegistry({
  tiers: {
    strong: { driver: "mock", model: "test-strong" },
    cheap: { driver: "mock", model: "test-cheap" },
    // strong: { driver: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3", apiKey: process.env.HF_TOKEN, provider: "auto" },
  },
});

// Nest module wiring (real app uses @Module decorators; shape shown here)
const langGraphModule = LangGraphModule.forRoot({ graphs: registry, global: true });
console.log("LangGraphModule providers:", langGraphModule.providers.length, "- global:", langGraphModule.global);

// Service usage identical to any Nest service injection
const graphs = langGraphModule.providers[0].useValue as GraphService;
const result = await graphs.run("database-chat", { question: "What is the customer profile?" });
console.log("stoppedReason:", (result as { stoppedReason: string }).stoppedReason);

// Controller snippet (copy into a real Nest controller):
// @Controller("agents")
// class AgentController {
//   constructor(private readonly graphs: GraphService) {}
//   @Get(":name/run") @Sse()
//   stream(@Param("name") name: string, @Query() q: { input?: string }) {
//     return from(this.graphs.stream(name, q.input ? JSON.parse(q.input) : {}));
//   }
// }

export { langGraphModule, graphs, registry, provider };
