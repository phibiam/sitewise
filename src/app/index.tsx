import { useAuth } from '@clerk/expo'
import { useHostedAuth } from '@clerk/expo/hosted-auth'
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native'

export default function MainScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { startHostedAuth } = useHostedAuth()

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sitewise</Text>
      {isSignedIn ? (
        <>
          <Text>You're signed in</Text>
          <Button title="Sign out" onPress={() => signOut()} />
        </>
      ) : (
        <>
          <Button title="Sign in" onPress={() => startHostedAuth({ mode: 'sign-in' }).catch(() => {})} />
          <Button title="Create account" onPress={() => startHostedAuth({ mode: 'sign-up' }).catch(() => {})} />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
})