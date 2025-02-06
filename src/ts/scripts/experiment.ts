import { config } from "dotenv";
import { OpenAiClient } from "../services/openai/client.js";
import { withSql } from "../services/sql/client.js";
import { semanticQuery } from "../utils.js";
import { mkdir, writeFile } from "node:fs/promises";

// VARIABLES

const CUTOFF = 0.11;
const LIMIT = 5;

const QUERIES = [
	"stories about airplanes",
	"money and financial prudence",
	"talks about abuse",
	"women and the priesthood",
	"how to be more charitable to others",
	"relationship between forgiveness and justice",
	"kolob and cultic subjects",
];

// MAIN

async function main() {
	config();
	const openAi = new OpenAiClient("text-embedding-ada-002");
	await mkdir("./output", { recursive: true });

	withSql(async (sql) => {
		const results: Result[] = [];

		for (const query of QUERIES) {
			const [embedding] = await openAi.getEmbeddings([query]);
			const rows = await semanticQuery(sql, embedding, CUTOFF, LIMIT);
			results.push({ query, rows });
		}

		await writeFile(
			"./output/results.json",
			JSON.stringify({ results }, undefined, 2),
		);
		console.log("FINISH");
	});
}

interface Result {
	query: string;
	rows: Record<string, unknown>[];
}

await main();
