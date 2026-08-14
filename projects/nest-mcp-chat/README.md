# NestJS MCP Chat

Một backend NestJS tối giản cho chat 1-1 giữa user và chatbot. Graph dùng `@langgraph-toolkit/core`, context được lấy qua MCP Streamable HTTP, model provider được suy diễn từ environment bởi `@langgraph-toolkit/community`, còn NestJS chỉ đảm nhiệm lifecycle và HTTP adapter.

## Chạy local

```bash
cp .env.example .env
pnpm install
pnpm run build
pnpm run start:dev
```

`MCP_URL` là biến bắt buộc duy nhất của resource. `MCP_CONTEXT_TOOL` có thể để trống vì resource tự tìm tool có hậu tố `search_courses`. Khi có `DEEPSEEK_API_KEY`, community registry tự cấu hình tier `cheap` và `strong`; nếu chưa có provider, registry dùng mock fallback để kiểm tra wiring. MCP gateway, model registry và runtime được tạo trong `LangGraphModule.forRootAsync()` và tự đóng khi Nest shutdown.

## API

Chạy một lượt và nhận JSON state cuối cùng:

```bash
curl -X POST http://localhost:3000/chat/run \
  -H 'content-type: application/json' \
  -d '{"message":"Có khóa học nào về testing không?","threadId":"demo-1"}'
```

Nhận step events, token và reasoning chunk nếu provider hỗ trợ:

```bash
curl -N 'http://localhost:3000/chat/stream?message=Có+khóa+học+nào+về+testing+không&threadId=demo-1'
```

Các event SSE gồm `node_start`, `node_end`, `thinking`, `intent`, `token`, `reasoning`, `answer`, `tool_start`, `tool_end`, `error` và các event runtime khác nếu graph phát ra. Ứng dụng không phân tích intent bằng regex. Graph dùng LLM để phân tích intent, lấy context qua MCP, sau đó để LLM tổng hợp câu trả lời theo ngôn ngữ của user.

## Cấu trúc

`src/chat/chat.resource.ts` tạo một MCP gateway, typed context tool, model registry và runtime dùng chung trong suốt lifecycle process. `src/chat/chat.graph.ts` định nghĩa state suy luận từ descriptor, ba node `intent`, `context` và `answer`, step labels, model tiers và `MemoryCheckpointer`. `src/app.module.ts` gắn resource async vào `LangGraphModule`, còn `src/app.controller.ts` chỉ chuyển HTTP request thành `run()` hoặc Nest `@Sse()` stream qua bound graph facade.

Phần còn lại của ứng dụng không cần tự viết MCP result parser, token accumulator, reasoning accumulator, SSE headers, event serialization hoặc error envelope. Những concern này thuộc về typed MCP adapter, `streamChatNode` và Nest adapter.

Để dùng production, thay `MemoryCheckpointer` trong graph resource bằng checkpointer adapter phù hợp với hệ thống lưu trữ của bạn. Contract graph và controller không cần đổi.
