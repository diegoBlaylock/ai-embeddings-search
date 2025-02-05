import type { Talk } from "../../models.js";
import type { IProducer } from "./base.js";
import { JSDOM } from "jsdom";
import type { ScrapperOpts } from "./types.js";

/**
 * Adapted from unknown python source
 */
export class TalkScrapper implements IProducer<Talk> {
	readonly #lowerYearBound: number;
	readonly #batchSize: number;
	constructor(opts: ScrapperOpts) {
		this.#lowerYearBound = opts.lowerYearBound;
		this.#batchSize = opts.maxBatchSize;
	}

	async *gatherDocuments() {
		const context = new ScrapeContext(this.#batchSize);

		while (!context.exhausted) {
			if (context.hasPageToProcess) {
				const talks = await Promise.all(
					context.allPagesToProcess.map((page) =>
						this.#processPage(context, page),
					),
				);
				const cleaned = talks.filter((t) => t) as Talk[];
				if (cleaned.length > 0) yield cleaned;
			} else if (context.hasConferenceToFetch) {
				await Promise.all(
					context.allConferencesToFetch.map((conference) =>
						this.#fetchTalksFromConference(context, conference),
					),
				);
			} else if (context.hasSourceToFetch) {
				await Promise.all(
					context.allSourcesToFetch.map((source) =>
						this.#fetchMorePages(context, source),
					),
				);
			}
		}
	}

	async #processPage(
		context: ScrapeContext,
		page: string,
	): Promise<Talk | null> {
		const { groups } = page.match(/\/(?<year>\d{4})\/(?<month>10|04)/) ?? {};
		const year =
			groups?.year == null ? undefined : Number.parseInt(groups.year);
		const month = groups?.month && groups.month === "10" ? "Oct" : "Apr";

		if (year == null || year < this.#lowerYearBound) return null;

		const html = await context.getHtml(page);
		if (html == null) return null;

		const title = html.getElementsByTagName("h1").item(0)?.textContent?.trim();
		if (title && /(?:morning|afternoon|evening)\s+session/gi.test(title))
			return null;
		const subtitle = html
			.querySelector<HTMLParagraphElement>("p.kicker")
			?.textContent?.trim();
		const author = html
			.querySelector<HTMLParagraphElement>("p.author-name")
			?.textContent?.trim()
			.replace(/^By (?:Elder |President )/, "");
		if (author?.includes("Presented by")) return null;
		const calling = html
			.querySelector<HTMLParagraphElement>("p.author-role")
			?.textContent?.trim()
			.replace("Of the ", "")
			.replaceAll(
				/Q_of_12|twelve|12|Council of the 12|Quorum of the Twelve Apostles/gi,
				"Quorum of the 12",
			)
			.replaceAll(
				/Q_of_70|70|Assistant to the Q_of_12|First Council of the Seventy|Presidency of the First Q_of_70|Presidency of the Seventy|Emeritus member of the Seventy|Released Member of the Seventy/g,
				"Seventy",
			)
			.replaceAll(
				/President of The Church of Jesus Christ of Latter-day Saints|President of the Church/g,
				"President of the Church",
			);

		if (calling?.includes("Church Auditing Department")) return null;

		const mainContent = [
			...html.querySelectorAll<HTMLParagraphElement>("div.body-block p"),
		]
			.map((el) => el.textContent?.trim().replaceAll("\n", ""))
			.join("\n\n");

		if (
			title == null ||
			author == null ||
			mainContent == null ||
			year == null ||
			month == null
		)
			return null;

		return {
			author: cleanWeirdUnicode(author),
			calling: calling && cleanWeirdUnicode(calling),
			month,
			subtitle: subtitle && cleanWeirdUnicode(subtitle),
			text: cleanWeirdUnicode(mainContent),
			title: cleanWeirdUnicode(title),
			year,
		};
	}

	async #fetchTalksFromConference(context: ScrapeContext, source: string) {
		const talkRegex = /\/study\/general-conference\/\d{4}\/(04|10)\/.*/;
		const html = await context.getHtml(source);
		if (html == null) return;
		const links = html.getElementsByTagName("a");

		for (const link of links) {
			const { href } = link;
			if (!href) continue;
			if (!talkRegex.test(href) || href.endsWith("session?lang=eng")) continue;
			context.pageToProcess = href;
		}
	}

	async #fetchMorePages(context: ScrapeContext, source: string): Promise<void> {
		const mainPageRegex = /study\/general-conference(?:\/)?\?/;
		const decadePageRegex = /study\/general-conference\/\d{4}\d{4}/;
		const conferencePageRegex = /study\/general-conference\/\d{4}\/(?:04|10)/;

		if (mainPageRegex.test(source)) {
			const html = await context.getHtml(source);
			if (html == null) return;
			const links = html.getElementsByTagName("a");
			for (const link of links) {
				if (!link.href) continue;
				const { href } = link;
				if (conferencePageRegex.test(href)) context.conferenceToFetch = href;
				if (decadePageRegex.test(href)) context.sourceToFetch = href;
			}
		}

		if (decadePageRegex.test(source)) {
			const html = await context.getHtml(source);
			if (html == null) return;
			const links = html.getElementsByTagName("a");
			for (const link of links) {
				if (!link.href) continue;
				const { href } = link;
				if (conferencePageRegex.test(href)) context.conferenceToFetch = href;
			}
		}

		if (conferencePageRegex.test(source)) {
			context.conferenceToFetch = source;
		}
	}
}

class ScrapeContext {
	constructor(private batchSize: number) {}

	#pages = new Set<string>();
	#pagesToFetch: string[] = [
		"https://www.churchofjesuschrist.org/study/general-conference?lang=eng",
	];
	#conferencesToFetch: string[] = [];
	#pagesToProcess: string[] = [];

	get exhausted() {
		return (
			this.#pagesToFetch.length <= 0 &&
			this.#pagesToProcess.length <= 0 &&
			this.#conferencesToFetch.length <= 0
		);
	}

	set pageToProcess(url: string) {
		if (this.#pages.has(url)) return;
		this.#pages.add(url);
		this.#pagesToProcess.push(url);
	}

	get hasPageToProcess() {
		return this.#pagesToProcess.length > 0;
	}

	get nextPageToProcess() {
		return this.#pagesToProcess.pop();
	}

	get allPagesToProcess() {
		return this.#pagesToProcess.splice(0, this.batchSize);
	}

	set sourceToFetch(url: string) {
		if (this.#pages.has(url)) return;
		this.#pages.add(url);
		this.#pagesToFetch.push(url);
	}

	get hasSourceToFetch() {
		return this.#pagesToFetch.length > 0;
	}

	get nextSourceToFetch() {
		return this.#pagesToFetch.pop();
	}

	get allSourcesToFetch() {
		return this.#pagesToFetch.splice(0, this.#pagesToFetch.length);
	}

	set conferenceToFetch(url: string) {
		if (this.#pages.has(url)) return;
		this.#pages.add(url);
		this.#conferencesToFetch.push(url);
	}

	get hasConferenceToFetch() {
		return this.#conferencesToFetch.length > 0;
	}

	get nextConferenceToFetch() {
		return this.#conferencesToFetch.pop();
	}

	get allConferencesToFetch() {
		return this.#conferencesToFetch.splice(0, 256);
	}

	async getHtml(url: string): Promise<Document | null> {
		const cleaned = new URL(
			url,
			"https://www.churchofjesuschrist.org/",
		).toString();
		const promise = fetch(cleaned, { method: "GET" }).then(async (val) => {
			if (!val.ok) return null;
			return new JSDOM(await val.text(), { pretendToBeVisual: true }).window
				.document;
		});
		return await promise;
	}
}


function cleanWeirdUnicode(text: string): string {
  return text.replaceAll(/[\u2000-\u200A\u00A0\u202F\u205F\u3000]/g, ' ').replaceAll(/[\u201C-\u201f\u2039\u203A\u2E42\u00AB\u00BB]/g, '"').replaceAll(/[\u2018-\u201B]/g, "'").replaceAll('\r', '')
}