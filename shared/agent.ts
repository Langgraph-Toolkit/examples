/**
 * Shared resource entry point used by every host example.
 * The business graph is database-chat; hosts add only transport wiring.
 */
export {
  databaseChatDefinition,
} from "../database-chat/index.js";

export {
  createDatabaseChatResource,
  type DatabaseChatResource,
  type DatabaseChatResourceOptions,
} from "../database-chat/index.js";
