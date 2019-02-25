#!/usr/bin/env

/**
 * Setting up Express server
 * Call nodemon for testing - Requires nodejs ver > 7.0
 * To run application: npm start
 */

'use strict';

require('dotenv').config({silent: true});

var server = require('./app');
var port = process.env.PORT || 3000;

server.listen(port, function() {
  // eslint-disable-next-line
  console.log('Server running on port: %d', port);
});
