#Email Gun

This is a simple piece of code written in Javascript using NodeJS platform which scales using [Child Processes](http://nodejs.org/api/child_process.html).

## Installation

Clone

```
	git clone git@github.com:ktkaushik/EmailGun.git
```

Install

```
	npm install
```

##Dependencies

This module depends on 

-	NodeJS
- 	ExpressJS
- 	Mongodb
-	Mongoosejs (Mongodb orm)
-	Nodemailer
-	Nodemailer SMTP Transport
-	Lodash (for ease of life)

##Setup

Once you have all the installations complete, you can run `node app.js` to kick off the server.

Please make sure to change the settings if needed under the [config folder](https://github.com/ktkaushik/EmailGun/tree/master/config). More info is within the comments on the page. *There are default values setup for now*

Please go through Nodemailer to understand to setup smtp service of your choice and integration. example - [Sendgrid](https://github.com/sendgrid/nodemailer-sendgrid-transport)

You can go through the Schema with the fields on [Queue Model](https://github.com/ktkaushik/EmailGun/blob/master/models/Queue.js#L13).

The fields are - 

-	toEmailAddress
-	fromEmailAddress
-	body
-	subject
- 	status

You can create records in the Queues collection by POSTing to the `/queues` api access point.

##Architecture

To trigger off the emails, you will need to make a GET call to `/send-emails`.

What happens once you call `/send-emails` ?

	-	A query is called to find emails from the database which then begins procedure
	- 	Start the Child processes
	- 	Cut out the Emails we received from the DB to almost equal chunks
	-	Pass these chunks of emails to the Child Processes we already created
	-	Once the email is sent, we update the counter
	- 	Once the counter indicates that all the emails are processed then we end all the processes

