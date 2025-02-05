import { config } from "dotenv";
import { TalkScrapper } from "./data/scrapper/scrapper.js";
import { Clusterer } from "./data/cluster/index.js";
import { OpenAiClient } from "./openai/client.js";

async function main() {
	config();

	const openAi = new OpenAiClient("text-embedding-ada-002");
	console.dir(
		await openAi
			.getEmbeddings([
				"Hello, my name is Diego. I am a computer science major and enjoy my time immensely.",
			])
			.then((v) => v.map((n) => n.length)),
	);
}

await main();
