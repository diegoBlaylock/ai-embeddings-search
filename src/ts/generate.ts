import { config } from "dotenv";
import { TalkScrapper } from "./data/scrapper/scrapper.js";
import { Clusterer } from "./data/cluster/index.js";
import { OpenAiClient } from "./openai/client.js";
import { TalkCompiler } from "./data/embeddings.js";
import { writeFile } from "node:fs/promises";
import * as CSV from "csv";
import { createWriteStream } from "node:fs";

async function main() {
	config();

	const openAi = new OpenAiClient("text-embedding-ada-002");
	const clusterer = new Clusterer({ dimensions: 1536, nClusters: 10 });
	const scrapper = new TalkScrapper({
		lowerYearBound: 2016,
		maxBatchSize: 1,
	});
	const generator = new TalkCompiler(scrapper, openAi, clusterer);

	const rowStream = createWriteStream("data/talks.csv", "utf-8");

	try {
		rowStream.write(
			"Title,Subtitle,Month,Year,Author,Calling,Text,Embeddings\n",
		);
		for await (const talks of generator.gatherDocuments()) {
			process.stdout.write(".".repeat(talks.length));
      rowStream.cork();
			const rows = talks
				.map((talk) => {
					return [
						quote(talk.title),
						quote(talk.subtitle ?? "N/A"),
						talk.month,
						talk.year.toString(),
						quote(talk.author),
						quote(talk.calling ?? "N/A"),
						quote(talk.text),
						quote(
							talk.embeddings
								.map((emb) => Buffer.from(emb.buffer).toString("base64"))
								.join("."),
						),
					].join(",");
				})
				.join("\n");

			rowStream.write(rows);
      rowStream.write("\n");
      rowStream.uncork();

			break;
		}
	} finally {
		clusterer.destroy();
		rowStream.end();
    console.info();
	}
}

function quote(text: string) {
	return `"${text.replaceAll('"', '""')}"`;
}

await main();
