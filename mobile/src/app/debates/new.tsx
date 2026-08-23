import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { canonicalProposalPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { errorCode, get, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';

interface Topic {
  topic_id: string;
  name: string;
}

export default function NewProposalScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<boolean | string>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([get<{ topics: Topic[] }>('/api/topics'), get<{ tier: string }>('/api/whoami')])
      .then(([res, who]) => {
        setTopics(res.topics);
        if (res.topics[0]) setTopicId(res.topics[0].topic_id);
        setTier(who.tier);
      })
      .catch((e) => {
        console.error('Topics load failed:', e);
        setError(true);
      });
  }, []);

  async function submit() {
    if (!topicId) return;
    setBusy(true);
    setError(false);
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
        setError(d.signature_invalid_error);
        return;
      }
      router.replace({ pathname: '/debates/[id]', params: { id: res.id! } });
    } catch (e) {
      console.error('Proposal save failed:', e);
      // Defense in depth: reachable only when tier is already payment_verified
      // per the gate below, but tier can lapse between load and submit.
      const code = errorCode(e);
      if (code === 'pay') router.replace('/verify-payment');
      else if (code === 'verify') router.replace('/verify');
      else setError(d.proposal_save_error);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !!topicId && title.trim().length >= 10 && body.trim().length >= 30;
  // Debate participation (2026-08-19) needs payment_verified specifically --
  // see web's anon.ts's paymentVerifiedUserId() doc comment. The debates list
  // screen already hides the entry point to this screen for anyone else, but
  // this route is directly addressable (deep link, or a tier that lapses
  // while this screen is already open), so it needs its own gate too.
  const needsVerification = tier !== null && tier !== 'payment_verified';

  return (
    <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        {d.title_propose}
      </ThemedText>

        {!topics && !error && <ActivityIndicator style={styles.spinner} />}
        {error && <ThemedText type="small">{typeof error === 'string' ? error : d.topics_load_error}</ThemedText>}

        {topics && needsVerification && (
          <Pressable
            onPress={() => router.replace(tier === 'unverified' ? '/verify' : '/verify-payment')}
            style={[styles.verifyBtn, { borderColor: colors.evidence }]}
          >
            <ThemedText type="small" style={{ color: colors.evidence }}>
              {tier === 'unverified' ? d.verify_to_participate : d.pay_to_participate}
            </ThemedText>
          </Pressable>
        )}

        {topics && !needsVerification && (
          <>
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

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={d.proposal_title_placeholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={d.proposal_body_placeholder}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              style={[styles.input, styles.textArea, { borderColor: colors.textSecondary, color: colors.text }]}
            />

            <ThemedText type="small" themeColor="textSecondary">
              {d.proposal_attrib_note}
            </ThemedText>

            <Pressable
              disabled={!canSubmit || busy}
              onPress={submit}
              style={[styles.submitBtn, { backgroundColor: !canSubmit || busy ? colors.backgroundElement : colors.evidence }]}
            >
              <ThemedText type="smallBold">{d.submit_proposal}</ThemedText>
            </Pressable>
          </>
        )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  verifyBtn: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  topicChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
});
