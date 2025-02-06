-- Setup


DROP SCHEMA IF EXISTS vect CASCADE;
CREATE SCHEMA vect;
GRANT ALL ON SCHEMA vect TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA vect TO PUBLIC;


CREATE EXTENSION IF NOT EXISTS vector;

-- Entities

CREATE TABLE vect.talk (
  talk_id SERIAL,
  title VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255),
  author VARCHAR(128) NOT NULL,
  calling VARCHAR(128),
  month CHAR(3) NOT NULL,
  year SMALLINT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (talk_id)
);

CREATE TABLE vect.embedding (
  embedding_id SERIAL,
  talk_id INT NOT NULL,
  embedding VECTOR(1536),
  PRIMARY KEY (embedding_id),
  FOREIGN KEY (talk_id) REFERENCES vect.talk (talk_id)
);

CREATE INDEX ON vect.embedding USING hnsw(embedding vector_cosine_ops);