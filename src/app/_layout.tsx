import { ClerkProvider } from '@clerk/expo'
import { Slot } from 'expo-router'
import React from 'react'
import { ScrollView, Text } from 'react-native'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={{ flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#0f172a' }}>
          <Text style={{ color: '#f87171', fontSize: 20, fontWeight: '700' }}>Crash</Text>
          <Text style={{ color: '#fca5a5', fontSize: 14, marginTop: 12 }}>
            {(this.state.error as Error).message}
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 12 }}>
            {(this.state.error as Error).stack}
          </Text>
        </ScrollView>
      )
    }
    return this.props.children
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={publishableKey}>
        <Slot />
      </ClerkProvider>
    </ErrorBoundary>
  )
}