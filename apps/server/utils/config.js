import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const siteKey = process.env.SITE_KEY || ''
export const isDevelopment = process.env.NODE_ENV === 'development'
