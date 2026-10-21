const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const SURREAL_URL = process.env.SURREALDB_AGENT_MEMORY_URL
const SURREAL_KEY = process.env.SURREALDB_AGENT_MEMORY_KEY
const CONTEXT_ID = '06gld827s1vm56srmcp8caclu4'

const syntheticReports = [
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: hydraulic fluid leak. Equipment: hydraulic pump. Lockout status: not locked out. Injuries: none. Corrective action: absorbent pads placed. Severity: medium. Missing fields: worker name or ID, date and time of incident, whether lockout was subsequently applied. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: slip hazard from spilled coolant. Equipment: cooling system valve. Lockout status: not locked out. Injuries: none. Corrective action: area cordoned off, maintenance notified. Severity: low. Missing fields: worker name or ID, whether lockout was subsequently applied, root cause. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: pressure gauge failure. Equipment: pressure gauge unit 3B. Lockout status: not locked out. Injuries: none. Corrective action: gauge tagged out of service. Severity: medium. Missing fields: worker name or ID, whether lockout was subsequently applied. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: electrical exposed wiring. Equipment: control panel. Lockout status: locked out. Injuries: none. Corrective action: electrical team called, area restricted. Severity: high. Missing fields: worker name or ID, date and time of incident. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: loading bay pump station 3. Hazard type: near miss forklift and pedestrian. Equipment: forklift truck. Lockout status: not applicable. Injuries: none. Corrective action: pedestrian walkway remarked, supervisor briefed. Severity: high. Missing fields: worker name or ID, whether lockout was subsequently applied, root cause. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: oil leak from pipe joint. Equipment: pipe joint connector. Lockout status: not locked out. Injuries: none. Corrective action: temporary clamp applied, work order raised. Severity: medium. Missing fields: worker name or ID, whether lockout was subsequently applied. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3 storage area. Hazard type: unsecured chemical drum. Equipment: chemical storage drum. Lockout status: not applicable. Injuries: none. Corrective action: drum secured and labelled. Severity: medium. Missing fields: worker name or ID, date and time of incident, root cause. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: rotating equipment guard missing. Equipment: pump motor unit 3A. Lockout status: not locked out. Injuries: none. Corrective action: equipment shut down, guard replacement ordered. Severity: high. Missing fields: worker name or ID, whether lockout was subsequently applied. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3 access road. Hazard type: ice on walkway. Equipment: none. Lockout status: not applicable. Injuries: minor bruising from slip. Corrective action: sand applied, signage posted. Severity: medium. Missing fields: worker name or ID, date and time of incident. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: valve leak high pressure steam. Equipment: steam valve 3C. Lockout status: not locked out. Injuries: none. Corrective action: valve isolated manually, maintenance called. Severity: high. Missing fields: worker name or ID, whether lockout was subsequently applied, root cause. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3 roof access. Hazard type: unsecured ladder. Equipment: access ladder. Lockout status: not applicable. Injuries: none. Corrective action: ladder secured and tagged. Severity: low. Missing fields: worker name or ID, date and time of incident. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3. Hazard type: gas detector alarm activation. Equipment: H2S detector unit 3. Lockout status: locked out. Injuries: none. Corrective action: area evacuated, detector calibrated, all clear given. Severity: high. Missing fields: worker name or ID, root cause. Synthetic: true.`,
  },
  {
    siteId: 'pump-station-3',
    text: `Safety report at site pump-station-3. Location: pump station 3 north bay. Hazard type: hydraulic fluid leak from hose. Equipment: hydraulic hose assembly. Lockout status: not locked out. Injuries: none. Corrective action: hose clamped, replacement scheduled. Severity: medium. Missing fields: worker name or ID, whether lockout was subsequently applied, date and time of incident. Synthetic: true.`,
  },
]

async function seedRecord(report, index) {
  try {
    const response = await fetch(
      `${SURREAL_URL}/api/v1/${CONTEXT_ID}/facts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SURREAL_KEY}`,
        },
        body: JSON.stringify({
          text: report.text,
          infer: 'full',
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(`Record ${index + 1} failed:`, text)
      return false
    }

    console.log(`✓ Record ${index + 1}/13 saved`)
    return true
  } catch (e) {
    console.error(`Record ${index + 1} error:`, e.message)
    return false
  }
}

async function seed() {
  console.log('Seeding 13 synthetic records to SurrealDB...')
  console.log('SurrealDB URL loaded:', !!SURREAL_URL)
  console.log('SurrealDB Key loaded:', !!SURREAL_KEY)

  for (let i = 0; i < syntheticReports.length; i++) {
    await seedRecord(syntheticReports[i], i)
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\nSeeding complete. Check SurrealDB dashboard for records.')
}

seed()