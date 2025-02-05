import type { Talk, TalkWithVector } from "../models.js";
import type { OpenAiClient } from "../openai/client.js";
import type { Clusterer } from "./cluster/index.js";
import type { IProducer } from "./scrapper/base.js";
import type { TalkScrapper } from "./scrapper/scrapper.js";

export class TalkCompiler implements IProducer<TalkWithVector> {
	constructor(
		private talkScrapper: TalkScrapper,
		private openAi: OpenAiClient,
		private clusterer: Clusterer,
	) {}

	async *gatherDocuments() {
		for await (const documents of this.talkScrapper.gatherDocuments()) {
			yield await Promise.all(documents.map((d) => this.#processDocument(d)));
		}
	}

	async #processDocument(document: Talk): Promise<TalkWithVector> {
		const stringsToEmbedSeparately = []; // Here are some embeddings we want to store on the side such as title and abstract
		stringsToEmbedSeparately.push(
			`The author of the talk is: ${document.author}${document.calling ? ` who is called as a ${document.calling}` : ""}.`,
		);
		stringsToEmbedSeparately.push(
			`The month and year of the talk are ${document.month} ${document.year}`,
		);
		stringsToEmbedSeparately.push(`The Title of the talk is ${document.title}`);
		if (document.subtitle) stringsToEmbedSeparately.push(document.subtitle);

		const stringToEmbedAndCluster = document.text
			.split(/(?:\s|[\u202F\u00A0])+/g)
			.join(" ")
			.split(
				/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<![A-Z]+\.)(?<=\.|\?|\!)\s(?=[A-Z0-1])/g,
			);

		const embeddings = await this.openAi.getEmbeddings([
			...stringsToEmbedSeparately,
			...stringToEmbedAndCluster,
		]);

		const embeddingsToCluster = embeddings.splice(
			stringsToEmbedSeparately.length,
		);
		const clusterCenters =
			await this.clusterer.generateClusters(embeddingsToCluster);

		embeddings.push(...clusterCenters);

		return { ...document, embeddings };
	}
}
