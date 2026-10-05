import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { AppInput } from '@/components/ui/AppInput';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getAppCopy } from '@/i18n/app-copy';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getAdminFeedbackErrorMessage } from '@/services/admin-feedback.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  countQueuedAdminFeedback,
  flushQueuedAdminFeedback,
  getFeedbackDiagnostics,
  shareFeedbackReport,
  submitFeedbackToAdminOrQueue,
} from '@/services/feedback-report.service';
import { styles } from '@/styles/screens/foundation/feedback-report.styles';
import type { FeedbackKind } from '@/types/feedback-report';

export default function FeedbackReportScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getAppCopy(language).feedback, [language]);
  const diagnostics = useMemo(() => getFeedbackDiagnostics(), []);
  const [kind, setKind] = useState<FeedbackKind>('feedback');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [queueNotice, setQueueNotice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const user = getCurrentClinician();
    if (!user?.emailVerified) return;

    let active = true;
    void (async () => {
      const initialCount = await countQueuedAdminFeedback().catch(() => 0);
      if (!active) return;
      setQueueCount(initialCount);
      if (initialCount <= 0) return;

      setQueueNotice(copy.retryingQueue);
      try {
        const delivered = await flushQueuedAdminFeedback(user.uid);
        if (!active) return;
        const remaining = await countQueuedAdminFeedback().catch(() => initialCount);
        setQueueCount(remaining);
        setQueueNotice(delivered > 0 ? copy.queueFlushed : '');
      } catch {
        if (active) setQueueNotice('');
      }
    })();

    return () => { active = false; };
  }, [copy.queueFlushed, copy.retryingQueue]);

  function ensureVerifiedUser() {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return null;
    }
    return user;
  }

  async function handleSendToAdmin() {
    const user = ensureVerifiedUser();
    if (!user) return;
    if (!message.trim()) {
      setSuccessMessage('');
      setErrorMessage(copy.requiredError);
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    setQueueNotice('');

    try {
      const result = await submitFeedbackToAdminOrQueue({
        actorUid: user.uid,
        kind,
        message,
        reproductionSteps: kind === 'bug' ? steps : undefined,
        includeDiagnostics,
        language,
      });

      setSuccessMessage(result.delivery === 'sent' ? copy.sentAdmin : copy.queuedAdmin);
      const remaining = await countQueuedAdminFeedback().catch(() => queueCount);
      setQueueCount(remaining);
      setMessage('');
      setSteps('');
    } catch (error) {
      setErrorMessage(getAdminFeedbackErrorMessage(error, language) || copy.adminSendError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const user = ensureVerifiedUser();
    if (!user) return;
    if (!message.trim()) {
      setSuccessMessage('');
      setErrorMessage(copy.requiredError);
      return;
    }

    setSharing(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await shareFeedbackReport({
        actorUid: user.uid,
        kind,
        message,
        reproductionSteps: kind === 'bug' ? steps : undefined,
        includeDiagnostics,
        language,
      });
      setSuccessMessage(copy.shared);
    } catch {
      setErrorMessage(copy.shareError);
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text style={styles.heroTitle}>{copy.title}</Text>
              <Text style={styles.heroBody}>{copy.subtitle}</Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{copy.status}</Text>
          </View>

          <Text style={styles.title}>{copy.heading}</Text>
          <Text style={styles.body}>{copy.intro}</Text>

          {queueCount > 0 || queueNotice ? (
            <View style={styles.queueCard}>
              {queueCount > 0 ? <Text style={styles.queueTitle}>{copy.queuedCount}: {queueCount}</Text> : null}
              {queueNotice ? <Text style={styles.queueBody}>{queueNotice}</Text> : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{copy.kindTitle}</Text>
          <View style={styles.kindRow}>
            <Pressable
              onPress={() => setKind('feedback')}
              style={[styles.kindCard, kind === 'feedback' && styles.kindCardSelected]}
            >
              <Text style={[styles.kindTitle, kind === 'feedback' && styles.kindTitleSelected]}>
                {copy.feedbackKind}
              </Text>
              <Text style={styles.kindBody}>{copy.feedbackKindBody}</Text>
            </Pressable>

            <Pressable
              onPress={() => setKind('bug')}
              style={[styles.kindCard, kind === 'bug' && styles.kindCardSelected]}
            >
              <Text style={[styles.kindTitle, kind === 'bug' && styles.kindTitleSelected]}>
                {copy.bugKind}
              </Text>
              <Text style={styles.kindBody}>{copy.bugKindBody}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>{copy.detailsTitle}</Text>
          <AppInput
            label={copy.messageLabel}
            placeholder={copy.messagePlaceholder}
            multiline
            maxLength={1800}
            value={message}
            onChangeText={setMessage}
            style={styles.textArea}
          />

          {kind === 'bug' ? (
            <AppInput
              label={copy.stepsLabel}
              placeholder={copy.stepsPlaceholder}
              multiline
              maxLength={1200}
              value={steps}
              onChangeText={setSteps}
              style={styles.stepsArea}
            />
          ) : null}

          <View style={styles.diagnosticsCard}>
            <View style={styles.diagnosticsTop}>
              <View style={styles.diagnosticsCopy}>
                <Text style={styles.diagnosticsTitle}>{copy.diagnosticsTitle}</Text>
                <Text style={styles.diagnosticsBody}>{copy.diagnosticsBody}</Text>
              </View>
              <Switch value={includeDiagnostics} onValueChange={setIncludeDiagnostics} />
            </View>

            {includeDiagnostics ? (
              <View style={styles.diagnosticList}>
                <Text style={styles.diagnosticLine}>{copy.appVersion}: {diagnostics.appVersion}</Text>
                <Text style={styles.diagnosticLine}>{copy.platform}: {diagnostics.platform}</Text>
                <Text style={styles.diagnosticLine}>{copy.osVersion}: {diagnostics.osVersion}</Text>
                <Text style={styles.diagnosticLine}>{copy.device}: {diagnostics.deviceModel}</Text>
                <Text style={styles.diagnosticLine}>{copy.runtime}: {diagnostics.executionEnvironment}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>{copy.privacyTitle}</Text>
            <Text style={styles.privacyBody}>{copy.privacyBody}</Text>
          </View>

          <View style={styles.boundaryCard}>
            <Text style={styles.boundaryTitle}>{copy.boundaryTitle}</Text>
            <Text style={styles.boundaryBody}>{copy.boundaryBody}</Text>
          </View>

          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.buttonGapLarge} />
          <AppButton
            label={submitting ? copy.sendingAdmin : copy.sendAdmin}
            disabled={submitting || sharing}
            onPress={() => void handleSendToAdmin()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label={sharing ? copy.sharing : copy.share}
            variant="outline"
            disabled={sharing || submitting}
            onPress={() => void handleShare()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label={copy.back}
            variant="outline"
            onPress={() => router.replace(SESSION_HREF)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
