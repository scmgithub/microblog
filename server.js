//app requirements
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
	/// scm:  here's where we select the sticky posts first, then the non sticky posts
	///    have to work out ordering within sticky / non-sticky.

app.get('/microblog', function(req, res) {
	db.all("select * from micro_posts where sticky_until is not null order by id", function(err, rows) {
		if(err) {
			throw err;
		}
		console.log("Sticky:");
		console.log(rows);
		db.all("select * from micro_posts where sticky_until is null order by id", function(err, rows) {
			if(err) {
				throw err;
			}
//			console.log(rows);
			res.render('index.ejs', { micro_posts : rows });
		});
	});
});

//show individual micro_post
app.get('/micro_post/:id', function(req, res) {
	//get micro_post id from url, set thisMicroPost to appropriate post

	db.get("select * from micro_posts where id = ?", parseInt(req.params.id), function(err, row) {
        if(err) { 
            throw err;
        }
		res.render('show_micro_post.ejs', { thisMicroPost : row });
//		res.render('show_micro_post.ejs', { thisMicroPost : row }, { tags : tagRows}, { snippets : snippetRows } );
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
console.log("AUTHORROWS:");
console.log(authorRows)
console.log(":AUTHORROWS");
		res.render('new_micro_post.ejs', { authors : authorRows });
	});
});

//create a micro_post
app.post('/microblog', function(req, res) {
	// author_id should be > 0 and newAuthor should be empty, 
	//   or author_id should be zero (invalid) and newAuthor should be nonempty
	var processed_auth_id = req.body.author_id;
	if (processed_auth_id > 0 && req.body.newAuthor) {  // this should not happen because of client-side validation
		console.log("Weirdness in create post:  user specified two authors.");
	}

	//  if there's a new author, add him to the author table
	if (req.body.newAuthor) {
		db.run("insert into authors (name) values (?)", req.body.newAuthor, function(err) {
			if(err) { 
				throw err; 
			}
			// now we need his id
			db.get("select id from authors where name = ?", req.body.newAuthor, function(err, row) {
				if (err) {
					throw err;
				}
				processed_auth_id = row;
			});
    	});
	}

	// handle spaces and newlines in body
	var processed_body = req.body.body.replace(/[\n\r]{1,2}/g,"<br>").replace(/\s/g,"&nbsp;");

	// save the new micro_post to the db
	db.run("insert into micro_posts (title, body, author_id, sticky_until) values (?, ?, ?, ?)", req.body.title, processed_body, processed_auth_id, req.body.sticky_until, function(err) {
		if(err) { 
			throw err; 
		}
		//go to /microblog so we can see our new micro_post
		res.redirect('/microblog');
    });
});

//sending user to edit form
app.get('/micro_post/:id/edit', function(req, res) {
	db.get ("select * from micro_posts where id = ?;", parseInt(req.params.id), function(err, row) {
		if(err) {
			throw err;
		}
		res.render("edit_micro_post.ejs", { thisMicroPost : row })
	});
});

//update a micro_post
app.put('/micro_post/:id', function(req, res) {
	//make changes to appropriate micro_post
	db.run("update micro_posts set title = ?, body = ?, author_id = ?, sticky_until = ? where id = ?;", req.body.title, req.body.body, req.body.author_id, req.body.sticky_until, parseInt(req.params.id), function (err, data) {
		if(err) {
			throw err; 
		}
	});
	//redirect to this micro_post's page to see changes
	res.redirect('/micro_post/' + parseInt(req.params.id));
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

var port = 3000;
app.listen(port);
console.log('Listening on port '+port);
