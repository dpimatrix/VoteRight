import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { canonicalProposalPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { get, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Topic {
  topic_id: string;
  name: string;
}

export default function NewProposalScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<{ topics: Topic[] }>('/api/topics')
      .then((res) => {
        setTopics(res.topics);
        if (res.topics[0]) setTopicId(res.topics[0].topic_id);
      })
      .catch((e) => {
        console.error('Topics load failed:', e);
        setError('Could not load issues. Pull down to try again.');
      });
  }, []);

  async function submit() {
    if (!topicId) return;
    setBusy(true);
    setError(null);
    try {
      let signature: { signature: string; publicKeyFingerprint: string } | undefined;
      try {
        await ensureSigningKey();
        const userId = await currentUserIdForSigning();
        signature = await signPayload(canonicalProposalPayload({ userId, topicId, title, body }));
      } catch (e) {
        console.error('Signing failed, posting unsigned:', e);
      }
      const res = await post<{ signatureInvalid?: boolean; id?: string }>('/api/debates', {
        topicId,
        title,
        body,
        signature: signature?.signature,
        publicKeyFingerprint: signature?.publicKeyFingerprint,
      });
      if (res.signatureInvalid) {
        setError('Your signature could not be verified. Try again.');
        return;
      }
      router.replace({ pathname: '/debates/[id]', params: { id: res.id! } });
    } catch (e) {
      console.error('Proposal save failed:', e);
      setError('Could not save your proposal. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !!topicId && title.trim().length >= 10 && body.trim().length >= 30;

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Propose an issue
      </ThemedText>

        {!topics && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{error}</ThemedText>}

        {topics && (
          <View style={styles.topicRow}>
            {topics.map((tp) => (
              <Pressable
                key={tp.topic_id}
                onPress={() => setTopicId(tp.topic_id)}
                style={[
                  styles.topicChip,
                  {
                    borderColor: topicId === tp.topic_id ? colors.evidence : colors.textSecondary,
                    backgroundColor: topicId === tp.topic_id ? colors.backgroundSelected : 'transparent',
                  },
                ]}
              >
                <ThemedText type="small">{tp.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Proposal title (10+ characters)"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Describe the proposal (30+ characters)"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          style={[styles.input, styles.textArea, { borderColor: colors.textSecondary, color: colors.text }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Proposals are public and attributed to your verified identity — needs 3 seconds to move to debate.
        </ThemedText>

        <Pressable
          disabled={!canSubmit || busy}
          onPress={submit}
          style={[styles.submitBtn, { backgroundColor: !canSubmit || busy ? colors.backgroundElement : colors.evidence }]}
        >
          <ThemedText type="smallBold">Submit proposal</ThemedText>
        </Pressable>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  topicChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});
