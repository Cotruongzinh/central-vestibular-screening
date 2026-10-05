import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { getClinicianAccessContext, roleLabel } from '@/services/access-control.service';
import {
  auditActionLabel,
  auditCategoryLabel,
  auditMetadataPreview,
  listAuditTrail,
} from '@/services/audit-log.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/foundation/audit-log.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { AuditLogCategory, AuditLogRecord } from '@/types/audit-log';

type FilterKey = 'all' | AuditLogCategory;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'TẤT CẢ' },
  { key: 'patient', label: 'BỆNH NHÂN' },
  { key: 'test', label: 'KIỂM TRA' },
  { key: 'report', label: 'BÁO CÁO' },
  { key: 'access', label: 'TRUY CẬP' },
  { key: 'system', label: 'HỆ THỐNG' },
];

function formatDate(value: number): string {
  return new Date(value).toLocaleString('vi-VN');
}

function actorLabel(record: AuditLogRecord, access: ClinicianAccessContext): string {
  if (!record.actorUid) return 'HỆ THỐNG / KHÔNG CÓ TÀI KHOẢN';
  return record.actorUid === access.uid ? 'TÀI KHOẢN HIỆN TẠI' : 'CHUYÊN VIÊN KHÁC';
}

export default function AuditLogScreen() {
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [scope, setScope] = useState<'clinic-wide' | 'own'>('own');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified) {
          router.replace('/auth/login');
          return;
        }

        const nextAccess = await getClinicianAccessContext(user.uid, user.email ?? '');
        const view = await listAuditTrail(nextAccess);
        if (active) {
          setAccess(nextAccess);
          setRecords(view.records);
          setScope(view.scope);
        }
      } catch {
        if (active) setErrorMessage('Không thể đọc nhật ký hoạt động đã mã hóa trên thiết bị.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const visibleRecords = useMemo(
    () => (filter === 'all' ? records : records.filter((record) => record.category === filter)),
    [filter, records],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.brand}></Text>
              <Text style={styles.headerTitle}>Nhật ký hoạt động</Text>
            </View>
            <AppEmblem compact />
          </View>
          <Text style={styles.headerSubtitle}>
            Theo dõi các thao tác có ghi thời gian. Thông tin nhật ký được mã hóa trước khi lưu trên thiết bị.
          </Text>
        </View>

        <View style={styles.sheet}>
          {loading ? <Text style={styles.loading}>Đang tải nhật ký hoạt động...</Text> : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {access ? (
            <>
              <View style={styles.scopeRow}>
                <View style={access.role === 'admin' ? styles.adminPill : styles.clinicianPill}>
                  <Text style={access.role === 'admin' ? styles.adminPillText : styles.clinicianPillText}>
                    {roleLabel(access.role)}
                  </Text>
                </View>
                <Text style={styles.scopeText}>
                  {scope === 'clinic-wide' ? 'NHẬT KÝ TOÀN CƠ SỞ' : 'NHẬT KÝ CỦA TÀI KHOẢN'}
                </Text>
              </View>

              <Text style={styles.summaryTitle}>{records.length} mục nhật ký gần nhất</Text>
              <Text style={styles.summaryBody}>
                Quản trị viên có thể xem toàn bộ nhật ký trên thiết bị. Chuyên viên lâm sàng chỉ xem các thao tác do chính tài khoản của mình thực hiện.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map((item) => {
                  const selected = item.key === filter;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setFilter(item.key)}
                      style={[styles.filterChip, selected && styles.filterChipSelected]}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionTitle}>
                {visibleRecords.length} mục trong bộ lọc
              </Text>

              {visibleRecords.length ? (
                visibleRecords.map((record) => (
                  <View key={record.id} style={styles.eventCard}>
                    <View style={styles.eventTopRow}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{auditCategoryLabel(record.category)}</Text>
                      </View>
                      <Text style={styles.eventTime}>{formatDate(record.createdAt)}</Text>
                    </View>
                    <Text style={styles.eventTitle}>{auditActionLabel(record.action)}</Text>
                    <Text style={styles.eventCode}>{record.action}</Text>
                    <View style={styles.eventDivider} />
                    <Text style={styles.eventMeta}>
                      {actorLabel(record, access)}
                      {record.entityType ? ` · ${record.entityType}` : ''}
                      {record.entityId ? ` · ${record.entityId}` : ''}
                    </Text>
                    <Text style={styles.eventPreview}>{auditMetadataPreview(record.metadata)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Chưa có mục nhật ký phù hợp</Text>
                  <Text style={styles.emptyBody}>Hãy chọn bộ lọc khác hoặc thực hiện thêm thao tác trong ứng dụng.</Text>
                </View>
              )}

              <View style={styles.boundaryCard}>
                <Text style={styles.boundaryTitle}>Phạm vi nhật ký trên thiết bị</Text>
                <Text style={styles.boundaryBody}>
                  03Q chỉ đọc nhật ký được lưu trong SQLite trên thiết bị. Dữ liệu này không tự tải lên đám mây và chưa thay thế cơ chế nhật ký phía máy chủ cần có ở bản phát hành chính thức.
                </Text>
              </View>

              <AppButton
                label="VỀ PHIÊN LÀM VIỆC"
                variant="outline"
                onPress={() => router.replace('/auth/session')}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
