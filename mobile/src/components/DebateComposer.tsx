import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, useColorScheme, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { canonicalArgumentPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { post } from '@/services/api';

import { ThemedText } from './themed-text';

type Side = 'for' | 'against' | 'neutral_info';
const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'for', label: 'For' },
  { value: 'against', label: 'Against' },
  { value: 'neutral_info', label: 'Neutral info' },
];

export function DebateComposer({ threadId, onPosted }: { threadId: string; onPosted: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [side, setSide] = useState<Side>('for');
  const [body, setBody] = useState('');
  const [cite, setCite] = useState('');
  const [needCite, setNeedCite] = useState(false);
  const [claim, setClaim] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(claimResponse?: 'marked_as_opinion' | 'dismissed') {
    setBusy(true);
    let signature: { signature: string; publicKeyFingerprint: string } | undefined;
    try {
      await ensureSigningKey();
      const userId = await currentUserIdForSigning();
      signature = await signPayload(
        canonicalArgumentPayload({ threadId, userId, side, body, citationUrl: cite || undefined }),
      );
    } catch (e) {
      console.error('Signing failed, posting unsigned:', e);
    }
    try {
      const res = await post<{ prompted?: boolean; claim?: string; signatureInvalid?: boolean }>(
        `/api/debates/${threadId}/argue`,
        {
          side,
          body,
          citationUrl: cite || undefined,
          claimResponse,
          signature: signature?.signature,
          publicKeyFingerprint: signature?.publicKeyFingerprint,
        },
      );
      if (res.prompted && res.claim) {
        setClaim(res.claim);
        return;
      }
      setPosted(true);
      setClaim(null);
      setBody('');
      setCite('');
      setNeedCite(false);
      onPosted();
    } catch (e) {
      console.error('Argument post failed:', e);
    } finally {
      setBusy(false);
    }
  }

  if (posted) {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small">⟳ Pending moderation review before it appears publicly.</ThemedText>
        <Pressable onPress={() => setPosted(false)}>
          <ThemedText type="linkPrimary">Post another argument</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold">Add your argument</ThemedText>
      <View style={styles.sideRow}>
        {SIDE_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setSide(o.value)}
            style={[
              styles.sideBtn,
              {
                borderColor: side === o.value ? colors.evidence : colors.textSecondary,
                backgroundColor: side === o.value ? colors.backgroundSelected : 'transparent',
              },
            ]}
          >
            <ThemedText type="small">{o.label}</ThemedText>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Your argument (10+ characters)"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textArea, { borderColor: colors.textSecondary, color: colors.text }]}
      />
      {(needCite || cite) && (
        <TextInput
          value={cite}
          onChangeText={setCite}
          placeholder="Source URL"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
        />
      )}
      {claim && (
        <View style={[styles.claimBox, { borderColor: colors.textSecondary }]}>
          <ThemedText type="small">
            That reads like a factual claim — "{claim}". Add a source, mark it as opinion, or dismiss?
          </ThemedText>
          <View style={styles.claimActions}>
            <Pressable
              disabled={busy}
              onPress={() => {
                setNeedCite(true);
                setClaim(null);
              }}
            >
              <ThemedText type="linkPrimary">Add source</ThemedText>
            </Pressable>
            <Pressable disabled={busy} onPress={() => submit('marked_as_opinion')}>
              <ThemedText type="linkPrimary">Mark as opinion</ThemedText>
            </Pressable>
            <Pressable disabled={busy} onPress={() => submit('dismissed')}>
              <ThemedText type="linkPrimary">Dismiss</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
      {!claim && (
        <Pressable
          disabled={busy || body.trim().length < 10}
          onPress={() => submit()}
          style={[
            styles.submitBtn,
            { backgroundColor: busy || body.trim().length < 10 ? colors.background : colors.evidence },
          ]}
        >
          <ThemedText type="smallBold">Post argument</ThemedText>
        </Pressable>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Public and attributed — not anonymous.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  sideRow: { flexDirection: 'row', gap: Spacing.two },
  sideBtn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  claimBox: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, gap: Spacing.two },
  claimActions: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});
