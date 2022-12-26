const pg = require('pg')
const config = require('./config')
pg.defaults.ssl = true


const pool = new pg.Pool(config.PG_CONFIG);

pool.on('error', function(err, client) {
  console.error('idle client error', err.message, err.stack);
});

module.exports.query = function(text, values, callback) {
  return pool.query(text, values, callback);
};

module.exports.connect = function() {
  return pool.connect();
};