'use strict';
const db = require('../db')

const insertJobApplication = async (userId, jobApplication) => {
  const client = await db.connect()
  try {
    const insertJobApplicationQuery = `insert into
    public.job_applications (applicant_name, previous_job, years_of_experience, phone_number, job_vacancy, fb_id)
    values ($1, $2, $3, $4, $5, $6)`
    const insertJobApplicationResult = await client.query(
      insertJobApplicationQuery,
      [
        jobApplication.applicantName,
        jobApplication.previousJob,
        jobApplication.yearsOfExperience,
        jobApplication.phoneNumber,
        jobApplication.jobVacancy,
        userId
      ]
    )
    console.log(insertJobApplicationResult)
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

const hasJobApplication = async (userId, jobVacancy) => {
  const client = await db.connect()
  try {
    const hasJobApplicationQuery = `select * from
              public.job_applications where fb_id = '${userId}' and job_vacancy = '${jobVacancy}'`
    const hasJobApplicationResult = await client.query(hasJobApplicationQuery)
    return hasJobApplicationResult.rows.length > 0
  } catch (error) {
    console.error(error)
  } finally {
    client.release()
  }
}

module.exports = {
  insertJobApplication,
  hasJobApplication
}