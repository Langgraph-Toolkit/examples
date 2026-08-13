/**
 * Shared resource entry point used by every host example.
 * The business graph is database-chat; hosts add only transport wiring.
 */
export {
  databaseChatGraph,
  databaseChatDefinition,
} from "../database-chat/index.js";

export type * from "../database-chat/types.js";
