# NestJS MCP Chat

Một backend NestJS tối giản cho chat 1-1 giữa user và chatbot. Demo dùng `createMCP()` và `useStreamableHttp()` từ MCP để quản lý named server, sau đó dùng `createDatabaseAgent()` từ explicit Community/database subpath như một convenience workflow. Đây không phải giới hạn của toolkit: Core vẫn là graph runtime generic cho classification, extraction, background task, retrieval, multi-agent routing và tool workflow; MCP chỉ quản lý server, credentials, tool và context; NestJS chỉ đảm nhiệm lifecycle và HTTP adapter.

## Chạy local

```bash
cp .env.example .env
pnpm install
pnpm run build
pnpm run start:dev
```

`MCP_URL` là biến bắt buộc duy nhất của resource. Resource tạo một connector từ danh sách server declarations, sau đó chọn server `context` để cấp cho database preset. Muốn thêm MCP chỉ cần thêm declaration vào `servers`; workflow không cần đổi sang một factory mới. Khi có `DEEPSEEK_API_KEY`, Community tự cấu hình các tier model; nếu chưa có provider, registry dùng mock fallback để kiểm tra wiring. Connector, model registry và runtime được tạo trong `LangGraphModule.forRootAsync()` và tự đóng khi Nest shutdown.

## API

Chạy một lượt và nhận JSON state cuối cùng:

```bash
curl -X POST http://localhost:3000/chat/run \
  -H 'content-type: application/json' \
  -d '{"question":"Có khóa học nào về testing không?","threadId":"demo-1"}'
```

Nhận step events, token và reasoning chunk nếu provider hỗ trợ:

```bash
curl -N 'http://localhost:3000/chat/stream?question=Có+khóa+học+nào+về+testing+không&threadId=demo-1'
```

Các event SSE gồm `node_start`, `node_end`, `thinking`, `intent`, `token`, `reasoning`, `tool_start`, `tool_end`, `error` và các event runtime khác nếu graph phát ra. Kết quả grounded cuối cùng nằm trong `data.state.answer` của event `node_end` cuối. Ứng dụng không phân tích intent bằng regex. Built-in agent dùng LLM để phân tích intent, lấy schema và rows qua MCP, kiểm tra policy rồi trả lời có citation.

## Cấu trúc

`src/chat/chat.resource.ts` khai báo connector và chọn gateway theo tên, rồi gọi database preset ở subpath rõ ràng. `src/app.module.ts` gắn resource async vào `LangGraphModule`, còn `src/app.controller.ts` bind graph `chat` một lần rồi chuyển HTTP request thành `run()` hoặc Nest `@Sse()` stream.

Phần còn lại của ứng dụng không cần tự viết graph state, node, edge, MCP result parser, token accumulator, reasoning accumulator, SSE headers, event serialization, policy gate hoặc error envelope. Những concern này thuộc về database agent, MCP package và Nest adapter.

Để dùng production, thêm checkpointer hoặc policy deployment-specific khi khởi tạo agent resource. Contract input `{ question }`, graph name `chat` và controller không cần đổi.
