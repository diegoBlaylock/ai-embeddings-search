import { OpenAI } from "openai";
import process, { eventNames } from "node:process";
import { Thread, type ThreadOpts } from "./thread.js";

export class OpenAiClient {
	#client: OpenAI;
	#model: OpenAI.ChatModel | OpenAI.EmbeddingModel;

	constructor(model: OpenAI.ChatModel | OpenAI.EmbeddingModel) {
		this.#client = new OpenAI({ apiKey: process.env.OPENAI_KEY });
		this.#model = model;
	}

	startThread(opts: ThreadOpts = {}) {
		return new OpenAiClient.#Thread(this, opts);
	}

	async getEmbeddings(embeddingInput: string[]): Promise<Float32Array[]> {
		const { data } = await this.#client.embeddings.create({
			model: this.#model,
			input: embeddingInput,
			encoding_format: "base64",
		});

		return data.map(
			(emb) =>
				new Float32Array(
					Buffer.from(emb.embedding as unknown as string, "base64").buffer,
				),
		);
	}

	#query(messages: OpenAI.ChatCompletionMessageParam[]) {
		return this.#client.chat.completions.create({
			messages: messages,
			model: this.#model,
			stream: true,
			n: 1,
		} as OpenAI.ChatCompletionCreateParamsStreaming);
	}

	static #Thread = class extends Thread {
		#client: OpenAiClient;
		constructor(client: OpenAiClient, opts: ThreadOpts) {
			super(opts);
			this.#client = client;
		}

		protected async query(
			messages: OpenAI.ChatCompletionMessageParam[],
		): Promise<string> {
			const response = await this.#client.#query(messages);

			const acc: string[] = [];
			for await (const part of response) {
				const chunk =
					part.choices[0].delta.content ?? part.choices[0].delta.refusal ?? "";
				// stdout.write(chunk); // This is fun to see realtime output
				acc.push(chunk);
			}

			return acc.join("");
		}
	};
}
