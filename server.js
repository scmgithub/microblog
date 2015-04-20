//app requirements
var secrets = require('./secrets.json');
var express = require('express')
var app = express();
// set templating engine
var ejs = require('ejs')
app.set("view_engine", "ejs")
// use body parser to parse the body
var bodyParser = require('body-parser')
// tell app which method to use when parsing
app.use(bodyParser.urlencoded({extended: false}))

// allow for method override
var methodOverride = require('method-override')
// tell app which override method to use
app.use(methodOverride('_method'))

// get access to the sqlite3 module
var sqlite3 = require('sqlite3').verbose();
// specify which file is the database
var db = new sqlite3.Database('microblog.db');

// for email integration
var sendgrid=require("sendgrid")(secrets['api_user'], secrets['api_key']);

app.get('/', function(req, res) {
	res.redirect('/microblog');
});

// provide access to static files (like css files)
app.use(express.static('public'));

//show all micro_posts
//  spec says this route should be called "/feed"
app.get('/feed', function(req, res) {
	res.redirect('/microblog');
});

app.get('/microblog', function(req, res) {
	/// scm:  here's where, maybe someday, we'll select the sticky posts first, then the non sticky posts
	///    have to work out ordering within sticky / non-sticky.
	// db.all("select * from micro_posts where sticky_until is not null order by id", function (sErr, sRows) {
	// 	if(sErr) {
	// 		throw sErr;
	// 	}
	// 	console.log("Sticky:");
	// 	console.log(sRows);
		db.all("select * from micro_posts where sticky_until is null order by id", function (err, rows) {
			if(err) {
				throw err;
			}
			db.all("select * from authors", function (authorErr, authorRows) {
				if(authorErr) {
					throw authorErr;
				}
				db.all("select distinct name from tags", function (tagErr, tagRows) {
					if(tagErr) {
						throw tagErr;
					}
					res.render('index.ejs', { micro_posts : rows, authors : authorRows, tags : tagRows });
				});	
			});
		});
	});
//});  this line for sticky posts, someday maybe

//show individual micro_post
app.get('/micro_post/:id', function(req, res) {
	//get micro_post id from url, set thisMicroPost to appropriate micro_post

	db.get("select * from micro_posts where id = ?", parseInt(req.params.id), function(pErr, row) {
        if(pErr) { 
            throw pErr;
        }
        db.get("select name from authors where id = ? and id != 0", parseInt(row.author_id), function(aErr, authRow) {
			if(aErr) {
				throw aErr;
			}
			if (!authRow) {
				authRow = { name : null };
			}
			db.all("select name from tags where micro_post_id = ?", parseInt(req.params.id), function(tErr, tagRows) {
				if(tErr){
					throw tErr;
				}
				db.all("select url from snippets where micro_post_id = ?", parseInt(req.params.id), function(sErr, snippetRows) {
					if (sErr) {
						throw sErr;
					}
					res.render('show_micro_post.ejs', { thisMicroPost : row, author : authRow, tags : tagRows, snippets : snippetRows } );
				});
			});
		});
    });
});

// show micro_posts by author
app.post('/authors/find', function(req, res) {
	db.all("select * from micro_posts where author_id = ?", parseInt(req.body.author_id), function(err, rows) {
		if (err){
			throw err;
		}
		db.get("select name from authors where id = ?", parseInt(req.body.author_id), function(aErr, aRow) {
			if(aErr) {
				throw aErr;
			}
			//console.log(aRow);
			res.render('show_author_feed.ejs', { author : aRow, posts : rows });
		});
	}); 
});

// show micro_posts by tag
app.post('/tags/find', function(req, res) {
	db.all("select * from micro_posts where id in (select micro_post_id from tags where name = ?)", req.body.tag_name, function(err, rows) {
		if (err) {
			throw err;
		}
		//console.log(rows);
		res.render('show_tag_feed.ejs', { posts : rows, tag : req.body.tag_name });
	});
});

// add email address
app.post('/addmail', function (req, res) {
	db.run("insert into mail_list (email, name) values (?, ?)", req.body.email, req.body.name, function (err) {
		if (err) {
			throw err;
		}
		res.render('show_email_message.ejs', { mail : { address : req.body.email, name : req.body.name } });
	});
});

//serve up new page for create a micro_post form
app.get('/micro_posts/new', function(req, res) {
	db.all("select * from authors", function (err, authorRows) {
		var fakeName;
		if(err) {
			throw err;
		}
		if(authorRows===undefined) {
			fakeName = "add an author below";
		} else {
			fakeName = "select an author";
		}
		authorRows.unshift({ id: 0, name: fakeName });

		res.render('new_micro_post.ejs', { authors : authorRows });
	});
});

//create a micro_post
app.post('/microblog', function(req, res) {
	// handle spaces and newlines in body
	var processed_body = req.body.body.replace(/[\n\r]{1,2}/g,"<br>").replace(/\s/g,"&nbsp;");

	// author_id should be > 0 and newAuthor should be empty, 
	//   or author_id should be zero (invalid) and newAuthor should be nonempty
	var processed_auth_id = req.body.author_id;
	if (processed_auth_id > 0 && req.body.newAuthor) {  // this should not happen because of client-side validation
		console.log("Weirdness in create post:  user specified two authors.");
	}

	//  if there's a new author, add him to the author table
	if (req.body.newAuthor) {
		db.run("insert into authors (name) select ? where not exists (select 1 from authors where name = ?)", req.body.newAuthor, req.body.newAuthor, function(err) {
			// funky syntax avoids adding an author who is already there
			//	db.run("insert into authors (name) values (?)", req.body.newAuthor, function(err) {
			if(err) { 
				throw err; 
			}
			// now we need his id
			db.get("select id from authors where name = ?", req.body.newAuthor, function(err, row) {
				if (err) {
					throw err;
				}
				processed_auth_id = row.id;
				// save the new micro_post to the db
				db.run("insert into micro_posts (title, body, author_id, sticky_until) values (?, ?, ?, ?)", req.body.title, processed_body, processed_auth_id, req.body.sticky_until, function(err) {
					if(err) { 
						throw err; 
					}
					// notify interested parties about new post
					db.all("select * from mail_list", function(err, mailRows) {
						if (err) {
							throw err;
						}
						if (mailRows.length > 0) {
							var email=new sendgrid.Email();
							email.setFrom("scm.phub@gmail.com");
							email.setSubject("New post on the MicroBlog");
							email.setText('New post:  '+req.body.title);
							for (var i=0; i<mailRows.length; i++) {
								console.log("Emailing "+mailRows[i].name+" at "+mailRows[i].email+": "+req.body.title);
								email.addTo(mailRows[i].email);
							}
							sendgrid.send(email, function(err, json) { 
								if (err) {
									return console.error(err);
								}
								console.log (json); 
							});
						}
					});

					//go to /microblog so we can see our new micro_post
					res.redirect('/microblog');
			    });
			});
    	});
	} else {
		// save the new micro_post to the db
		db.run("insert into micro_posts (title, body, author_id, sticky_until) values (?, ?, ?, ?)", req.body.title, processed_body, processed_auth_id, req.body.sticky_until, function(err) {
			if(err) { 
				throw err; 
			}
			// notify interested parties about new post
			db.all("select * from mail_list", function(err, mailRows) {
				if (err) {
					throw err;
				}
				if (mailRows.length > 0) {
					var email=new sendgrid.Email();
					email.setFrom("scm.phub@gmail.com");
					email.setSubject("New post on the MicroBlog");
					email.setText('New post:  '+req.body.title);
					for (var i=0; i<mailRows.length; i++) {
						console.log("Emailing "+mailRows[i].name+" at "+mailRows[i].email+": "+req.body.title);
						email.addTo(mailRows[i].email);
					}
					sendgrid.send(email, function(err, json) { 
						if (err) {
							return console.error(err);
						}
						console.log (json); 
					});
				}
			});

			//go to /microblog so we can see our new micro_post
			res.redirect('/microblog');
	    });
	}
});

//sending user to edit form
app.get('/micro_post/:id/edit', function(req, res) {
	db.get ("select * from micro_posts where id = ?;", parseInt(req.params.id), function(err, row) {
		if(err) {
			throw err;
		}
		db.all("select * from authors", function (err, authorRows) {
			var fakeName;
			if(err) {
				throw err;
			}
			if(authorRows===undefined) {
				fakeName = "add an author below";
			} else {
				fakeName = "select an author";
			}
			authorRows.unshift({ id: 0, name: fakeName });

			db.all("select * from tags where micro_post_id = ?", parseInt(req.params.id), function(tErr, tagRows) {
				if(tErr) {
					throw tErr;
				}
				res.render("edit_micro_post.ejs", { thisMicroPost : row, authors : authorRows, tags : tagRows });
			})
		});
	});
});

//update a micro_post
app.put('/micro_post/:id', function(req, res) {
	// handle spaces and newlines in body
	var processed_body = req.body.body.replace(/[\n\r]{1,2}/g,"<br>").replace(/\s/g,"&nbsp;");

	// did we get tags?
	// FIXME!  This may not complete in time.
	// Just make this work.

	db.run("delete from tags where micro_post_id = ?;", parseInt(req.params.id), function(err) {
		if(err) { 
			throw err; 
		}

		var processed_tags = req.body.tags && req.body.tags.trim().split(/\s*,\s*/);
		if (processed_tags.length > 0) {
			var query = "insert into tags (name, micro_post_id) values ";
			for (var i = 0; i<processed_tags.length; i++) {
				query += "('"+processed_tags[i]+"',"+req.params.id+"),";
			}
			query=query.replace(/,$/,";");
			db.run(query, function(err) {
				if (err) {
					throw err;
				}
			});
		}
	});

	// author_id should be > 0 and newAuthor should be empty, 
	//   or author_id should be zero (invalid) and newAuthor should be nonempty
	var processed_auth_id = req.body.author_id;
	if (processed_auth_id > 0 && req.body.newAuthor) {  // this should not happen because of client-side validation
		console.log("Weirdness in update post:  user specified two authors.");
	}

	//  if there's a new author, add him to the author table
	if (req.body.newAuthor) {
		db.run("insert into authors (name) select ? where not exists (select 1 from authors where name = ?)", req.body.newAuthor, req.body.newAuthor, function(err) {
			// funky syntax avoids adding an author who is already there
			//db.run("insert into authors (name) values (?)", req.body.newAuthor, function(err) {
			if(err) { 
				throw err; 
			}
			// now we need his id
			db.get("select id from authors where name = ?", req.body.newAuthor, function(err, row) {
				if (err) {
					throw err;
				}
				processed_auth_id = row.id;
				//make changes to appropriate micro_post
				db.run("update micro_posts set title = ?, body = ?, author_id = ?, sticky_until = ? where id = ?;", req.body.title, processed_body, processed_auth_id, req.body.sticky_until, parseInt(req.params.id), function (err, data) {
					if(err) {
						throw err; 
					}
					//redirect to this micro_post's page to see changes
					res.redirect('/micro_post/' + parseInt(req.params.id));
			    });
			});
    	});
	} else {
		//make changes to appropriate micro_post
		db.run("update micro_posts set title = ?, body = ?, author_id = ?, sticky_until = ? where id = ?;", req.body.title, processed_body, req.body.author_id, req.body.sticky_until, parseInt(req.params.id), function (err, data) {
			if(err) {
				throw err; 
			}
		
			if (req.body.snippet) {
			// 	var snippet = req.body.snippet;
			// 	var netrequest = require("request");
			// 	netrequest(snippet, function(err, response, body) {
			// 		if (err) {
			// 			console.log("Error on request to " + snippet + ": " + err);
			// 		} else {
			// 			console.log("RESPONSE:");
			// 			console.log(response);
			// 			console.log(":RESPONSE");
			// 			console.log("BODY:");
			// 			console.log(body);
			// 			console.log(":BODY");
			// 		}
			// 		process.exit();
			// 	});
				db.run("insert into snippets (url, micro_post_id) values (?, ?)", req.body.snippet, req.params.id, function (err) {
					if (err) {
						throw err;
					}
				});
			}
			//redirect to this micro_post's page to see changes
			res.redirect('/micro_post/' + parseInt(req.params.id));
		});
	}
});

//delete a micro_post

	/// scm  will I need a trigger for this?
app.delete('/micro_post/:id', function(req, res) {
	db.run("delete from micro_posts where id = ?;", parseInt(req.params.id), function(err) {
		if(err) { 
			throw err; 
		}
	});
	//go to /microblog to see change
	res.redirect('/microblog');
});

var port = secrets['port'];  //fancy hosting!
app.listen(port, function() {
	console.log('Listening on port '+port);
});
