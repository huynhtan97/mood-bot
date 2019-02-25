/**
 * Main code for An Chat Bot
 */

 // For linting code
'use strict';

// app server - expressjs
var express = require('express');
// parser for post requests
var bodyParser = require('body-parser');
// watson assistant sdk
var AssistantV2 = require('watson-developer-cloud/assistant/v2'); 
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
// tone detector code
const toneDetection = require('./addons/tone_detection'); 
// interceptor added to parse mood and weather messages
const responseInterceptors = require('./responseInterceptor'); 
const maintainToneHistory = true;

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

var assistant = new AssistantV2({
  version: '2018-11-08'
});

// Instantiate the Watson Tone Analyzer Service as per WDC 2.2.0
var toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21'
});

var newContext = {
  global : {
    system : {
      turn_count : 1
    }
  },
  skills: {
    "main skill": {
      user_defined: {
        userTone: {}
      }
    }
  }
};

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var contextWithAcc = (req.body.context) ? req.body.context : newContext;

  if (req.body.context) {
    contextWithAcc.global.system.turn_count += 1;
  } 

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
  }

  // The user's information being sent to Watson Assistant 
  var payload = {
    assistant_id: assistantId,
    session_id: req.body.session_id,
    context: contextWithAcc,
    input: {
      message_type : 'text',
      text : textIn,
      options : {
        return_context : true
      }
    }
  };

  // Send the input to the assistant service
  toneDetection.invokeToneAsync(payload, toneAnalyzer).then(function(tone) {
    toneDetection.updateUserTone(payload, tone, maintainToneHistory);
    assistant.message(payload, function (err, data) {
      if (err) {
        return res.status(err.code || 500).json(err);
      }
      // Sends user's inputs to responseInterceptor.js to be processed by Weather and Tone Analyzer API
      responseInterceptors(data).then(newData => {
        return res.json(newData);
      }).catch(err => {
        return res.json(data);
      });
    });
  });
});

app.get('/api/session', function (req, res) {
  assistant.createSession({
    assistant_id: process.env.ASSISTANT_ID || '{assistant_id}',
  }, function (error, response) {
    if (error) {
      return res.send(error);
    } else {
      return res.send(response);
    }
  });
});

// If you require('app.js'), you get app
module.exports = app;