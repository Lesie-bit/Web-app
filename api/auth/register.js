import { connectDB } from '../../lib/db.js'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const OTP_EXPIRY_MS = 10 * 60 * 1000

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email: rawEmail, password } = req.body
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'กรอกข้อมูลให้ครบ' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  }

  // ✅ เช็คโดเมนอีเมล
  if (!email.endsWith('@sappha.ac.th')) {
    return res.status(403).json({ error: 'สมัครได้เฉพาะอีเมล @sappha.ac.th เท่านั้น' })
  }

  const db = await connectDB()
  const users = db.collection('users')

  const existing = await users.findOne({ email })
  if (existing) {
    return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' })
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return res.status(503).json({ error: 'ระบบส่งอีเมลยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ' })
  }

  const otp = crypto.randomInt(100000, 1000000).toString()
  const pending = db.collection('pending_registrations')
  await pending.deleteMany({ expires_at: { $lt: new Date() } })
  await pending.updateOne(
    { email },
    {
      $set: {
        name,
        email,
        password_hash: await bcrypt.hash(password, 10),
        otp_hash: hashOtp(otp),
        expires_at: new Date(Date.now() + OTP_EXPIRY_MS),
        attempts: 0,
        created_at: new Date()
      }
    },
    { upsert: true }
  )

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: [email],
      subject: 'รหัส OTP ยืนยันการสมัครสมาชิก',
      text: `รหัส OTP สำหรับยืนยันการสมัครสมาชิกคือ ${otp}\nรหัสนี้ใช้ได้ภายใน 10 นาที`,
      html: `<p>รหัส OTP สำหรับยืนยันการสมัครสมาชิกคือ</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>รหัสนี้ใช้ได้ภายใน 10 นาที</p>`
    })
  })

  if (!emailResponse.ok) {
    await pending.deleteOne({ email })
    console.error('Resend API error', await emailResponse.text())
    return res.status(502).json({ error: 'ส่ง OTP ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าอีเมล' })
  }

  return res.status(200).json({ success: true, message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว' })
}