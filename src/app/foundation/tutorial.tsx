import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getAppCopy } from '@/i18n/app-copy';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { completeTutorial, getTutorialStatus } from '@/services/tutorial.service';
import { styles } from '@/styles/screens/foundation/tutorial.styles';

const checklistKeys = ['camera', 'head', 'distance', 'lighting'] as const;

export default function TutorialScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getAppCopy(language).tutorial, [language]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }

      try {
        const status = await getTutorialStatus();
        if (active) setCompleted(status.completed);
      } catch {
        if (active) setErrorMessage(copy.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [copy.loadError]);

  async function handleComplete() {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      await completeTutorial(user.uid);
      setCompleted(true);
      setMessage(copy.completed);
    } catch {
      setErrorMessage(copy.saveError);
    } finally {
      setSaving(false);
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
          <View style={[styles.statusPill, completed && styles.statusPillCompleted]}>
            <Text style={[styles.statusText, completed && styles.statusTextCompleted]}>
              {completed ? copy.completedBadge : copy.status}
            </Text>
          </View>

          <Text style={styles.title}>{copy.heading}</Text>
          <Text style={styles.body}>{copy.intro}</Text>

          <View style={styles.phaseCard}>
            <Text style={styles.phaseLabel}>{completed ? copy.review : copy.firstUse}</Text>
          </View>

          <View style={styles.steps}>
            <View style={styles.stepCard}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{copy.steps.holdTitle}</Text>
                <Text style={styles.stepBody}>{copy.steps.holdBody}</Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{copy.steps.distanceTitle}</Text>
                <Text style={styles.stepBody}>{copy.steps.distanceBody}</Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{copy.steps.lightTitle}</Text>
                <Text style={styles.stepBody}>{copy.steps.lightBody}</Text>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>4</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{copy.steps.patientTitle}</Text>
                <Text style={styles.stepBody}>{copy.steps.patientBody}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{copy.checklistTitle}</Text>
          <View style={styles.checklistCard}>
            {checklistKeys.map((key, index) => (
              <View key={key} style={[styles.checkRow, index === checklistKeys.length - 1 && styles.checkRowLast]}>
                <View style={styles.checkDot}><Text style={styles.checkMark}>✓</Text></View>
                <Text style={styles.checkText}>{copy.checklist[key]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.boundaryCard}>
            <Text style={styles.boundaryTitle}>{copy.boundaryTitle}</Text>
            <Text style={styles.boundaryBody}>{copy.boundaryBody}</Text>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.buttonGapLarge} />
          <AppButton
            label={saving ? copy.completing : completed ? copy.completedBadge : copy.complete}
            disabled={loading || saving || completed}
            onPress={() => void handleComplete()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label={copy.back}
            variant="outline"
            onPress={() => router.replace(SESSION_HREF)}
          />

          <Text style={styles.footnote}>{copy.footnote}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
