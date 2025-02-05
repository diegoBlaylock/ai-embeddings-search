import type { OpenAiClient } from "./openai/index.js";
import type { SqlClient } from "./sql/index.js";

export interface Context {
	ai: OpenAiClient;
	sql: SqlClient;
}
