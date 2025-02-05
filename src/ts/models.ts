export interface Talk {
	title: string;
	subtitle?: string;
	author: string;
	calling?: string;
	text: string;
	year: number;
	month: string;
}

export interface TalkWithVector extends Talk {
	embeddings: Float32Array[];
}
