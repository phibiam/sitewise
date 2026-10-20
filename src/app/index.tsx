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

export default function MainScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { startHostedAuth } = useHostedAuth()
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState('')

  const processReport = async () => {
    if (!transcript.trim()) return
    try {
      setError('')
      setReport(null)
      setIsProcessing(true)
      const response = await fetch('http://192.168.1.80:3000/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setReport(data.report)
      }
    } catch (e) {
      setError('Failed to process report')
    } finally {
      setIsProcessing(false)
    }
  }

  const useMockTranscript = () => {
    setTranscript(
      'Worker observed hydraulic fluid leak near pump station 3. Equipment not locked out. Spill approximately 2 litres on concrete floor. Placed absorbent pads and reported to supervisor.'
    )
  }

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <View style={styles.container}>
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sitewise</Text>

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
        <TouchableOpacity style={styles.mockButton} onPress={useMockTranscript}>
          <Text style={styles.mockButtonText}>Use sample report</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isProcessing && styles.disabled]}
        onPress={processReport}
        disabled={isProcessing || !transcript.trim()}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Extract Report →</Text>
        )}
      </TouchableOpacity>

      {report && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extracted Report</Text>
          {Object.entries(report).map(([key, value]) => {
            if (key === 'missingFields') return null
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{key}</Text>
                <Text style={styles.fieldValue}>{String(value)}</Text>
              </View>
            )
          })}
          {Array.isArray(report.missingFields) && report.missingFields.length > 0 && (
            <View style={styles.missing}>
              <Text style={styles.missingTitle}>⚠ Missing fields</Text>
              {report.missingFields.map((f: string) => (
                <Text key={f} style={styles.missingItem}>• {f}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign out" onPress={() => signOut()} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#0f172a',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
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
  mockButton: {
    alignSelf: 'flex-start',
  },
  mockButtonText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
  missing: {
    backgroundColor: '#7c2d12',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  missingTitle: {
    color: '#fca5a5',
    fontWeight: '700',
  },
  missingItem: {
    color: '#fca5a5',
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
  },
})