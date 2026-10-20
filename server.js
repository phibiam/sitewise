const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Anthropic = require('@anthropic-ai/sdk')
const http = require('http')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/report') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const { transcript } = JSON.parse(body)
        console.log('Processing transcript:', transcript.substring(0, 50) + '...')

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are a safety reporting assistant. Extract structured safety report fields from the following spoken field report transcript. Return ONLY a valid JSON object with these fields:
{
  "location": "site or area name",
  "equipment": "equipment involved or null",
  "hazardType": "type of hazard or incident",
  "lockoutStatus": "locked out / not locked out / not applicable",
  "injuries": "description or none",
  "correctiveAction": "action taken or recommended",
  "severity": "low / medium / high",
  "missingFields": ["list any fields the worker did not mention"]
}

Transcript: "${transcript}"`
          }]
        })

        const text = message.content[0].text
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const report = JSON.parse(cleaned)
        console.log('Report extracted successfully')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ report }))
      } catch (e) {
        console.error('Error:', e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(3000, '0.0.0.0', () => {
  console.log('Sitewise server running on port 3000')
  console.log('Anthropic key loaded:', !!process.env.ANTHROPIC_API_KEY)
})