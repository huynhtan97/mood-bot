const moment = require('moment');
const apixu = require('apixu');

const apixuConfig = {
  // Refer to .env file
  apikey: process.env.APIXUKEY
};

// For making calls to apixu api
const clientApixu = new apixu.Apixu(apixuConfig);

// NOTE: General format for response to send to application:
// newResponses = [{
//     response_type: "text/image/options",
//     text: "string" / source: "string",
// }]
const updateTextResponse = (newResponses, data) => {
  const newData = data;
  newData.output.generic = newResponses;
  return newData;
};

// Where you get weather information IF it's a weather intent
const weatherInterceptors = async (data) => {
  try {
    const { output } = data;
    const isWeatherIntent = output.intents.find((item) => item.intent === 'AskWeather' && item.confidence > 0.8);
    // If it's not a weather intent, ignore and just return what the Assistant was going to say
    if (!isWeatherIntent) return data;
    // Getting the date and location from Watson Assistant's system entities
    const inputDate = output.entities.find((item) => item.entity === 'sys-date' && item.confidence > 0.8);
    const inputLocation = output.entities.find((item) => item.entity === 'sys-location' && item.confidence > 0.8);
    // Using momentjs to format inputDate
    const weatherDate = inputDate ? inputDate.value : moment().format('MM-DD-YYYY');
    // If no date is provided, just use default as Boston
    const weatherLocation = inputLocation ? inputLocation.value : 'Boston';
    // Taking the difference between the date the user wants to get weather for and today's - needed for Apixu api
    const milisecAmt = moment(new Date(weatherDate)).diff(moment());
    const dayAmt = Math.ceil(milisecAmt / (1000 * 60 * 60 * 24));
    // Calling apixu api
    const forecast = await clientApixu.forecast(weatherLocation, dayAmt + 1);
    const responses = [];
    // For the weather for any day besides today's - Note the API only works up to 10 days ahead
    if (dayAmt >= 1) {
      responses.push({
        response_type: 'text',
        text: 
        `It'll be ${forecast.forecast.forecastday[forecast.forecast.forecastday.length-1].day.condition.text} on ${weatherDate} 
          in ${weatherLocation} with the temperature being ${forecast.forecast.forecastday[forecast.forecast.forecastday.length-1].day.mintemp_f}˚F ~ 
          ${forecast.forecast.forecastday[forecast.forecast.forecastday.length-1].day.maxtemp_f}˚F 
          (average ${forecast.forecast.forecastday[forecast.forecast.forecastday.length-1].day.avgtemp_f}˚F)`,
      });
    } 
    // ... Otherwise 
    responses.push({
      response_type: 'text',
      text: `It's currently ${forecast.current.condition.text} in ${weatherLocation} with a temperature of ${forecast.current.temp_f}˚F`,
    });
    return updateTextResponse(responses, data);
  } catch (err) {
    const responses = [{
      response_type: 'text',
      text: 'I couldn\'t find any information :[',
    }];
    return updateTextResponse(responses, data);
  }
};

// Where you define how to respond based on user's tone in messages
const moodInterceptor = async (data, currentUserTone) => {
  try {
    const responses = data.output.generic;
    // If IBM Tone Analyzer can't find a tone for user's text, just return whatever it was going to return
    if (!currentUserTone.tone.current) return data;
    // NOTE: the moods Tone Analyzer can detect are: anger, fear, joy, sadness, analytical, confident, and tentative
    switch(currentUserTone.tone.current.tone_id) {
    case 'sadness':
      responses.push({
        response_type: 'text',
        text: 'I noticed that you sound upset. Hope this picture of a bun bun can cheer you up:',
      });
      responses.push({
        response_type: 'image',
        source: 'https://i.pinimg.com/originals/fe/3a/a9/fe3aa94af63ec0edccba2574081c2fe3.jpg'
      });
      // Need to send and update the response for Watson Assitant
      return updateTextResponse(responses, data);
    case 'joy':
      responses.push({
        response_type: 'text',
        text: 'Glad to see you\'re happy :)!'
      });
      responses.push({
        response_type: 'image',
        source: 'https://media.tenor.com/images/0015a154656b8b8f17f163499d840176/tenor.gif'
      });
      return updateTextResponse(responses, data);
    case 'anger':
      responses.push({
        response_type: 'text',
        text: 'Dayyyum, what\'s your problem bish?',
      });
      responses.push({
        response_type: 'image',
        source: 'https://imgflip.com/s/meme/Black-Girl-Wat.jpg'
      });
      return updateTextResponse(responses, data);
    case 'fear':
      responses.push({
        response_type: 'text',
        text: 'Uhhh are you uh, ook, fam?'
      });
      responses.push({
        response_type: 'image',
        source: 'https://previews.123rf.com/images/supernam/supernam1103/supernam110300305/8995749-scared-man-isolated-over-white-focused-on-hand-.jpg'
      });
      return updateTextResponse(responses, data);
    default:
      return data;
    }
  } catch (err) {
    return data;
  }
};

const responseInterceptors = async (data) => {
  // Using async + await on api calls - Working with promises in js
  const weatherUpdatedData = await weatherInterceptors(data);
  const currentUserTone = data.context.skills['main skill'].user_defined.userTone.user;
  const moodUpdatedData = await moodInterceptor(weatherUpdatedData, currentUserTone);
  // Have to check if the user is asking for weather or if tone detector can apply to input
  const finalResponses = moodUpdatedData.output.generic;
  // If the user types in something Watson Assistant won't be able to understand
  if (finalResponses.length === 0) {
    finalResponses.push({
      response_type: 'text',
      text: 'Uhh, can you say something I can understand'
    });
  }
  const finalData = updateTextResponse(finalResponses, moodUpdatedData);
  return finalData;
};

module.exports = responseInterceptors;