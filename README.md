# MicroBlog

A basic, not-so-fancy micro-blogging application.
The microblog allows users to create, devour, update, and delete miniature blog posts.
Currently supports authors, tagging, and snippets (without preview).

Future development:
 - Snippet preview.
 - Sticky posts.
 - Reblog capability.
 - Integration (via tags) with Twitter api.
 - Make the thing look good.

CSS styling is not my bag.

## API used

 - SendGrid:  enables sending email notifications to users who want more email.

## NPM modules used

  - body-parser:  allows for parsing the body of incoming server requests
  - ejs:  javascript templating engine
  - express:  the type of http server we're using
  - method-override:  allows us to use "PUT" type http verbs
  - request:  for grabbing urls from the Internet
  - sendgrid:  enables email.  See API section
  - sqlite3:  our backend database is sqlite3

## To download code and run on localhost

  - Clone from GIT at https://github.com/scmgithub/microblog.git

## Trello board

  - Track my progress at https://trello.com/b/ittFshX9/wdi-project-1, if that's your thing.

## Live version

  - The server is running at http://www.stevemcintosh.us.  (a.k.a. http://104.236.90.68:80)
  		(Unless it isn't.)
