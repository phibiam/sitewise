import { useAuth } from '@clerk/expo'
import { useHostedAuth } from '@clerk/expo/hosted-auth'
import { useState } from 'react'
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const SERVER = 'http://192.168.1.80:3000'

type Report = {
  location: string
  equipment: string
  hazardType: string
  lockoutStatus: string
  injuries: string
  correctiveAction: string
  severity: string
  missingFields: string[]
}

type Pattern = {
  field: string
  count: number
  total: number
}

type Screen = 'capture' | 'gaps' | 'signoff' | 'done'

export default function MainScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { startHostedAuth } = useHostedAuth()

  const [screen, setScreen] = useState<Screen>('capture')
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [sitePatterns, setSitePatterns] = useState<Pattern[]>([])
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const processReport = async () => {
    if (!transcript.trim()) return
    try {
      setError('')
      setIsProcessing(true)
      const response = await fetch(`${SERVER}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, siteId: 'pump-station-3' }),
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setReport(data.report)
        setSitePatterns(data.sitePatterns || [])
        setGapAnswers({})
        setScreen('gaps')
      }
    } catch (e) {
      setError('Failed to process report')
    } finally {
      setIsProcessing(false)
    }
  }

  const submitFinal = async () => {
    try {
      setIsProcessing(true)
      const response = await fetch(`${SERVER}/api/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          gapAnswers,
          transcript,
          siteId: 'pump-station-3',
        }),
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setScreen('done')
      }
    } catch (e) {
      setError('Failed to file report')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetApp = () => {
    setScreen('capture')
    setTranscript('')
    setReport(null)
    setSitePatterns([])
    setGapAnswers({})
    setError('')
  }

  // Merge missing fields: site patterns first (ordered by frequency), then any extras
  const orderedGapQuestions = () => {
    if (!report) return []
    const patternFields = sitePatterns.map(p => p.field)
    const extras = (report.missingFields || []).filter(
      f => !patternFields.includes(f)
    )
    return [...patternFields, ...extras].filter(f =>
      report.missingFields.includes(f)
    )
  }

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sitewise</Text>
        <Text style={styles.subtitle}>Safety reporting that remembers</Text>
        <Button
          title="Sign in"
          onPress={() => startHostedAuth({ mode: 'sign-in' }).catch(() => {})}
        />
        <Button
          title="Create account"
          onPress={() => startHostedAuth({ mode: 'sign-up' }).catch(() => {})}
        />
      </View>
    )
  }

  // SCREEN 1: Capture
  if (screen === 'capture') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Sitewise</Text>
        <Text style={styles.siteLabel}>📍 Pump Station 3</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe the hazard or incident</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={5}
            placeholder="Speak or type what happened..."
            placeholderTextColor="#475569"
            value={transcript}
            onChangeText={setTranscript}
          />
          <TouchableOpacity
            onPress={() =>
              setTranscript(
                'Worker observed hydraulic fluid leak near pump station 3. Equipment not locked out. Spill approximately 2 litres on concrete floor. Placed absorbent pads and reported to supervisor.'
              )
            }
          >
            <Text style={styles.link}>Use sample report</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isProcessing && styles.disabled]}
          onPress={processReport}
          disabled={isProcessing || !transcript.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Extract Report →</Text>
          )}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Sign out" onPress={() => signOut()} />
      </ScrollView>
    )
  }

  // SCREEN 2: Gap questions
  if (screen === 'gaps' && report) {
    const questions = orderedGapQuestions()
    const topPattern = sitePatterns[0]

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Gap Questions</Text>

        {topPattern && (
          <View style={styles.memoryBanner}>
            <Text style={styles.memoryText}>
              🧠 Sitewise is asking about{' '}
              <Text style={styles.memoryHighlight}>
                {topPattern.field}
              </Text>{' '}
              first — missed {topPattern.count}/{topPattern.total} times at this site.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extracted fields</Text>
          {Object.entries(report).map(([key, value]) => {
            if (key === 'missingFields') return null
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{key}</Text>
                <Text style={styles.fieldValue}>{String(value)}</Text>
              </View>
            )
          })}
        </View>

        {questions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ⚠ {questions.length} missing field{questions.length > 1 ? 's' : ''}
            </Text>
            {questions.map(field => (
              <View key={field} style={styles.gapQuestion}>
                <Text style={styles.gapLabel}>{field}</Text>
                <TextInput
                  style={styles.gapInput}
                  placeholder={`Enter ${field}...`}
                  placeholderTextColor="#475569"
                  value={gapAnswers[field] || ''}
                  onChangeText={val =>
                    setGapAnswers(prev => ({ ...prev, [field]: val }))
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.fieldValue}>✓ No missing fields</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setScreen('signoff')}
        >
          <Text style={styles.primaryButtonText}>Review & Sign Off →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen('capture')}
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // SCREEN 3: Sign-off
  if (screen === 'signoff' && report) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Sign Off</Text>
        <Text style={styles.subtitle}>Review before filing</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report summary</Text>
          {Object.entries(report).map(([key, value]) => {
            if (key === 'missingFields') return null
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{key}</Text>
                <Text style={styles.fieldValue}>{String(value)}</Text>
              </View>
            )
          })}
        </View>

        {Object.keys(gapAnswers).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your answers</Text>
            {Object.entries(gapAnswers).map(([field, answer]) => (
              <View key={field} style={styles.field}>
                <Text style={styles.fieldLabel}>{field}</Text>
                <Text style={styles.fieldValue}>{answer || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.provenanceBox}>
          <Text style={styles.provenanceTitle}>Provenance</Text>
          <Text style={styles.provenanceItem}>
            📝 location — worker-stated
          </Text>
          <Text style={styles.provenanceItem}>
            🤖 hazardType, equipment, severity — AI-inferred
          </Text>
          <Text style={styles.provenanceItem}>
            ✍️ gap answers — worker-stated
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.fileButton, isProcessing && styles.disabled]}
          onPress={submitFinal}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>✓ File Report</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setScreen('gaps')}
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    )
  }

  // SCREEN 4: Done
  if (screen === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneIcon}>✓</Text>
        <Text style={styles.title}>Report Filed</Text>
        <Text style={styles.subtitle}>
          Saved to Sitewise memory.{'\n'}This site now has one more record.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={resetApp}>
          <Text style={styles.primaryButtonText}>New Report</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
    gap: 16,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#0f172a',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },
  siteLabel: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  link: {
    color: '#3b82f6',
    fontSize: 14,
  },
  field: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fieldLabel: {
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'capitalize',
    minWidth: 130,
  },
  fieldValue: {
    color: '#e2e8f0',
    flex: 1,
  },
  memoryBanner: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  memoryText: {
    color: '#93c5fd',
    fontSize: 14,
    lineHeight: 20,
  },
  memoryHighlight: {
    fontWeight: '700',
    color: '#60a5fa',
  },
  gapQuestion: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  gapLabel: {
    color: '#fbbf24',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  gapInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    color: '#f1f5f9',
    fontSize: 14,
  },
  provenanceBox: {
    backgroundColor: '#0f2b1f',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    gap: 4,
  },
  provenanceTitle: {
    color: '#86efac',
    fontWeight: '700',
    marginBottom: 4,
  },
  provenanceItem: {
    color: '#4ade80',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  fileButton: {
    backgroundColor: '#16a34a',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  doneIcon: {
    fontSize: 64,
    color: '#22c55e',
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
})