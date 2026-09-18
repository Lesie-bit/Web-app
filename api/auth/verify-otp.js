import { connectDB } from '../../lib/db.js'
import crypto from 'node:crypto'

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email: rawEmail, otp } = req.body
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const normalizedOtp = typeof otp === 'string' ? otp.trim() : ''
  if (!email || !/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัส OTP 6 หลัก' })
  }

  const db = await connectDB()
  const pending = db.collection('pending_registrations')
  const registration = await pending.findOne({ email })
  if (!registration || registration.expires_at <= new Date()) {
    return res.status(400).json({ error: 'รหัส OTP หมดอายุหรือไม่ถูกต้อง กรุณาขอรหัสใหม่' })
  }
  if (registration.attempts >= 5) {
    await pending.deleteOne({ _id: registration._id })
    return res.status(429).json({ error: 'กรอกรหัสผิดเกินกำหนด กรุณาขอรหัสใหม่' })
  }
  if (hashOtp(normalizedOtp) !== registration.otp_hash) {
    await pending.updateOne({ _id: registration._id }, { $inc: { attempts: 1 } })
    return res.status(400).json({ error: 'รหัส OTP ไม่ถูกต้อง' })
  }

  const users = db.collection('users')
  if (await users.findOne({ email })) {
    await pending.deleteOne({ _id: registration._id })
    return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' })
  }

  await users.insertOne({
    name: registration.name,
    email: registration.email,
    password_hash: registration.password_hash,
    role: 'student',
    created_at: new Date()
  })
  await pending.deleteOne({ _id: registration._id })
  return res.status(201).json({ success: true })
}