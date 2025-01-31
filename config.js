const {
  FB_PAGE_TOKEN,
  FB_VERIFY_TOKEN,
  FB_APP_SECRET,
  FB_APP_ID,
  SERVER_URL,
  SESSION_SECRET,
  GOOGLE_PROJECT_ID,
  DF_LANGUAGE_CODE,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SENDGRID_API_KEY,
  EMAIL_TO,
  EMAIL_FROM,
  OPENWEATHER_API_KEY,
  ADMIN_ID,
} = process.env

module.exports = {
  FB_PAGE_TOKEN,
  FB_VERIFY_TOKEN,
  FB_APP_SECRET,
  FB_APP_ID,
  SERVER_URL,
  SESSION_SECRET,
  GOOGLE_PROJECT_ID,
  DF_LANGUAGE_CODE,
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SENDGRID_API_KEY,
  EMAIL_TO,
  EMAIL_FROM,
  OPENWEATHER_API_KEY,
  ADMIN_ID,
  PG_CONFIG: {
    user: process.env.PG_CONFIG_USER,
    database: process.env.PG_CONFIG_DATABASE,
    password: process.env.PG_CONFIG_PASSWORD,
    host: process.env.PG_CONFIG_HOST,
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    ssl: {
      sslmode: 'require',
      rejectUnauthorized: false,
    }
  }
}