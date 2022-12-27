'use strict';
const axios = require('axios')
const config = require('./config')
const db = require('./db')

pg.defaults.ssl = true

const getAllColors = async () => {
  const client = db.connect()
  try {
    const getAllColorsQuery = `select color from public.iphone_colors`
    const getAllColorsResult = client.query(getAllColorsQuery)
    console.log(getAllColorsResult)
    return getAllColorsResult.rows.map(row => row['color'])
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

const getUserColor = async (userID) => {
  const client = db.connect()
  try {
    const getUserColorQuery = `select color from public.users where fb_id = '${userUD}'`
    const getUserColorResult = client.query(getUserColorQuery)
    console.log(getUserColorQuery)
    return getUserColorResult.rows.length === 1 ? getUserColorQuery.rows[0]['color'] : null
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

module.exports = {
  getAllColors,
  getUserColor
}