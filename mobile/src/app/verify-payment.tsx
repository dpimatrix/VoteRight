import { CardField, confirmPayment, handleURLCallback, initStripe, StripeProvider } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BackupNudge } from '@/components/BackupNudge';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { errorCode, get, post } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { t } from '@/lib/i18n';

/* Native payment_verified screen (2026-08-19) -- the mobile counterpart to
   web's /verify/payment (app/src/app/verify/payment/page.tsx +
   PaymentCheckout.tsx). Card payment goes through Stripe's own native SDK
   (@stripe/stripe-react-native) rather than embedding the web checkout in a
   WebView -- that would need a cross-context cookie-bridging mechanism
   since mobile authenticates via a header, not a cookie (see
   services/api.ts), where the native SDK just reuses the SAME
   already-authenticated fetch client to get a clientSecret from
   /api/payment-verification/start, exactly like the web page does.

   Card-only for now (no Apple Pay / Google Pay, no ACH/bank-account
   collection -- both are separate, larger native integrations). Mail-in
   check payment needs no payment SDK at all.

   Used to also handle Authorize.Net as the active gateway -- there was no
   native SDK path for it at all (Accept.js is web-only), shown as an
   honest "not available in the app yet" state. Removed along with the
   rest of Authorize.Net support (2026-09-05, migration 102); Stripe is now
   the only gateway, so that fallback state can no longer occur.

   Real bug found live testing 2026-09-05: "Pay to Second" completed a real
   charge (confirmable via Stripe's own dashboard) but the screen just
   silently landed back wherever the navigation stack put it -- no error,
   no confirming spinner, no success state. Root cause: neither
   <StripeProvider> nor the imperative initStripe() call below ever set
   urlScheme/setReturnUrlSchemeOnAndroid, and nothing in the app ever wired
   up Stripe's handleURLCallback to this app's own registered "voteright"
   scheme (app.json). Only matters for a PaymentIntent that actually needs
   3D Secure/SCA authentication -- most test cards skip it, which is why
   this went unnoticed through everything tested so far -- but without a
   configured return URL, confirmPayment() has no way to get the OS back
   into this app once that challenge's own browser session finishes: the
   promise this function is awaiting on just never resolves, and the user
   backing out of a stuck external auth screen is exactly what looks like
   "nothing happened, back to wherever I was." */

function formatFeeCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Matches app.json's own "scheme" -- must be the SAME string Stripe uses to
// build the return URL for a 3D Secure/SCA challenge, or the OS has no way
// to route the post-authentication redirect back into this app at all.
const STRIPE_URL_SCHEME = 'voteright';

interface PublicConfig {
  feeCents: number | null;
  configured: boolean;
  checkPaymentEnabled: boolean;
  checkInstructions: string | null;
  stripePublishableKey: string | null;
  donationsEnabled: boolean;
}

// Fixed donation tiers (2026-09-04, owner's own request: "$20, $50, $100,
// $500, $1000") -- kept in dollars here, matching amount_dollars/lang the
// /api/donate/checkout endpoint actually reads (see that route's own
// comment on why dollars-over-the-wire, not cents). Mirrors web's
// DONATION_TIERS_CENTS in app/src/lib/donations.ts -- not importable
// across the Expo/Next.js boundary, so duplicated the same way every
// other piece of parallel copy in this file already is.
const DONATION_TIERS_DOLLARS = [20, 50, 100, 500, 1000] as const;

interface StartResult {
  recordId: string;
  feeCents: number;
  clientSecret?: string;
  publishableKey?: string;
}

type Screen = 'loading' | 'already_verified' | 'not_configured' | 'need_address' | 'choose' | 'card_form' | 'confirming' | 'check_code';

export default function VerifyPaymentScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lang } = useLanguagePreference();
  const d = t(lang);

  const [screen, setScreen] = useState<Screen>('loading');
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [start, setStart] = useState<StartResult | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkCode, setCheckCode] = useState<{ code: string; instructions: string | null } | null>(null);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
  const [donateBusy, setDonateBusy] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donateAmount, setDonateAmount] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [who, cfg] = await Promise.all([
          get<{ tier: string }>('/api/whoami'),
          get<PublicConfig>('/api/payment-verification/config'),
        ]);
        // Real gap found alongside the donation tiles (2026-09-03): this
        // used to return before setConfig() on the already-verified path,
        // since the pay form below has no use for it -- but the
        // already_verified screen's own donation tiles need
        // config.donationsEnabled too, and that screen previously had no
        // way to reach it on a fresh mount (only after a same-session
        // submitCard() poll, which does set config via beginCardPayment).
        setConfig(cfg);
        if (who.tier === 'payment_verified') {
          setScreen('already_verified');
          return;
        }
        setScreen(cfg.configured ? 'choose' : 'not_configured');
      } catch (e) {
        if (errorCode(e) === 'verify') {
          setScreen('need_address');
        } else {
          console.error('Payment config load failed:', e);
          setError(d.pay_error);
          setScreen('not_configured');
        }
      }
    })();
  }, [d.pay_error]);

  // Completes the loop the header comment describes: once a 3D
  // Secure/SCA challenge finishes in its own external browser session, the
  // OS reopens this app via the voteright:// scheme -- Stripe's own
  // handleURLCallback is what actually resolves confirmPayment()'s
  // pending promise once that redirect lands, both for the cold-start case
  // (app was fully backgrounded/killed during the challenge) and the
  // warm case (app was merely suspended).
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleURLCallback(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleURLCallback(url);
    });
    return () => sub.remove();
  }, []);

  async function beginCardPayment() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<StartResult>('/api/payment-verification/start', {});
      if (!res.clientSecret || !res.publishableKey) {
        setError(d.pay_error);
        return;
      }
      await initStripe({ publishableKey: res.publishableKey, urlScheme: STRIPE_URL_SCHEME, setReturnUrlSchemeOnAndroid: true });
      setStart(res);
      setScreen('card_form');
    } catch (e) {
      console.error('Starting card payment failed:', e);
      setError(d.pay_error);
    } finally {
      setBusy(false);
    }
  }

  async function submitCard() {
    if (!start?.clientSecret) return;
    setBusy(true);
    setError(null);
    try {
      const { error: confirmError } = await confirmPayment(start.clientSecret, { paymentMethodType: 'Card' });
      if (confirmError) {
        setError(confirmError.message);
        return;
      }
      // Our own payment_verified promotion happens off Stripe's webhook
      // (async, same as web) -- confirmPayment succeeding here only means
      // Stripe accepted the charge, not that our server has caught up yet.
      //
      // Real bug found live testing 2026-09-03: this used to call
      // router.back() unconditionally once the poll below finished --
      // whether it actually found payment_verified or just gave up after
      // ~7.5s -- landing the resident back on whatever screen pushed them
      // here. If the webhook hadn't caught up by that exact refocus
      // moment, that screen's own tier refetch (correct, on every focus --
      // see debates.tsx) still read the OLD tier: same "Pay by Card still
      // enabled" symptom the resident actually reported, just one screen
      // removed from where the charge happened. Staying on THIS screen
      // instead -- confirming, then already_verified in place -- means the
      // success state is never rendered before it's actually true.
      setScreen('confirming');
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const who = await get<{ tier: string }>('/api/whoami');
          if (who.tier === 'payment_verified') {
            setScreen('already_verified');
            return;
          }
        } catch (e) {
          console.error('Post-payment tier check failed:', e);
        }
      }
      // Still not promoted after ~7.5s -- the charge went through on
      // Stripe's side either way. Say so plainly rather than silently
      // reverting to the pay form (which would look like nothing happened)
      // or blocking here indefinitely; the resident can leave whenever
      // they're ready and the normal focus-refetch elsewhere in the app
      // picks up the real tier once the webhook lands.
      setConfirmTimedOut(true);
    } catch (e) {
      console.error('Card confirmation failed:', e);
      setError(d.pay_error);
    } finally {
      setBusy(false);
    }
  }

  async function submitCheck() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ referenceCode: string; instructions: string | null; feeCents: number }>(
        '/api/payment-verification/check',
        {},
      );
      setCheckCode({ code: res.referenceCode, instructions: res.instructions });
      setScreen('check_code');
    } catch (e) {
      console.error('Check payment submission failed:', e);
      setError(d.pay_error);
    } finally {
      setBusy(false);
    }
  }

  // Voluntary donation checkout (migration 099, dynamic Stripe Checkout
  // Sessions -- see /api/donate/checkout's own comment for why this
  // replaced admin-pasted Payment Links). The URL only exists after this
  // call resolves, so it can't be a static ExternalLink href like
  // Settings' Membership section uses -- opened the same way that
  // component does internally (openBrowserAsync, in-app browser) once we
  // have it.
  async function startDonation(amountDollars: number) {
    if (!Number.isFinite(amountDollars) || amountDollars < 0.5) {
      setDonateError(d.donate_error);
      return;
    }
    setDonateBusy(true);
    setDonateError(null);
    try {
      const res = await post<{ url: string }>('/api/donate/checkout', { amountDollars, lang });
      await openBrowserAsync(res.url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
      setDonateAmount('');
    } catch (e) {
      console.error('Donation checkout failed:', e);
      setDonateError(d.donate_error);
    } finally {
      setDonateBusy(false);
    }
  }

  if (screen === 'loading') {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ActivityIndicator style={styles.spinner} />
      </KeyboardAwareScreen>
    );
  }

  if (screen === 'need_address') {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="small">{d.unverified_note}</ThemedText>
        <Pressable onPress={() => router.replace('/verify')} style={[styles.btn, { backgroundColor: colors.evidence }]}>
          <ThemedText type="smallBold">{d.verify_btn}</ThemedText>
        </Pressable>
      </KeyboardAwareScreen>
    );
  }

  if (screen === 'confirming') {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        {!confirmTimedOut && <ActivityIndicator style={styles.spinner} />}
        <ThemedText type="small">{confirmTimedOut ? d.pay_confirming_slow : d.pay_confirming}</ThemedText>
        {confirmTimedOut && (
          <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: colors.evidence }]}>
            <ThemedText type="smallBold">{d.continue_btn}</ThemedText>
          </Pressable>
        )}
      </KeyboardAwareScreen>
    );
  }

  if (screen === 'already_verified') {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="small">{d.pay_success}</ThemedText>
        {config?.donationsEnabled && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{d.donate_h}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {d.donate_p}
            </ThemedText>
            {donateError && (
              <ThemedText type="small" style={styles.error}>
                {donateError}
              </ThemedText>
            )}
            <View style={styles.pickerRow}>
              {DONATION_TIERS_DOLLARS.map((amount) => (
                <Pressable
                  key={amount}
                  disabled={donateBusy}
                  onPress={() => startDonation(amount)}
                  style={[styles.pickerChip, { borderColor: donateBusy ? colors.textSecondary : colors.evidence }]}
                >
                  <ThemedText type="small">${amount.toLocaleString('en-US')}</ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={[styles.pickerRow, { alignItems: 'center' }]}>
              <TextInput
                value={donateAmount}
                onChangeText={setDonateAmount}
                placeholder={d.donate_more_placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                editable={!donateBusy}
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, width: '55%' }]}
              />
              <Pressable
                disabled={donateBusy || !donateAmount.trim()}
                onPress={() => startDonation(Number(donateAmount))}
                style={[styles.pickerChip, { borderColor: donateBusy || !donateAmount.trim() ? colors.textSecondary : colors.evidence }]}
              >
                <ThemedText type="small">{d.donate_more_btn}</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
        <BackupNudge d={d} />
      </KeyboardAwareScreen>
    );
  }

  return (
    <StripeProvider
      publishableKey={config?.stripePublishableKey ?? ''}
      urlScheme={STRIPE_URL_SCHEME}
      setReturnUrlSchemeOnAndroid
    >
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {d.pay_h}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {d.pay_p}
        </ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {screen === 'not_configured' && <ThemedText type="small">{d.pay_not_configured}</ThemedText>}

        {screen === 'check_code' && checkCode && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{d.pay_check_code_h}</ThemedText>
            <ThemedText type="title" style={styles.code}>
              {checkCode.code}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {d.pay_check_code_note}
            </ThemedText>
            {checkCode.instructions && <ThemedText type="small">{checkCode.instructions}</ThemedText>}
          </View>
        )}

        {(screen === 'choose' || screen === 'card_form') && config && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">
              {d.pay_fee_label}: {formatFeeCents(config.feeCents ?? 0)}
            </ThemedText>

            {screen === 'choose' && (
              <Pressable
                disabled={busy}
                onPress={beginCardPayment}
                style={[styles.btn, { backgroundColor: busy ? colors.backgroundSelected : colors.evidence }]}
              >
                <ThemedText type="smallBold">{d.pay_pay_by_card_btn}</ThemedText>
              </Pressable>
            )}

            {screen === 'card_form' && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.pay_card_label}
                </ThemedText>
                <CardField
                  postalCodeEnabled
                  style={styles.cardField}
                  // Real bug found live testing (2026-08-23): CardField is a
                  // native component, not a themed RN TextInput -- with no
                  // cardStyle at all it falls back to Stripe's own default
                  // (light theme, white background), rendering as a solid
                  // white box with unreadable text/placeholder against this
                  // app's true-black dark theme. Matched to the same
                  // border/text tokens every other TextInput in this app
                  // already uses.
                  cardStyle={{
                    backgroundColor: colors.backgroundElement,
                    borderWidth: 1,
                    borderColor: colors.textSecondary,
                    borderRadius: 8,
                    textColor: colors.text,
                    placeholderColor: colors.textSecondary,
                    cursorColor: colors.evidence,
                    textErrorColor: '#C0392B',
                    fontSize: 16,
                  }}
                  onCardChange={(details) => setCardComplete(details.complete)}
                />
                <Pressable
                  disabled={busy || !cardComplete}
                  onPress={submitCard}
                  style={[
                    styles.btn,
                    { backgroundColor: busy || !cardComplete ? colors.backgroundSelected : colors.evidence },
                  ]}
                >
                  {busy ? (
                    <ThemedText type="smallBold">{d.pay_processing}</ThemedText>
                  ) : (
                    <ThemedText type="smallBold">{formatFeeCents(start?.feeCents ?? config.feeCents ?? 0)}</ThemedText>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}

        {screen === 'choose' && config?.checkPaymentEnabled && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">{d.pay_check_h}</ThemedText>
            <Pressable
              disabled={busy}
              onPress={submitCheck}
              style={[styles.btn, styles.secondaryBtn, { borderColor: colors.evidence }]}
            >
              <ThemedText type="smallBold" style={{ color: colors.evidence }}>
                {d.pay_check_btn}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScreen>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  spinner: { marginTop: Spacing.five },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  btn: { borderRadius: Spacing.two, padding: Spacing.three, alignItems: 'center' },
  secondaryBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  error: { color: '#C0392B' },
  code: { fontSize: 28, letterSpacing: 2 },
  cardField: { height: 50 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.half },
  pickerChip: { borderWidth: 1, borderRadius: Spacing.four, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  input: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
});
