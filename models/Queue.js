
/**
 * Simple queue model 
 */

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

/**
 * Queue Schema
 */

var queueSchema = new Schema({
  fromEmailAddress: String,
  toEmailAddress: String,
  subject: String,
  status: { type: String, default: 'queued'}, // status of the email in queue
  body: String
});

module.exports = mongoose.model('Queue', queueSchema);
