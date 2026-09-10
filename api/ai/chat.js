import { verifyToken } from '../../lib/auth-middleware.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!verifyToken(req)) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งานผู้ช่วย AI' })

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!message) return res.status(400).json({ error: 'กรุณาพิมพ์คำถาม' })
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ' })

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: 'คุณคือผู้ช่วยของระบบแจ้งซ่อมบำรุงโรงเรียนสรรพวิทยาคม ตอบเป็นภาษาไทย สุภาพ กระชับ และช่วยแนะนำขั้นตอนแจ้งซ่อม/ติดตามสถานะ หากไม่ทราบข้อมูลเฉพาะให้บอกผู้ใช้ให้ติดต่อเจ้าหน้าที่ ห้ามแต่งข้อมูลสถานะงานหรือข้อมูลส่วนตัวขึ้นเอง' }] },
                contents: [{ role: 'user', parts: [{ text: message }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
            })
        })
        const rawBody = await response.text()
        let data = {}
        try { data = JSON.parse(rawBody) } catch { }
        if (!response.ok) {
            const providerMessage = data.error?.message || `Google API returned HTTP ${response.status}`
            console.error('Gemini API error', { status: response.status, model, message: providerMessage })
            const status = response.status === 429 ? 429 : 502
            return res.status(status).json({ error: 'บริการ AI ไม่พร้อมใช้งานในขณะนี้', detail: providerMessage })
        }
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        return res.status(200).json({ reply: reply || 'ยังไม่มีคำตอบสำหรับคำถามนี้ครับ' })
    } catch {
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการ AI' })
    }
}