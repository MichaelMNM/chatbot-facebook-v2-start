'use strict';
const db = require('./db')

const getAllColors = async () => {
  const client = await db.connect()
  try {
    const getAllColorsQuery = `select color from public.iphone_colors`
    const getAllColorsResult = await client.query(getAllColorsQuery)
    return getAllColorsResult.rows.map(row => row['color'])
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

const getUserColor = async (userID) => {
  const client = await db.connect()
  try {
    const getUserColorQuery = `select color from public.users where fb_id = '${userID}'`
    const getUserColorResult = await client.query(getUserColorQuery)
    return getUserColorResult.rows.length === 1 ? getUserColorQuery.rows[0]['color'] : null
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

const updateUserColor = async (color, userID) => {
  const client = await db.connect()
  try {
    const updateUserColorQuery = `update public.users set color=$1 where fb_id=$2`
    const updateUserColorResult = await client.query(updateUserColorQuery, [color, userID])
    console.log(updateUserColorResult)
    return await getUserColor(userID)
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

module.exports = {
  getAllColors,
  getUserColor,
  updateUserColor
}