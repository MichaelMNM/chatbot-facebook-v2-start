'use strict';

const axios = require('axios')
const config = require('../config')
const pg = require('pg')
const db = require('../db')
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
    const queryFindUserByFacebookId = `SELECT fb_id, first_name, last_name from users WHERE fb_id = '${userId}' LIMIT 1`
    const result = await client.query(queryFindUserByFacebookId)
    return result.rows.length === 1 ? result.rows[0] : null
  } catch (error) {
    console.error(error)
  } finally {
    client.release();
  }
}

const _getUsersByPreference = async (preference, setting) => {
  const client = await db.connect()
  try {
    const queryUsersByPreference = `SELECT * from users WHERE ${preference} = ${setting}`
    console.log(queryUsersByPreference)
    const result = await client.query(queryUsersByPreference)
    return result.rows
  } catch (error) {
    console.error(error)
  } finally {
    client.release();
  }
}

const findOrCreateUser = async (userId) => {
  try {
    let userDataResult = await _getUserByFacebookId(userId)
    if (!userDataResult) {
      console.log('user not found.  adding user')
      const fbResponse = await _getFacebookUserData(userId)
      const userData = fbResponse.data
      await _insertUserData(userId, userData)
      userDataResult = await _getUserByFacebookId(userId)
    }
    return userDataResult
  } catch (error) {
    console.error(error)
  }
}

const setNewsLetterPreference = async (userId, setting) => {
  const client = await db.connect()
  try {
    const querySetNewsLetterPreference = 'UPDATE users set newsletter=$1 where fb_id=$2';
    return await client.query(querySetNewsLetterPreference, [setting, userId])
  } catch (error) {
    console.error(error)
  } finally {
    client.release();
  }
}

const findNewsletterUsers = (setting) => {
  return _getUsersByPreference('newsletter', setting)
}

module.exports = {
  findOrCreateUser,
  setNewsLetterPreference,
  findNewsletterUsers
}