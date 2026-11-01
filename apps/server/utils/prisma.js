import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'

const connectionString = process.env.DATABASE_URL
export const isDatabaseConfigured = Boolean(connectionString)

if (!isDatabaseConfigured) {
  console.warn(
    '[classworks] 未设置 DATABASE_URL：数据库相关接口不可用。请复制 apps/server/.env.example 为 apps/server/.env，并填写 PostgreSQL 连接串。',
  )
}

// 不能把 undefined 直接插值进连接串：pg-connection-string 会把 "undefined"
// 解析成主机名 "base"，报错信息因此完全误导。
const adapter = new PrismaPg({
  connectionString: connectionString || 'postgresql://classworks:classworks@127.0.0.1:1/classworks',
})
const prisma = new PrismaClient({ adapter })

export { prisma }
