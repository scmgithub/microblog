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
	url TEXT,
	micro_post_id INTEGER
);

DROP TABLE IF EXISTS tags;
CREATE TABLE tags (
	id INTEGER PRIMARY KEY,
	name TEXT,
	micro_post_id INTEGER,
	UNIQUE(name, micro_post_id) ON CONFLICT IGNORE
);

DROP TABLE IF EXISTS mail_list;
CREATE TABLE mail_list (
	id INTEGER PRIMARY KEY,
	email TEXT,
	name TEXT,
	UNIQUE(email, name) ON CONFLICT IGNORE
);