'use strict';

const axios = require('axios')
const config = require('./config')
const pg = require('pg')
const db = require('./db')
pg.defaults.ssl = true

const _getFacebookUserData = (userId) => {
  const params = {access_token: config.FB_PAGE_TOKEN}
  return axios.get(`https://graph.facebook.com/v15.0/${userId}`, {params})
}

const _insertUserData = async (userId, userData) => {
  const client = await db.connect()
  try {
    const queryInsertUser = 'INSERT INTO users (fb_id, first_name, last_name, profile_pic) VALUES ($1, $2, $3, $4)';
    await client.query(queryInsertUser, [userId, userData.first_name, userData.last_name, userData.profile_pic])
  } catch (error) {
    console.error(error)
  } finally {
    client.release();
  }
}

const _getUserByFacebookId = async (userId) => {
  const client = await db.connect()
  try {
    const queryFindUserByFacebookId = `SELECT fb_id from users WHERE fb_id = '${userId}' LIMIT 1`
    const result = await client.query(queryFindUserByFacebookId)
    return result.rows.length === 1 ? result.rows[0] : null
  } catch (error) {
    console.error(error)
  } finally {
    client.release();
  }
}

const addUser = async (userId) => {
  try {
    let userDataResult = await _getUserByFacebookId(userId)
    if (userDataResult.rows.length === 0) {
      const fbResponse = await _getFacebookUserData(userId)
      const userData = fbResponse.data
      await _insertUserData(userId, userData)
      userDataResult = await _getUserByFacebookId(userId)
    }
    return userDataResult.rows[0]
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  addUser
}