-- Setup

DROP SCHEMA IF EXISTS ai CASCADE;
CREATE SCHEMA ai;

CREATE EXTENSION IF NOT EXISTS vector;

-- Entities

CREATE TABLE ai.talk (
  table_id SERIAL,
  title VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255),
  author VARCHAR(128) NOT NULL,
  calling VARCHAR(128),
  month CHAR(3) NOT NULL,
  year SMALLINT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (table_id)
);

CREATE TABLE ai.embedding (
  embedding_id SERIAL,
  table_id INT NOT NULL,
  embedding VECTOR(1536),
  PRIMARY KEY (embedding_id),
  FOREIGN KEY (table_id) REFERENCES ai.talk ON (table_id)
);