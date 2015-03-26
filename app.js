
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , mongoose = require('mongoose')
  , _ = require('lodash')

/**
 * Var to load env config
 */
var config;

/**
 * Instantiate Express application
 */
var app = express();

/**
 * Configure the application server for expressjs
 */
app.configure(function () {
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

/**
 * Load Env based files i.e. /config/<env>.js
 */
app.configure('development', function () {
  app.use(express.errorHandler());
  config = require('./config/development');
});

app.configure('production', function () {
  config = require('./config/production');
});

/**
 * Connect to the Database using Mongoosejs orm
 * http://mongoosejs.com
 */
mongoose.connect(config.mongodb.uri);

/**
 * An api access point to create emails
 */
app.post('/queues', function (req, res, next) {

  Queue.create(req.body, function(err) {
    if (err) next(err);
  });

  return res.json({done: true});
});

/**
 *  ##############################################
 *
 *                  Email Gun
 *  
 *  ##############################################
 *
 */


/**
 * require dependencies. All a part of of Nodejs than expressjs
 *
 *  ChildProcess - https://nodejs.org/api/child_process.html
 *   - This essentially would create a Child Process with a whole new PID for the process.
 *
 *  Queue - Our Mongoose model for the Queues collection inside of Mongodb
 *
 *  Processes - to store instance of proceses in a JS object
 */
var childProcess = require('child_process')
  , Queue = require('./models/Queue')
  , processes = {};

/**
 * Api access point to start sending emails
 */
app.get('/send-emails', function (req, res, next) {

  /**
   * Find emails from the database and trigger start processing
   * Uses a simple 
   */
  Queue
    .find(config.emailGun.queryToFindEmails)
    .exec(function(err, emailsToBeSent) {

      if (err) return next(err);

      /**
       * 
       */
      if (emailsToBeSent) {

        if (emailsToBeSent.length === 0) return res.json({message: 'No emails to be sent'});

        /**
         * Send a response to the client to not keep in waiting
         */

        res.json({message: 'Processing has begun, thanks !'});

        /**
         * Quick variables 
         */
        var noOfProcesses = config.emailGun.noOfProcesses // no of threads
          , failedEmails = [] // so that the status can be updated later
          , counter = 0
          , i;

        var emails = _.uniq(emailsToBeSent, 'toEmailAddress') // uniq your to be sent email recipients
          , totalEmails = emails.length;

        var emails = emailsToBeSent // uniq your to be sent email recipients
          , totalEmails = emails.length;

        if (totalEmails >= 10) {

          /**
           * Start creating child processes and add event listeners to each one of them
           */
          for (i = noOfProcesses; i > 0; i--) {

            /**
             * Create a child process each time using fork
             * this child process would run the small piece of code responsible for sending
             * out emails in the email_gun_child_process.js file
             */
            processes[i] = childProcess.fork(__dirname + '/email_gun_child_process.js');

            /**
             * Add a listener whenever the process sends out information
             */
            processes[i].on('message', function(data) {

              /**
               * Increase the counter to determine the no of emails processed (both sent and failed)
               * If the counter comes to equal the no of emails that were to be processed then
               * we call the endProcesses function to end the childprocesses
               * Else we increase the counter
               */
              (counter === totalEmails) ? endProcesses() : ++counter;
              console.log('Total emails processed - ', counter);
              console.log('---------------------------------------------');

              /**
               * Store the email record data which was failed to send in an array to be processed later
               */
              if (data.failedEmail) failedEmails.push(data.failedEmail);
            });
          }
        } else {
          processes['1'] = childProcess.fork(__dirname + '/email_gun_child_process.js');
          processes['1'].on('message', function(data) {

            (counter === totalEmails) ? endProcesses() : ++counter;
            console.log('Total emails processed - ', counter);
            console.log('---------------------------------------------');

            /**
             * Store the email record data which was failed to send in an array to be processed later
             */
            if (data.failedEmail) failedEmails.push(data.failedEmail);

          });
        }

        /**
         * Get the emails in almost equal no of chunks
         * ex result would be :
         *   emailsInChunks = [[1000 emails], [1000 emails], [1000 emails], [1000 emails].. n]
         *   where n = noOfProcesses which can be configured from the env config files
         */
        var emailsInChunks = (totalEmails >= 10) ? getEmailsInChunks(emails, noOfProcesses) : [emails];

        var len = emailsInChunks.length - 1
          , j = 1
          , i;

        /**
         * Run the loop to send out those chunks of emails to each process.
         * Information to the child processes are sent only and only once.
         */
        for (i = len; i >= 0; i--) {

          var emails = emailsInChunks[i];
          if (i >= 0) {

            /**
             * Send information such as 
             * - the emails from a chunk
             * - the config file
             * - child process number
             */
            processes[j].send({ emails: emails, config: config, processNo: j});
            if (totalEmails >= 10) {
              j = (j === 10) ? 1 : ++j; // reset counter for child process
            }
          }
        }
      }
  });
});

/**
 * This code deals with cutting out a huge array of emails into equal chunks
 * of n (n=no of child processes)
 */
var getEmailsInChunks = function getEmailsInChunks (emails, noOfProcesses) {

  /**
   * example in comments- 
   */

  // no of emails = 10055
  var totalEmails = emails.length

    // noOfEmailsInChunk = 1005 - the floor would cut out decimals 
    , noOfEmailsInChunk = Math.floor(totalEmails/noOfProcesses)

    // now consider those unassorted decimals here = 5
    , unassortedOnThePlate = totalEmails - (totalEmails%noOfProcesses)

    // use lodash's take to slice and save for all emails up until 10050
    , slicedEmails = _.take(emails, unassortedOnThePlate)

    // use lodash's takeRight to consider the last unassorted ones i.e. 5
    , dressingOnTheSide = _.takeRight(emails, (totalEmails%noOfProcesses));

  // cut them in chunks of 10050 each
  var emailsInChunks = _.chunk(slicedEmails, noOfEmailsInChunk);

  // append that dressing (5 emails) to the last chunk of array
  var lastChunk = emailsInChunks[emailsInChunks.length - 1];

  lastChunk.push(dressingOnTheSide);
  lastChunk = _.flatten(lastChunk);

  // assign it back to emails in chunks
  emailsInChunks[emailsInChunks.length - 1] = lastChunk;

  return emailsInChunks;

};

/**
 * This function deals with ending all the Child processes once the emails are processed
 */
var endProcesses = function endProcesses () {
  console.log('############################################################### ');
  console.log('Ending the Child Processes, all emails are processed');
  console.log('############################################################### ');
  _.forEach(processes, function (val, key) {
    processes[key].kill('SIGHUP');
  })
};

/**
 * Start the http server
 */
http.createServer(app).listen(config.server.port, function(){
  console.log("Express server listening on port " + app.get('port'));
});
