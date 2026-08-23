import { CardField, confirmPayment, initStripe, StripeProvider } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

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
   collection -- both are separate, larger native integrations). If
   Authorize.Net is the active gateway, there's no native SDK path at all
   (Accept.js is web-only) -- shown as an honest "not available in the app
   yet" state, not a silent dead end. Mail-in check payment needs no
   payment SDK at all and works regardless of which gateway is active. */

function formatFeeCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PublicConfig {
  feeCents: number | null;
  activeGateway: 'stripe' | 'authorizenet' | null;
  configured: boolean;
  checkPaymentEnabled: boolean;
  checkInstructions: string | null;
  stripePublishableKey: string | null;
}

interface StartResult {
  gateway: 'stripe' | 'authorizenet';
  recordId: string;
  feeCents: number;
  clientSecret?: string;
  publishableKey?: string;
}

type Screen = 'loading' | 'already_verified' | 'not_configured' | 'need_address' | 'choose' | 'card_form' | 'check_code';

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

  useEffect(() => {
    (async () => {
      try {
        const [who, cfg] = await Promise.all([
          get<{ tier: string }>('/api/whoami'),
          get<PublicConfig>('/api/payment-verification/config'),
        ]);
        if (who.tier === 'payment_verified') {
          setScreen('already_verified');
          return;
        }
        setConfig(cfg);
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

  async function beginCardPayment() {
    setBusy(true);
    setError(null);
    try {
      const res = await post<StartResult>('/api/payment-verification/start', {});
      if (res.gateway !== 'stripe' || !res.clientSecret || !res.publishableKey) {
        setError(d.pay_gateway_unsupported);
        return;
      }
      await initStripe({ publishableKey: res.publishableKey });
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
      // A short poll makes the wait feel immediate instead of leaving the
      // user to guess and re-check manually.
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const who = await get<{ tier: string }>('/api/whoami');
          if (who.tier === 'payment_verified') {
            router.back();
            return;
          }
        } catch (e) {
          console.error('Post-payment tier check failed:', e);
        }
      }
      // Still not promoted after ~7.5s -- the charge went through on
      // Stripe's side either way, so send them back rather than block here;
      // the next screen load will reflect the tier once the webhook lands.
      router.back();
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

  if (screen === 'already_verified') {
    return (
      <KeyboardAwareScreen backgroundColor={colors.background} contentContainerStyle={styles.content}>
        <ThemedText type="small">{d.pay_success}</ThemedText>
      </KeyboardAwareScreen>
    );
  }

  return (
    <StripeProvider publishableKey={config?.stripePublishableKey ?? ''}>
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
              <>
                {config.activeGateway === 'stripe' ? (
                  <Pressable
                    disabled={busy}
                    onPress={beginCardPayment}
                    style={[styles.btn, { backgroundColor: busy ? colors.backgroundSelected : colors.evidence }]}
                  >
                    <ThemedText type="smallBold">{d.pay_pay_by_card_btn}</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small">{d.pay_gateway_unsupported}</ThemedText>
                )}
              </>
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
});
