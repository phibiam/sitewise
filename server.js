const path = require('path')
const fs = require('fs')
const http = require('http')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SURREAL_URL = process.env.SURREALDB_AGENT_MEMORY_URL
const SURREAL_KEY = process.env.SURREALDB_AGENT_MEMORY_KEY
const CONTEXT_ID = '06gld827s1vm56srmcp8caclu4'

async function saveToSurreal(report, transcript, siteId) {
  try {
    const text = `Safety report at site ${siteId}. Location: ${report.location}. Hazard type: ${report.hazardType}. Equipment: ${report.equipment}. Lockout status: ${report.lockoutStatus}. Injuries: ${report.injuries}. Corrective action: ${report.correctiveAction}. Severity: ${report.severity}. Missing fields: ${(report.missingFields || []).join(', ')}. Original transcript: ${transcript}`

    const response = await fetch(
      `${SURREAL_URL}/api/v1/${CONTEXT_ID}/facts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SURREAL_KEY}`,
        },
        body: JSON.stringify({ text, infer: 'full' }),
      }
    )

    const responseText = await response.text()
    console.log('SurrealDB status:', response.status)
    if (!response.ok) {
      console.error('SurrealDB save failed:', responseText)
      return null
    }
    console.log('Saved to SurrealDB successfully')
    return JSON.parse(responseText)
  } catch (e) {
    console.error('SurrealDB error:', e.message)
    return null
  }
}

async function getSitePatterns(siteId) {
  try {
    const response = await fetch(
      `${SURREAL_URL}/api/v1/${CONTEXT_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SURREAL_KEY}`,
        },
        body: JSON.stringify({
          query: `What fields are most commonly missing from safety reports at site ${siteId}?`,
          k: 20,
        }),
      }
    )

    if (!response.ok) {
      console.log('Pattern query failed:', response.status)
      return []
    }

    const data = await response.json()
    const facts = data.facts || data.hits || data.results || []
    const missingCounts = {}

    facts.forEach(fact => {
      const content = fact.content || fact.text || ''
      const match = content.match(/Missing fields: ([^.]+)/)
      if (match) {
        match[1].split(',').map(f => f.trim()).forEach(field => {
          if (field && field !== 'none') {
            missingCounts[field] = (missingCounts[field] || 0) + 1
          }
        })
      }
    })

    const cleanField = (f) => f.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase()
    const cleanedCounts = {}
    Object.entries(missingCounts).forEach(([field, count]) => {
      const clean = cleanField(field)
      cleanedCounts[clean] = (cleanedCounts[clean] || 0) + count
    })

    const patterns = Object.entries(cleanedCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => ({ field, count, total: facts.length }))

    console.log('Site patterns:', patterns)
    return patterns
  } catch (e) {
    console.error('Pattern error:', e.message)
    return []
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'GET') {
    try {
      const filePath = path.join(__dirname, 'public', 'index.html')
      const content = fs.readFileSync(filePath, 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(content)
    } catch (e) {
      console.error('Failed to serve index.html:', e.message)
      res.writeHead(500)
      res.end('Server error: ' + e.message)
    }
    return
  }

  if (req.method === 'POST' && req.url === '/api/report') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const { transcript, siteId = 'pump-station-3' } = JSON.parse(body)
        console.log('Processing transcript:', transcript.substring(0, 50) + '...')

        const sitePatterns = await getSitePatterns(siteId)

        const patternContext = sitePatterns.length > 0
          ? `\n\nThis site commonly misses these fields (prioritize asking about them): ${sitePatterns.map(p => `${p.field} (missed ${p.count}/${p.total} times)`).join(', ')}`
          : ''

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
${patternContext}

Transcript: "${transcript}"`
          }]
        })

        const text = message.content[0].text
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const report = JSON.parse(cleaned)
        console.log('Report extracted successfully')

        await saveToSurreal(report, transcript, siteId)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ report, sitePatterns }))
      } catch (e) {
        console.error('Error:', e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/api/file') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const { report, gapAnswers, transcript, siteId } = JSON.parse(body)

        const gapText = Object.entries(gapAnswers)
          .map(([field, answer]) => `${field}: ${answer}`)
          .join('. ')

        const finalText = `FILED safety report at site ${siteId}. Location: ${report.location}. Hazard type: ${report.hazardType}. Equipment: ${report.equipment}. Lockout status: ${report.lockoutStatus}. Injuries: ${report.injuries}. Corrective action: ${report.correctiveAction}. Severity: ${report.severity}. Worker-provided gap answers: ${gapText || 'none'}. Original transcript: ${transcript}. Synthetic: false.`

        const response = await fetch(
          `${SURREAL_URL}/api/v1/${CONTEXT_ID}/facts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SURREAL_KEY}`,
            },
            body: JSON.stringify({ text: finalText, infer: 'full' }),
          }
        )

        if (!response.ok) {
          const text = await response.text()
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: text }))
          return
        }

        console.log('Report filed successfully')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        console.error('File error:', e.message)
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
  console.log('SurrealDB URL loaded:', !!process.env.SURREALDB_AGENT_MEMORY_URL)
  console.log('SurrealDB Key loaded:', !!process.env.SURREALDB_AGENT_MEMORY_KEY)
})