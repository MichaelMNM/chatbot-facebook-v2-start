'use strict';

const config = require('../config')
const axios = require('axios')
const getCurrentWeather = async (city) => {
  // https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}
  /*
  Please use Geocoder API if you need automatic convert city names and zip-codes to geo coordinates
  and the other way around.
  Please note that API requests by city name, zip-codes and city id have been deprecated.
  Although they are still available for use, bug fixing and updates are no longer available
  for this functionality
  */
  const params = {
    appid: config.OPENWEATHER_API_KEY,
    q: city
  }
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {params})
    return response.data
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  getCurrentWeather
}