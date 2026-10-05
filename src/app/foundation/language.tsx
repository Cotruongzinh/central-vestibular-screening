import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { getAppCopy } from '@/i18n/app-copy';
import { useAppLanguageContext } from '@/providers/AppLanguageProvider';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import {
  getAppLanguage,
  setAppLanguage,
} from '@/services/app-language.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/foundation/language.styles';
import { APP_LANGUAGE_OPTIONS, type AppLanguage } from '@/types/app-language';

export default function LanguageSettingsScreen() {
  const { setLanguage: setGlobalLanguage } = useAppLanguageContext();
  const [current, setCurrent] = useState<AppLanguage>('vi');
  const [selected, setSelected] = useState<AppLanguage>('vi');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const copy = useMemo(() => getAppCopy(selected).language, [selected]);

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }

      try {
        const language = await getAppLanguage();
        if (!active) return;
        setCurrent(language);
        setSelected(language);
      } catch {
        if (active) setErrorMessage(getAppCopy('vi').language.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');
    try {
      const saved = await setAppLanguage(selected, user.uid);
      setCurrent(saved);
      setSelected(saved);
      setGlobalLanguage(saved);
      setMessage(getAppCopy(saved).language.saved);
    } catch {
      setErrorMessage(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  function languageName(code: AppLanguage) {
    return code === 'vi' ? copy.vietnamese : copy.english;
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
          <Text style={styles.body}>{copy.body}</Text>

          <View style={styles.languageList}>
            {APP_LANGUAGE_OPTIONS.map((option) => {
              const active = selected === option.code;
              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.languageCard, active && styles.languageCardActive]}
                  onPress={() => {
                    setSelected(option.code);
                    setMessage('');
                    setErrorMessage('');
                  }}
                >
                  <Text style={[styles.languageTitle, active && styles.languageTitleActive]}>
                    {languageName(option.code)}
                  </Text>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>{copy.current}</Text>
            <Text style={styles.currentValue}>{loading ? '...' : languageName(current)}</Text>
          </View>

          <View style={styles.boundaryCard}>
            <Text style={styles.boundaryTitle}>{copy.boundaryTitle}</Text>
            <Text style={styles.boundaryBody}>{copy.boundaryBody}</Text>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.buttonGapLarge} />
          <AppButton
            label={saving ? copy.saving : copy.save}
            disabled={loading || saving || selected === current}
            onPress={() => void handleSave()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label={copy.back}
            variant="outline"
            onPress={() => router.replace(SESSION_HREF)}
          />

          <Text style={styles.footnote}>{copy.audit}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
