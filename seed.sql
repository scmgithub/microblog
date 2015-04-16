insert into micro_posts (title, body, author_id, sticky_until) values 
	("Title 1", "Body 1", null, null),
	("Title 2", "Body 2", null, null),
	("Title 3", "Body 3", null, null),
	("body with whitespace", "line1
line2
line3spaces->           <-spaces

line5


line8(end)", null, null),
	("body with parsed whitespace","line1<br>line2<br>line3spaces->&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<-spaces<br><br>line5<br><br><br>line8(end)", null, null);

insert into authors (name) values
	("Author Name1"),
	("Author Name2"),
	("Author Name3");