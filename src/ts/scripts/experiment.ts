import { config } from "dotenv";
import { OpenAiClient } from "../services/openai/client.js";
import { type SqlClient, withSql } from "../services/sql/client.js";
import { toSql } from "../utils.js";

async function main() {
	config();
	const openAi = new OpenAiClient("text-embedding-ada-002");
	withSql(async (sql) => {
		const queries = [
			"Talks that have stories about airplanes",
			"Talks dealing with money and financial prudence",
			"Talks that reference Marvel characters",
			"Talks",
		];
	});
}

async function semanticQuery(query: string, sql: SqlClient, ai: OpenAiClient) {
	const [embedding] = await ai.getEmbeddings([query]);

	const [rows] = await sql.query(
		"SELECT t.talk_id, t.title, t.author, t.month, t.year, ROUND(MAX(1-( $1 <=> e.embedding)::numeric),4) AS similarity, COUNT(e.embedding) AS related, t.subtitle\n" +
			"FROM vect.talk t\n" +
			"INNER JOIN vect.embedding e ON t.talk_id = e.talk_id\n" +
			"WHERE 1-( $1 <=> e.embedding) > 0.85 \n" +
			"GROUP BY t.talk_id\n" +
			"ORDER BY similarity DESC, related DESC;",
		toSql(embedding),
	);
	return rows;
}

await main();
