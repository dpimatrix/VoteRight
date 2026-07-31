import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Any screen with a text input should use this instead of raw
    SafeAreaView + ScrollView — without it, the keyboard covers whatever
    field you're typing into on Android and iOS alike. */
export function KeyboardAwareScreen({
  children,
  backgroundColor,
  contentContainerStyle,
}: {
  children: ReactNode;
  backgroundColor: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
