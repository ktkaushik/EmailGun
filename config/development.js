
/**
 * Development config
 */

module.exports = {

  mongodb: {
    uri: 'mongodb://localhost/queue_db' // db uri to connect. Name of the database is queue_db, please change it to your liking
  },

  server: {
    port: 3000 // port to run your express server
  },

  // email gun config
  emailGun: {

    // no of child processes, noOfProcesses > 0
    noOfProcesses: 10,

    // the db query to run to find emails which are to be sent
    queryToFindEmails: {
      status: 'queued'
    },

    // transporter for nodemailer configurations
    transporter: {
      host: "mailtrap.io",
      port: 25,
      auth: {
        user: <add your user here>,
        pass: <add your password here>
      }
    }
  }

};