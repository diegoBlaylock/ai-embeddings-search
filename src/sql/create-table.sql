-- Setup

DROP SCHEMA IF EXISTS ai CASCADE;
CREATE SCHEMA ai;

-- Entities

CREATE TABLE ai.address (
  id SERIAL,
  street VARCHAR(64) NOT NULL,
  city VARCHAR(64) NOT NULL,
  state CHAR(2) NOT NULL,
  zip CHAR(5) NOT NULL CHECK (zip ~ '^[0-9]+$' ),
  PRIMARY KEY (id)
);

CREATE TABLE ai.paper (
  id SERIAL,
  title VARCHAR(128) NOT NULL,
  abstract TEXT NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE TYPE ai.Location AS ENUM ('online', 'physical');

CREATE TABLE ai.university (
  id SERIAL,
  name VARCHAR(64) NOT NULL,
  short_name VARCHAR(10),
  address_id INT UNIQUE, -- Not null for the case of online university
  type ai.Location  NOT NULL,
  PRIMARY KEY(id),
  FOREIGN KEY (address_id) REFERENCES ai.address (id)
);
CREATE INDEX index_on_university_name ON ai.university (name);

CREATE TABLE ai.person (
  id SERIAL,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address_id INT NOT NULL,
  university_id INT,
  PRIMARY KEY (id),
  FOREIGN KEY (address_id) REFERENCES ai.address (id),
  FOREIGN KEY (university_id) REFERENCES ai.university (id),
  UNIQUE (email)
);

CREATE INDEX index_on_last_name ON ai.person (last_name);

CREATE TABLE ai.keyword (
  id SERIAL,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE (name)
);

CREATE TABLE ai.domain (
  id SERIAL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255),
  PRIMARY KEY (id),
  UNIQUE (name)
);

-- Relationships
CREATE TABLE ai.paper_author(
  paper_id INT NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (paper_id, author_id),
  FOREIGN KEY (paper_id) REFERENCES ai.paper (id),
  FOREIGN KEY (author_id) REFERENCES ai.person(id)
);

CREATE TABLE ai.paper_reviewer(
  paper_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  PRIMARY KEY (paper_id, reviewer_id),
  FOREIGN KEY (paper_id) REFERENCES ai.paper (id),
  FOREIGN KEY (reviewer_id) REFERENCES ai.person(id)
);

CREATE TABLE ai.paper_keyword(
  paper_id INT NOT NULL,
  keyword_id INT NOT NULL,
  PRIMARY KEY (paper_id, keyword_id),
  FOREIGN KEY (paper_id) REFERENCES ai.paper (id),
  FOREIGN KEY (keyword_id) REFERENCES ai.keyword(id)
);

CREATE TABLE ai.person_domain(
  person_id INT NOT NULL,
  domain_id INT NOT NULL,
  PRIMARY KEY (person_id, domain_id),
  FOREIGN KEY (person_id) REFERENCES ai.person (id),
  FOREIGN KEY (domain_id) REFERENCES ai.domain(id)
);

/*
ENTITIES
  - Paper
  - Person {Author, Reviewers}
  - Keywords
  - Addresses
  - university
  - Expertise
*/

/*
Relationships
  - Author > -- < Paper
  - Paper > -- < Reviewers
  - Paper > -- < Keywords
  - Person > -- - university
  - university - -- - Address
  - Person - -- - Address
*/