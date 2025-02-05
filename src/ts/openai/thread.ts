import type { OpenAI } from "openai";

export interface ThreadOpts {
	trackResponses?: boolean;
}

export abstract class Thread {
	protected opts: ThreadOpts;

	#messages: OpenAI.ChatCompletionMessageParam[] = [];
	constructor(opts: ThreadOpts) {
		this.opts = opts;
	}

	writeD(text: string) {
		this.#addMessage("developer", text);
		return this;
	}

	writeU(text: string) {
		this.#addMessage("user", text);
		return this;
	}

	async submit(): Promise<string> {
		return this.processResponse(await this.query(this.#messages));
	}

	queryU(text: string): Promise<string> {
		this.writeU(text);
		return this.submit();
	}

	getThread(): string {
		return this.#messages
			.map(
				({ role, content }) =>
					`${role}\n${"-".repeat(64)}\n${(content as string)
						.split("\n")
						.map((t) => `${" ".repeat(4)}${t}`)
						.join("\n")}`,
			)
			.join("\n\n");
	}

	#addMessage(role: OpenAI.ChatCompletionMessageParam["role"], text: string) {
		this.#messages.push({
			role,
			content: text,
		} as OpenAI.ChatCompletionMessageParam);
	}

	processResponse(text: string): string {
		if (this.opts.trackResponses ?? true) this.#addMessage("assistant", text);
		return text;
	}

	protected abstract query(
		messages: OpenAI.ChatCompletionMessageParam[],
	): Promise<string>;
}
