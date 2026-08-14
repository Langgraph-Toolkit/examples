import { createDatabaseChatResource } from "./resource.js";

export const databaseChat = await createDatabaseChatResource();
export default databaseChat.graph.definition;
