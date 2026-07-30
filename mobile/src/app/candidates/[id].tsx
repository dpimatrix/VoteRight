import { useFocusEffect } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ensureSession, get, hasSession } from '@/services/api';

interface EvidenceItem {
  value: number;
  sourceType: string;
  date: string | null;
  statement: string;
  publisher: string | null;
  title: string | null;
  archived: boolean;
}

interface TopicRow {
  topicId: string;
  axisId: string;
  name: string;
  question: string;
  negativePole: string;
  positivePole: string;
  priority: { direction: 1 | -1; weight: number; statement: string } | null;
  agreement: number | null;
  conflict: boolean;
  evidence: EvidenceItem[];
}

interface Vote {
  bill_external_id: string;
  bill_title: string;
  vote: string;
  date: string;
  source_url: string;
}

interface PromiseEvent {
  status: string;
  note: string;
  date: string;
  publisher: string | null;
  archived: boolean;
}

interface PromiseRow {
  id: string;
  statement: string;
  current_status: string;
  topic: string;
  events: PromiseEvent[];
}

interface FlagRow {
  id: string;
  description: string;
  status: string;
  citations: { publisher: string; title: string; date: string | null }[];
  events: { status: string; note: string; date: string }[];
}

interface CommitmentRow {
  id: string;
  stance: string;
  statement: string | null;
  date: string;
  mandate_id: string;
  mandate_summary: string;
  turnout_count: number;
  margin_pct: number;
  office: string | null;
  publisher: string | null;
  cit_title: string | null;
  became_promise: boolean;
}

interface PathwayRow {
  id: string;
  mechanism_type: string;
  is_binding: boolean;
  legal_citation: string;
  signature_requirement_note: string | null;
  description: string;
}

interface CampaignRow {
  id: string;
  description: string;
  support_count: number;
  status: string;
  mechanism_type: string;
}

interface CandidateResponse {
  profile: {
    id: string;
    fullName: string;
    party: string;
    bio: string | null;
    photoUrl: string | null;
    currentOffice: string | null;
    expenditures: {
      committee: string;
      direction: string;
      amount_usd: string;
      expenditure_date: string;
      purpose: string | null;
      publisher: string;
    }[];
    endorsements: { organization: string; endorsed_at: string; publisher: string }[];
  };
  sample: boolean;
  topics: TopicRow[];
  votes: Vote[];
  votesDataThrough: string | null;
  promises: PromiseRow[];
  flags: FlagRow[];
  commitments: CommitmentRow[];
  pathways: PathwayRow[];
  holdsOffice: boolean;
  campaigns: CampaignRow[];
}

const AGREEMENT_LABEL: Record<string, string> = {
  '2': 'Strongly agrees',
  '1': 'Agrees',
  '0': 'Neutral',
  '-1': 'Disagrees',
  '-2': 'Strongly disagrees',
};

const STANCE_LABEL: Record<string, string> = {
  commit: 'Committed',
  decline: 'Declined',
  no_response: 'No response',
};

export default function CandidateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!hasSession()) await ensureSession();
          const res = await get<CandidateResponse>(`/api/candidates/${id}`);
          if (!cancelled) setData(res);
        } catch (e) {
          console.error('Candidate load failed:', e);
          if (!cancelled) setError('Could not load this candidate. Pull down to try again.');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  if (!data && !error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ThemedText type="small" style={styles.centerPad}>
          {error}
        </ThemedText>
      </SafeAreaView>
    );
  }

  const { profile } = data;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">{profile.fullName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ({profile.party}){profile.currentOffice ? ` · ${profile.currentOffice}` : ''}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {data.sample ? 'Sample data' : 'Real data'}
        </ThemedText>

        {data.topics
          .filter((tp) => tp.priority || tp.evidence.length > 0)
          .map((tp) => (
            <View key={tp.axisId} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" style={styles.flexOne}>
                  {tp.name}
                </ThemedText>
                {tp.priority && tp.agreement !== null && (
                  <View style={[styles.chip, { borderColor: colors.evidence }]}>
                    <ThemedText type="small" style={{ color: colors.evidence }}>
                      {AGREEMENT_LABEL[String(tp.agreement)]}
                    </ThemedText>
                  </View>
                )}
              </View>
              {tp.priority && (
                <ThemedText type="small" themeColor="textSecondary">
                  You said “{tp.priority.statement}”
                </ThemedText>
              )}
              {tp.evidence.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No public position on record.
                </ThemedText>
              ) : (
                tp.evidence.map((e, i) => (
                  <View key={i} style={styles.evidenceRow}>
                    <ThemedText type="small">{e.statement}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {e.sourceType} · {e.title ?? e.publisher} · {e.date}
                      {e.archived ? ' · archived' : ''}
                    </ThemedText>
                  </View>
                ))
              )}
              {tp.conflict && (
                <ThemedText type="small" themeColor="textSecondary">
                  Votes and statements conflict on this issue — vote record governs the score.
                </ThemedText>
              )}
            </View>
          ))}

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Voting record</ThemedText>
          {data.votes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No recorded votes yet.
            </ThemedText>
          ) : (
            data.votes.map((v) => (
              <View key={v.bill_external_id} style={styles.evidenceRow}>
                <View style={styles.rowBetween}>
                  <ThemedText type="small" style={styles.flexOne}>
                    {v.bill_external_id} · {v.bill_title}
                  </ThemedText>
                  <View
                    style={[
                      styles.chip,
                      { borderColor: v.vote === 'yea' ? colors.evidence : colors.textSecondary },
                    ]}
                  >
                    <ThemedText type="small">{v.vote}</ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {v.date}
                </ThemedText>
              </View>
            ))
          )}
          {data.votesDataThrough && (
            <ThemedText type="small" themeColor="textSecondary">
              Voting data current through {data.votesDataThrough}.
            </ThemedText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Promises</ThemedText>
          {data.promises.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No tracked promises yet.
            </ThemedText>
          ) : (
            data.promises.map((p) => (
              <View key={p.id} style={styles.evidenceRow}>
                <View style={styles.rowBetween}>
                  <ThemedText type="small" style={styles.flexOne}>
                    {p.statement}
                  </ThemedText>
                  <View style={[styles.chip, { borderColor: colors.textSecondary }]}>
                    <ThemedText type="small">{p.current_status}</ThemedText>
                  </View>
                </View>
                {p.events.map((e, i) => (
                  <ThemedText key={i} type="small" themeColor="textSecondary">
                    {e.date} · {e.status} · {e.note}
                  </ThemedText>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Integrity findings</ThemedText>
          {data.flags.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No published findings.
            </ThemedText>
          ) : (
            data.flags.map((f) => (
              <View key={f.id} style={styles.evidenceRow}>
                <ThemedText type="small">{f.description}</ThemedText>
                {f.citations.map((c, i) => (
                  <ThemedText key={i} type="small" themeColor="textSecondary">
                    {c.publisher} · {c.title}
                  </ThemedText>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Mandates</ThemedText>
          {data.commitments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No mandate commitments yet.
            </ThemedText>
          ) : (
            data.commitments.map((c) => (
              <View key={c.id} style={styles.evidenceRow}>
                <View style={styles.rowBetween}>
                  <ThemedText type="small" style={styles.flexOne}>
                    {c.mandate_summary}
                  </ThemedText>
                  <View style={[styles.chip, { borderColor: colors.textSecondary }]}>
                    <ThemedText type="small">{STANCE_LABEL[c.stance] ?? c.stance}</ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {c.office ?? ''} · {c.turnout_count.toLocaleString()} voters · +{c.margin_pct}% margin
                </ThemedText>
                {c.statement && <ThemedText type="small">“{c.statement}”</ThemedText>}
                {c.became_promise && (
                  <ThemedText type="small" themeColor="textSecondary">
                    This commitment became a tracked promise.
                  </ThemedText>
                )}
              </View>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Independent spending</ThemedText>
          {profile.expenditures.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No independent expenditures on record.
            </ThemedText>
          ) : (
            profile.expenditures.map((e, i) => (
              <ThemedText key={i} type="small" themeColor="textSecondary">
                {e.committee} — ${Number(e.amount_usd).toLocaleString()} {e.direction}
                {e.purpose ? ` · ${e.purpose}` : ''} · {e.publisher}
              </ThemedText>
            ))
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Accountability</ThemedText>
          {!data.holdsOffice && (
            <ThemedText type="small" themeColor="textSecondary">
              Not currently an officeholder.
            </ThemedText>
          )}
          {data.pathways.map((p) => (
            <View key={p.id} style={styles.evidenceRow}>
              <ThemedText type="small">{p.mechanism_type}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {p.description}
              </ThemedText>
            </View>
          ))}
          {data.campaigns.map((c) => (
            <ThemedText key={c.id} type="small" themeColor="textSecondary">
              {c.description} · {c.support_count} supporters
            </ThemedText>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold">Endorsements</ThemedText>
          {profile.endorsements.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No endorsements on record.
            </ThemedText>
          ) : (
            profile.endorsements.map((e, i) => (
              <ThemedText key={i} type="small" themeColor="textSecondary">
                {e.organization} · {String(e.endorsed_at).slice(0, 10)} · {e.publisher}
              </ThemedText>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  spinner: { marginTop: Spacing.five },
  centerPad: { padding: Spacing.four },
  headerRow: { gap: Spacing.half },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  flexOne: { flex: 1 },
  evidenceRow: { gap: Spacing.half },
  chip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.half, paddingHorizontal: Spacing.two },
});
