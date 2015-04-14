DROP TABLE IF EXISTS micro_posts;
CREATE TABLE micro_posts (
	id INTEGER PRIMARY KEY,
	title TEXT, 
	body TEXT,
 	author_id INTEGER,
 	sticky_until INTEGER
);

DROP TABLE IF EXISTS authors;
CREATE TABLE authors (
	id INTEGER PRIMARY KEY,
	name TEXT
);

DROP TABLE IF EXISTS snippets;
CREATE TABLE snippets (
	id INTEGER PRIMARY KEY,
	micro_post_id INTEGER
);

DROP TABLE IF EXISTS tags;
CREATE TABLE tags (
	id INTEGER PRIMARY KEY,
	name TEXT,
	micro_post_id INTEGER
);

DROP TABLE IF EXISTS maillist;
CREATE TABLE maillist (
	id INTEGER PRIMARY KEY,
	email TEXT,
	name TEXT
);