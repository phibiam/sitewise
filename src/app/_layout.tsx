import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Slot } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

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
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>App Error</Text>
          <Text style={styles.message}>
            {(this.state.error as Error).message}
          </Text>
          <Text style={styles.stack}>
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
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <Slot />
      </ClerkProvider>
    </ErrorBoundary>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#f87171',
  },
  message: {
    color: '#fca5a5',
    fontSize: 16,
  },
  stack: {
    color: '#94a3b8',
    fontSize: 12,
  },
})