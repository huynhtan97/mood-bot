// Utilizing IBM Cloud Tone Detection Service

'use strict';
/* eslint-env es6 */

// promises js lib
var Promise = require('bluebird');

/**
 * Public functions for this module
 */
module.exports = {
  updateUserTone: updateUserTone,
  invokeToneAsync: invokeToneAsync,
};

/**
 * invokeToneAsync is an asynchronous function that calls the Tone Analyzer
 * service and returns a Promise
 *
 * @param {Json}
 *                conversationPayload json object returned by the Watson
 *                Conversation Service
 * @param {Object}
 *                toneAnalyzer an instance of the Watson Tone Analyzer service
 * @returns {Promise} a Promise for the result of calling the toneAnalyzer with
 *          the conversationPayload (which contains the user's input text)
 */
function invokeToneAsync(conversationPayload, toneAnalyzer) {
  return new Promise(function(resolve, reject) {
    if (!conversationPayload.input || !conversationPayload.input.text || conversationPayload.input.text.trim() == '')
      resolve(conversationPayload);
    toneAnalyzer.tone({
      text: conversationPayload.input.text
    }, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * updateUserTone processes the Tone Analyzer payload to pull out the emotion,
 * language and social tones, and identify the meaningful tones (i.e., those
 * tones that meet the specified thresholds). The conversationPayload json
 * object is updated to include these tones.
 *
 * @param {Json}
 *                conversationPayload json object returned by the Watson
 *                Conversation Service
 * @param {Json}
 *                toneAnalyzerPayload json object returned by the Watson Tone
 *                Analyzer Service
 * @param {boolean}
 *                maintainHistory set history for each user turn in the history
 *                context variable
 * @returns {void}
 */
function updateUserTone(conversationPayload, toneAnalyzerPayload, maintainHistory) {
  if (!conversationPayload.context.skills['main skill'].user_defined.userTone) {
    conversationPayload.context.skills['main skill'].user_defined.userTone = {};
  }

  if (!conversationPayload.context.skills['main skill'].user_defined.userTone.user) {
    conversationPayload.context.skills['main skill'].user_defined.userTone.user = initUser();
  }

  // For convenience sake, define a variable for the user object
  var user = conversationPayload.context.skills['main skill'].user_defined.userTone.user;

  // Extract the tones - emotion, language and social
  if (toneAnalyzerPayload && toneAnalyzerPayload.document_tone) {
    const primaryTone = toneAnalyzerPayload.document_tone.tones.reduce((a, b) => (a.score > b.score) ? a : b, {});
    updateTone(user, primaryTone, maintainHistory);
  }
  conversationPayload.context.skills['main skill'].user_defined.userTone.user = user;
  return conversationPayload;
}

/**
 * initToneContext initializes a user object containing tone data (from the
 * Watson Tone Analyzer)
 *
 * @returns {Json} user json object with the emotion, language and social tones.
 *          The current tone identifies the tone for a specific conversation
 *          turn, and the history provides the conversation for all tones up to
 *          the current tone for a conversation instance with a user.
 */
function initUser() {
  return ({
    'tone': {
      current: null
    }
  });
}

/**
 * updateTone updates the user emotion tone with the primary emotion -
 * the emotion tone that has a score greater than or equal to the
 * EMOTION_SCORE_THRESHOLD; otherwise primary emotion will be 'neutral'
 *
 * @param {Json}
 *                user a json object representing user information (tone) to be
 *                used in conversing with the Conversation Service
 * @param {Json}
 *                emotionTone a json object containing the emotion tones in the
 *                payload returned by the Tone Analyzer
 * @param {boolean}
 *                maintainHistory set history for each user turn in the history
 *                context variable
 * @returns {void}
 */
function updateTone(user, primaryTone, maintainHistory) {
  let data;
  if (Object.entries(primaryTone).length === 0 && primaryTone.constructor === Object) {
    data = null;
  } else {
    // update user emotion tone
    data = primaryTone;
  }
  user.tone.current = data;
  if (maintainHistory) {
    if (typeof user.tone.history === 'undefined') {
      user.tone.history = [];
    }

    user.tone.history.push(data);
  }
}

