# LDS General Conference Semantic Search

This project involves using postgres as a vector DB to store semantic embeddings for general conference talks since 2000
and query the database using a search term. The embeddings are generated using Open AI's `ada-002` model and for each talk,
8 cluster centers (K-means 10 iterations) for each of the sentence embeddings are produced along with embeddings for metacontent such as date, title, and subtitle.

This project supports interaction with the database through a cli (`pnpm run cli`) and experiment (`pnpm run experiment`) scripts.

## Quick setup

1. Environment
2. Uploading Data
3. Interacting

### 1. Environment

First, create a `.env` file with the following content (with you substitutions):

```sh
OPENAI_KEY=<$YOUR_OPEN_AI_KEY>
PG_CONNECTION_STRING=<$YOUR_PG_CONNECTION_STRING>
```

You will also need the pnpm package manager which can be installed using `npm i -g pnpm` which will require node to be installed (using NVM for example). Once installed, get the dependencies using `pnpm install`.

Additionally, a python installation (accessible using `python` command; won't work for `python3`) will need to have been installed with the following packages (using `pip`): `torch` (used v2.5.1), `pykeops` (used v2.2.3).

If you encounter problems, this project was developed in WSL 2.0 with a debian installation and a conda environment (python 3.12.2) and node (v22.13.1).

### 2. Uploading Data

Some precompiled data is found in `./data/talks.jsonl` which contains a smaller set up talks from 2012 and 10 embeddings.
To upload this to your pg server, the `vect` schema will be recreated with tables `vect.talk` and `vect.embedding`. The
sql schema to create the tables is contained in `./src/sql/create-table.sql`.

To setup the schema and tables (if nothing conflicts naming-wise), run `pnpm run upload:local`.

### 3. Interacting

Now you can interact with the database using `pnpm run cli`. You can do a semantic search which will provide you with talks that
best match the query string using cosine similarity. Additionally you can look at the text by looking up the talk ID.

This will require the `less` command to work.

## Other Scripts

Scripts are located in `src/ts/scripts/`. To change some of the behaviors, look for configuration variables listed at the top.

`pnpm run experiment`: runs a few queries against the vector db and records the results in `./output/results.json`.

`pnpm run download:local`: Download a small dataset to `./data/talks.jsonl` for talks ranging from 2012-PRESENT with 6 cluster embeddings + metacontent embeddings.

`pnpm run upload`: Will upload a larger dataset from 2000-PRESENT with 8 cluster embeddings. Takes around ~1-2 hours and will upload talks in batches.
