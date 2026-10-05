import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getAppCopy } from '@/i18n/app-copy';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import {
  getAdminFeedbackErrorMessage,
  listAdminFeedbackReports,
  setAdminFeedbackReportStatus,
} from '@/services/admin-feedback.service';
import { writeAuditEvent } from '@/services/audit.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/foundation/admin-feedback-inbox.styles';
import type { AdminFeedbackRecord, AdminFeedbackStatus } from '@/types/admin-feedback';

type Filter = 'all' | AdminFeedbackStatus;

export default function AdminFeedbackInboxScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getAppCopy(language).adminFeedbackInbox, [language]);
  const [reports, setReports] = useState<AdminFeedbackRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const visibleReports = useMemo(
    () => filter === 'all' ? reports : reports.filter((report) => report.status === filter),
    [filter, reports],
  );

  async function loadReports(showRefresh = false) {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      const access = await getClinicianAccessContext(user.uid, user.email ?? '', { forceRefresh: true });
      if (access.role !== 'admin' || access.authority !== 'server') {
        setAllowed(false);
        setReports([]);
        return;
      }
      setAllowed(true);
      setReports(await listAdminFeedbackReports());
    } catch (error) {
      setErrorMessage(getAdminFeedbackErrorMessage(error, language) || copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [language]);

  async function updateStatus(report: AdminFeedbackRecord, status: AdminFeedbackStatus) {
    if (report.status === status || updatingId) return;
    const user = getCurrentClinician();
    if (!user?.emailVerified) return;

    setUpdatingId(report.id);
    setErrorMessage('');
    try {
      const updated = await setAdminFeedbackReportStatus(report.id, status);
      setReports((current) => current.map((item) => item.id === updated.id ? updated : item));
      await writeAuditEvent({
        actorUid: user.uid,
        action: 'support.feedback_admin_status',
        entityType: 'support',
        entityId: report.id,
        metadata: { from: report.status, to: status },
      });
    } catch (error) {
      setErrorMessage(getAdminFeedbackErrorMessage(error, language) || copy.updateError);
    } finally {
      setUpdatingId(null);
    }
  }

  function statusLabel(status: AdminFeedbackStatus) {
    if (status === 'open') return copy.open;
    if (status === 'in-progress') return copy.inProgress;
    return copy.resolved;
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadReports(true)} />}
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
          <View style={styles.statusPill}><Text style={styles.statusText}>{copy.status}</Text></View>
          <Text style={styles.title}>{copy.heading}</Text>
          <Text style={styles.body}>{copy.intro}</Text>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>{copy.privacyTitle}</Text>
            <Text style={styles.privacyBody}>{copy.privacyBody}</Text>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          {allowed === false ? (
            <>
              <View style={styles.warningCard}><Text style={styles.warningText}>{copy.noAccess}</Text></View>
              <View style={styles.buttonGapLarge} />
              <AppButton label={copy.back} variant="outline" onPress={() => router.replace(SESSION_HREF)} />
            </>
          ) : (
            <>
              <View style={styles.filterRow}>
                {([
                  ['all', copy.all],
                  ['open', copy.open],
                  ['in-progress', copy.inProgress],
                  ['resolved', copy.resolved],
                ] as const).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setFilter(value)}
                    style={[styles.filterChip, filter === value && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>{copy.reports} · {visibleReports.length}</Text>
              {loading ? <Text style={styles.loading}>{language === 'vi' ? 'Đang tải từ backend...' : 'Loading from backend...'}</Text> : null}
              {!loading && visibleReports.length === 0 ? <Text style={styles.empty}>{copy.empty}</Text> : null}

              {visibleReports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={styles.kindPill}>
                      <Text style={styles.kindText}>{report.kind === 'bug' ? copy.bug : copy.feedback}</Text>
                    </View>
                    <View style={[styles.statusBadge, report.status === 'resolved' && styles.statusResolved, report.status === 'in-progress' && styles.statusProgress]}>
                      <Text style={styles.statusBadgeText}>{statusLabel(report.status)}</Text>
                    </View>
                  </View>

                  <Text style={styles.timestamp}>{copy.created}: {formatTime(report.createdAt)}</Text>
                  <Text style={styles.message}>{report.message}</Text>

                  {report.reproductionSteps ? (
                    <View style={styles.detailBlock}>
                      <Text style={styles.detailTitle}>{copy.steps}</Text>
                      <Text style={styles.detailBody}>{report.reproductionSteps}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailBlock}>
                    <Text style={styles.detailTitle}>{copy.diagnostics}</Text>
                    {report.diagnostics ? (
                      <Text style={styles.detailBody}>
                        {report.diagnostics.deviceModel} · {report.diagnostics.platform} {report.diagnostics.osVersion} · app {report.diagnostics.appVersion}
                      </Text>
                    ) : <Text style={styles.detailBody}>{copy.noDiagnostics}</Text>}
                  </View>

                  <View style={styles.statusActions}>
                    {(['open', 'in-progress', 'resolved'] as const).map((status) => (
                      <Pressable
                        key={status}
                        disabled={Boolean(updatingId)}
                        onPress={() => void updateStatus(report, status)}
                        style={[styles.statusAction, report.status === status && styles.statusActionActive, Boolean(updatingId) && styles.disabled]}
                      >
                        <Text style={[styles.statusActionText, report.status === status && styles.statusActionTextActive]}>
                          {updatingId === report.id && report.status !== status ? copy.updating : statusLabel(status)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.buttonGapLarge} />
              <AppButton label={copy.refresh} onPress={() => void loadReports(true)} />
              <View style={styles.buttonGap} />
              <AppButton label={copy.back} variant="outline" onPress={() => router.replace(SESSION_HREF)} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
