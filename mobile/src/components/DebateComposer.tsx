import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { canonicalArgumentPayload } from '@/lib/canonical';
import { currentUserIdForSigning, ensureSigningKey, signPayload } from '@/lib/signing';
import { errorCode, post, postFormData } from '@/services/api';

import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t, tf, type Dict } from '@/lib/i18n';

type Side = 'for' | 'against' | 'neutral_info';
type Format = 'text' | 'audio' | 'video';

// Mirrors web's own MAX_MEDIA_SECONDS (DebateComposer.tsx) / media.ts's
// authoritative MAX_DURATION_SECONDS -- this is only the fast client-side
// check (video's is enforced by the OS camera UI itself via
// videoMaxDuration; audio's own recording auto-stops at this mark; a
// library-picked video needs its own check since videoMaxDuration only
// bounds live capture, not an existing file), the server re-checks the
// real uploaded bytes regardless.
const MAX_MEDIA_SECONDS = 180;

const MEDIA_ERROR_KEY: Record<string, keyof Dict> = {
  too_long: 'err_too_long',
  too_large: 'err_too_large',
  invalid: 'err_media_invalid',
  processing_failed: 'err_processing_failed',
  rate_limited: 'err_rate_limited',
};

interface PickedMedia {
  uri: string;
  name: string;
  mimeType: string;
  durationSeconds: number | null;
}

/* Audio/video debate arguments (2026-08-24) -- closing a real web/mobile
   parity gap (web already supported both via a plain
   <input type="file" accept="video/*|audio/*" capture>). Video uses
   expo-image-picker's native camera/library launcher (same idea as web's
   OS file picker -- no custom recording UI to build or maintain); audio
   has no such native-picker shortcut, so it gets a small custom
   record/stop control built on expo-audio.

   Media posts skip the non-repudiation signing text arguments get, same
   as web -- see debates.ts's own comment on that "first pass" scoping
   decision; not revisited here. */
export function DebateComposer({ threadId, onPosted }: { threadId: string; onPosted: () => void }) {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);
  const SIDE_OPTIONS: { value: Side; label: string }[] = [
    { value: 'for', label: d.side_option_for },
    { value: 'against', label: d.side_option_against },
    { value: 'neutral_info', label: d.side_option_neutral },
  ];
  const FORMAT_OPTIONS: { value: Format; label: string }[] = [
    { value: 'text', label: d.comp_format_text },
    { value: 'audio', label: d.comp_format_audio },
    { value: 'video', label: d.comp_format_video },
  ];
  const [side, setSide] = useState<Side>('for');
  const [format, setFormat] = useState<Format>('text');
  const [body, setBody] = useState('');
  const [cite, setCite] = useState('');
  const [needCite, setNeedCite] = useState(false);
  const [claim, setClaim] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, []);

  function selectFormat(v: Format) {
    // Discard, don't keep: stopRecording() (used by the Stop button) also
    // sets `media` from the just-finished recording, which would race the
    // setMedia(null) below and silently leave an audio file attached to a
    // composer the user just switched to 'video' (or 'text') on -- this
    // stops the native recorder without capturing anything into state.
    if (recording) {
      if (elapsedTimer.current) {
        clearInterval(elapsedTimer.current);
        elapsedTimer.current = null;
      }
      setRecording(false);
      void recorder.stop();
    }
    setFormat(v);
    setMedia(null);
    setMediaError(null);
  }

  function clearMedia() {
    setMedia(null);
    setMediaError(null);
  }

  async function startRecording() {
    setMediaError(null);
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) return; // OS-level denial already tells the user why; nothing more to show here
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    setElapsed(0);
    elapsedTimer.current = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= MAX_MEDIA_SECONDS) stopRecording();
        return next;
      });
    }, 1000);
  }

  async function stopRecording() {
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
    setRecording(false);
    await recorder.stop();
    if (recorder.uri) {
      setMedia({ uri: recorder.uri, name: 'argument.m4a', mimeType: 'audio/m4a', durationSeconds: elapsed });
    }
  }

  function handlePickedVideo(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    // videoMaxDuration bounds live camera capture but not an existing file
    // chosen from the library -- same soft client check web's own
    // pickMediaFile does via <video>.loadedmetadata, just reading the
    // metadata expo-image-picker already returned instead of probing it
    // separately.
    const durationSeconds = asset.duration ? asset.duration / 1000 : null;
    if (durationSeconds !== null && durationSeconds > MAX_MEDIA_SECONDS) {
      setMediaError(d.err_too_long);
      return;
    }
    setMedia({
      uri: asset.uri,
      name: asset.fileName ?? 'argument.mp4',
      mimeType: asset.mimeType ?? 'video/mp4',
      durationSeconds,
    });
  }

  async function recordVideo() {
    setMediaError(null);
    const status = await ImagePicker.requestCameraPermissionsAsync();
    if (!status.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: MAX_MEDIA_SECONDS });
    handlePickedVideo(result);
  }

  async function chooseVideo() {
    setMediaError(null);
    const status = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    handlePickedVideo(result);
  }

  async function submit(claimResponse?: 'marked_as_opinion' | 'dismissed') {
    setBusy(true);

    if (format !== 'text') {
      if (!media) {
        setBusy(false);
        return;
      }
      setMediaError(null);
      try {
        const form = new FormData();
        form.append('side', side);
        form.append('format', format);
        // RN's FormData accepts this {uri, name, type} shape for a file
        // part -- not a real Blob/File the way web's DOM FormData needs,
        // this is React Native's own established convention for a
        // multipart file upload; the cast is for TS's DOM-shaped
        // FormData.append typing, which doesn't know about it.
        form.append('media', { uri: media.uri, name: media.name, type: media.mimeType } as unknown as Blob);
        await postFormData(`/api/debates/${threadId}/argue`, form);
        setPosted(true);
        clearMedia();
        onPosted();
      } catch (e) {
        console.error('Media argument post failed:', e);
        const code = errorCode(e);
        if (code === 'pay') router.push('/verify-payment');
        else if (code === 'verify') router.push('/verify');
        else setMediaError(d[MEDIA_ERROR_KEY[code ?? ''] ?? 'err_processing_failed']);
      } finally {
        setBusy(false);
      }
      return;
    }

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
      // Defense in depth: the parent only renders this composer once
      // payment_verified is already true, but tier can lapse mid-session
      // (e.g. a refund) between that check and this submit.
      const code = errorCode(e);
      if (code === 'pay') router.push('/verify-payment');
      else if (code === 'verify') router.push('/verify');
    } finally {
      setBusy(false);
    }
  }

  if (posted) {
    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small">{d.pending_moderation_full}</ThemedText>
        <Pressable onPress={() => setPosted(false)}>
          <ThemedText type="linkPrimary">{d.post_another_argument}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold">{d.add_your_argument}</ThemedText>
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
      <View style={styles.sideRow}>
        {FORMAT_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => selectFormat(o.value)}
            style={[
              styles.sideBtn,
              {
                borderColor: format === o.value ? colors.evidence : colors.textSecondary,
                backgroundColor: format === o.value ? colors.backgroundSelected : 'transparent',
              },
            ]}
          >
            <ThemedText type="small">{o.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {format === 'text' && (
        <>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={d.argument_placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea, { borderColor: colors.textSecondary, color: colors.text }]}
          />
          {(needCite || cite) && (
            <TextInput
              value={cite}
              onChangeText={setCite}
              placeholder={d.source_url_placeholder}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { borderColor: colors.textSecondary, color: colors.text }]}
            />
          )}
        </>
      )}

      {format === 'audio' && (
        <View style={styles.mediaBox}>
          {!media && !recording && (
            <Pressable
              onPress={startRecording}
              style={[styles.mediaBtn, { borderColor: colors.evidence }]}
            >
              <ThemedText type="small">{d.record_btn}</ThemedText>
            </Pressable>
          )}
          {recording && (
            <Pressable
              onPress={stopRecording}
              style={[styles.mediaBtn, { borderColor: colors.evidence, backgroundColor: colors.backgroundSelected }]}
            >
              <ThemedText type="small">
                {tf(d.recording_label, { elapsed: `${elapsed}s` })} — {d.stop_recording_btn}
              </ThemedText>
            </Pressable>
          )}
          {media && !recording && (
            <View style={styles.sideRow}>
              <ThemedText type="small">{tf(d.media_ready, { duration: Math.round(media.durationSeconds ?? 0) })}</ThemedText>
              <Pressable onPress={() => { clearMedia(); startRecording(); }}>
                <ThemedText type="linkPrimary">{d.re_record_btn}</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {format === 'video' && (
        <View style={styles.mediaBox}>
          {!media && (
            <View style={styles.sideRow}>
              <Pressable onPress={recordVideo} style={[styles.mediaBtn, { borderColor: colors.evidence }]}>
                <ThemedText type="small">{d.record_video_btn}</ThemedText>
              </Pressable>
              <Pressable onPress={chooseVideo} style={[styles.mediaBtn, { borderColor: colors.evidence }]}>
                <ThemedText type="small">{d.choose_video_btn}</ThemedText>
              </Pressable>
            </View>
          )}
          {media && (
            <View style={styles.sideRow}>
              <ThemedText type="small">{tf(d.media_ready, { duration: Math.round(media.durationSeconds ?? 0) })}</ThemedText>
              <Pressable onPress={clearMedia}>
                <ThemedText type="linkPrimary">{d.change_media_btn}</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      )}
      {format !== 'text' && (
        <ThemedText type="small" themeColor="textSecondary">
          {d.comp_media_hint}
        </ThemedText>
      )}
      {mediaError && (
        <ThemedText type="small" style={styles.error}>
          {mediaError}
        </ThemedText>
      )}

      {claim && (
        <View style={[styles.claimBox, { borderColor: colors.textSecondary }]}>
          <ThemedText type="small">{tf(d.claim_prompt, { claim })}</ThemedText>
          <View style={styles.claimActions}>
            <Pressable
              disabled={busy}
              onPress={() => {
                setNeedCite(true);
                setClaim(null);
              }}
            >
              <ThemedText type="linkPrimary">{d.add_source}</ThemedText>
            </Pressable>
            <Pressable disabled={busy} onPress={() => submit('marked_as_opinion')}>
              <ThemedText type="linkPrimary">{d.mark_as_opinion}</ThemedText>
            </Pressable>
            <Pressable disabled={busy} onPress={() => submit('dismissed')}>
              <ThemedText type="linkPrimary">{d.dismiss}</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
      {!claim && (
        <Pressable
          disabled={busy || (format === 'text' ? body.trim().length < 10 : !media)}
          onPress={() => submit()}
          style={[
            styles.submitBtn,
            {
              backgroundColor:
                busy || (format === 'text' ? body.trim().length < 10 : !media) ? colors.background : colors.evidence,
            },
          ]}
        >
          <ThemedText type="smallBold">{busy && format !== 'text' ? d.comp_uploading : d.post_argument}</ThemedText>
        </Pressable>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {d.composer_attrib_note}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  sideRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
  sideBtn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  mediaBox: { gap: Spacing.two },
  mediaBtn: { flex: 1, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center' },
  claimBox: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, gap: Spacing.two },
  claimActions: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  submitBtn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  error: { color: '#C0392B' },
});
