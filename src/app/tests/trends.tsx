import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getLongitudinalComparisonErrorMessage,
  listPatientLongitudinalSeries,
} from '@/services/longitudinal-comparison.service';
import { getPatientById } from '@/services/patient.service';
import { testStoredSessionHref } from '@/navigation/test-routes';
import { trendsStyles as styles } from '@/styles/screens/tests/trends.styles';
import type { LongitudinalComparisonSeries } from '@/types/longitudinal-comparison';
import type { PatientRecord } from '@/types/patient';
import type { ClinicalTestId } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN');
}

function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatNumericValue(value: number, unit: LongitudinalComparisonSeries['unit']): string {
  switch (unit) {
    case 'ms':
      return `${Math.round(value)} ms`;
    case '%':
      return `${value.toFixed(1)}%`;
    case '/s':
      return `${value.toFixed(3)} /s`;
    case 'ratio':
    default:
      return value.toFixed(3);
  }
}

function formatSignedDelta(value: number, unit: LongitudinalComparisonSeries['unit']): string {
  const prefix = value > 0 ? '+' : '';
  if (unit === 'ms') {
    return `${prefix}${Math.round(value)} ms`;
  }
  if (unit === '%') {
    return `${prefix}${value.toFixed(1)} pp`;
  }
  if (unit === '/s') {
    return `${prefix}${value.toFixed(3)} /s`;
  }
  return `${prefix}${value.toFixed(3)}`;
}

function LongitudinalChart({ series }: { series: LongitudinalComparisonSeries }) {
  const width = 340;
  const height = 218;
  const left = 48;
  const right = 324;
  const top = 20;
  const bottom = 164;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const values = series.points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin;
  const fallbackPadding = Math.max(Math.abs(rawMax) * 0.1, series.unit === 'ms' ? 10 : 0.1);
  const padding = spread > 0 ? spread * 0.15 : fallbackPadding;
  const minValue = Math.max(0, rawMin - padding);
  const maxValue = rawMax + padding;
  const range = Math.max(maxValue - minValue, 0.000001);

  const xForIndex = (index: number) => {
    if (series.points.length <= 1) {
      return left + plotWidth / 2;
    }
    return left + (index / (series.points.length - 1)) * plotWidth;
  };

  const yForValue = (value: number) => bottom - ((value - minValue) / range) * plotHeight;
  const polylinePoints = series.points
    .map((point, index) => `${xForIndex(index)},${yForValue(point.value)}`)
    .join(' ');

  const gridSteps = 3;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: gridSteps + 1 }, (_, index) => {
        const ratio = index / gridSteps;
        const y = top + ratio * plotHeight;
        const value = maxValue - ratio * range;
        return (
          <G key={`grid-${index}`}>
            <Line x1={left} y1={y} x2={right} y2={y} stroke="#D8E4EA" strokeWidth="1" />
            <SvgText
              x={left - 7}
              y={y + 4}
              fill="#6F8493"
              fontSize="9"
              textAnchor="end"
            >
              {series.unit === 'ms' ? Math.round(value) : value.toFixed(series.unit === '%' ? 1 : 2)}
            </SvgText>
          </G>
        );
      })}

      <Line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#9FB2BF" strokeWidth="1.3" />
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke="#0A78B8"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {series.points.map((point, index) => {
        const x = xForIndex(index);
        const y = yForValue(point.value);
        const shouldLabel = series.points.length <= 6 || index === 0 || index === series.points.length - 1;
        return (
          <G key={point.sessionId}>
            <Circle cx={x} cy={y} r="5" fill="#FFFFFF" stroke="#0A78B8" strokeWidth="3" />
            {shouldLabel ? (
              <SvgText x={x} y={191} fill="#6F8493" fontSize="9" textAnchor="middle">
                {formatShortDate(point.completedAt)}
              </SvgText>
            ) : null}
          </G>
        );
      })}

      <SvgText x={left} y={208} fill="#6F8493" fontSize="9.5">
        cũ nhất
      </SvgText>
      <SvgText x={right} y={208} fill="#6F8493" fontSize="9.5" textAnchor="end">
        mới nhất
      </SvgText>
    </Svg>
  );
}

export default function TrendsScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const requestedTestId = firstParam(params.testId as string | string[] | undefined) as ClinicalTestId | '';

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [series, setSeries] = useState<LongitudinalComparisonSeries[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<ClinicalTestId | ''>('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified || !patientId) {
          throw new Error('COMPARISON_CONTEXT_MISSING');
        }

        const [storedPatient, storedSeries] = await Promise.all([
          getPatientById(user.uid, patientId),
          listPatientLongitudinalSeries(user.uid, patientId),
        ]);

        if (!storedPatient) {
          throw new Error('PATIENT_NOT_FOUND');
        }

        if (!active) {
          return;
        }

        setPatient(storedPatient);
        setSeries(storedSeries);

        const requested = storedSeries.find((item) => item.testId === requestedTestId);
        const firstComparable = storedSeries.find((item) => item.points.length >= 2);
        const fallback = storedSeries[0];
        setSelectedTestId(requested?.testId ?? firstComparable?.testId ?? fallback?.testId ?? '');
      } catch (error) {
        if (active) {
          setErrorMessage(getLongitudinalComparisonErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [patientId, requestedTestId]);

  const selected = useMemo(
    () => series.find((item) => item.testId === selectedTestId) ?? null,
    [selectedTestId, series],
  );

  const comparableCount = series.filter((item) => item.points.length >= 2).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>So sánh theo thời gian</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Theo dõi cùng một chỉ số kỹ thuật qua nhiều lần kiểm tra đã lưu của cùng bệnh nhân.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip items={[{ requirement: 'FR-27', value: 'So sánh kết quả theo thời gian' }]} />

          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>SO SÁNH THEO THỜI GIAN TRÊN THIẾT BỊ</LocalizedPipelineText>
          </View>

          {loading ? <LocalizedPipelineText language={language} style={styles.loading}>Đang tải lịch sử kiểm tra...</LocalizedPipelineText> : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorText}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {patient ? (
            <>
              <LocalizedPipelineText language={language} style={styles.title}>{patient.payload.fullName}</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.body}>
                {patient.localCode} · {series.length} loại test có dữ liệu · {comparableCount} loại đủ ≥2 lần để vẽ so sánh.
              </LocalizedPipelineText>

              {series.length > 0 ? (
                <>
                  <LocalizedPipelineText language={language} style={styles.selectorTitle}>Chọn bài kiểm tra</LocalizedPipelineText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectorRow}
                  >
                    {series.map((item) => {
                      const active = item.testId === selectedTestId;
                      return (
                        <Pressable
                          key={item.testId}
                          accessibilityRole="button"
                          onPress={() => setSelectedTestId(item.testId)}
                          style={[
                            styles.selectorChip,
                            active && styles.selectorChipActive,
                          ]}
                        >
                          <LocalizedPipelineText language={language}
                            style={[
                              styles.selectorChipText,
                              active && styles.selectorChipTextActive,
                            ]}
                          >
                            {item.shortName} · {item.points.length}
                          </LocalizedPipelineText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {selected && selected.points.length >= 2 ? (
                <>
                  <View style={styles.comparisonCard}>
                    <LocalizedPipelineText language={language} style={styles.comparisonEyebrow}>{selected.metricLabel.toUpperCase()}</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.comparisonTitle}>{selected.testName}</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.comparisonMeta}>
                      {selected.points.length} phiên · từ {formatDate(selected.points[0].completedAt)} đến {formatDate(selected.points[selected.points.length - 1].completedAt)}
                    </LocalizedPipelineText>

                    <View style={styles.deltaRow}>
                      <View style={styles.deltaBox}>
                        <LocalizedPipelineText language={language} style={styles.deltaLabel}>LẦN ĐẦU</LocalizedPipelineText>
                        <LocalizedPipelineText language={language} style={styles.deltaValue}>
                          {formatNumericValue(selected.firstValue, selected.unit)}
                        </LocalizedPipelineText>
                      </View>
                      <View style={styles.deltaBox}>
                        <LocalizedPipelineText language={language} style={styles.deltaLabel}>LẦN MỚI NHẤT</LocalizedPipelineText>
                        <LocalizedPipelineText language={language} style={styles.deltaValue}>
                          {formatNumericValue(selected.latestValue, selected.unit)}
                        </LocalizedPipelineText>
                      </View>
                    </View>

                    <View style={styles.deltaRow}>
                      <View style={styles.deltaBox}>
                        <LocalizedPipelineText language={language} style={styles.deltaLabel}>CHÊNH LỆCH</LocalizedPipelineText>
                        <LocalizedPipelineText language={language} style={styles.deltaValue}>
                          {formatSignedDelta(selected.absoluteDelta, selected.unit)}
                        </LocalizedPipelineText>
                      </View>
                    </View>

                    <View style={styles.chartWrap}>
                      <LocalizedPipelineText language={language} style={styles.chartCaption}>
                        Biểu đồ tự điều chỉnh thang đo theo các lần đo của bài kiểm tra này. Giá trị gốc vẫn hiển thị bên dưới.
                      </LocalizedPipelineText>
                      <LongitudinalChart series={selected} />
                    </View>
                  </View>

                  <View style={styles.warningBox}>
                    <LocalizedPipelineText language={language} style={styles.warningTitle}>Không diễn giải tăng/giảm là tốt/xấu</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.warningBody}>
                      FR-27 chỉ so sánh chỉ số kỹ thuật theo thời gian. 03N không áp ngưỡng tham chiếu, không gắn nhãn bình thường/bất thường và không đưa ra chẩn đoán.
                    </LocalizedPipelineText>
                  </View>

                  <LocalizedPipelineText language={language} style={styles.historyTitle}>Các phiên của {selected.shortName}</LocalizedPipelineText>
                  {[...selected.points].reverse().map((point) => (
                    <Pressable
                      key={point.sessionId}
                      accessibilityRole="button"
                      onPress={() => router.push(testStoredSessionHref(patient.id, point.sessionId))}
                      style={({ pressed }) => [
                        styles.pointCard,
                        pressed && styles.pointCardPressed,
                      ]}
                    >
                      <View style={styles.pointRow}>
                        <View style={styles.pointTextWrap}>
                          <LocalizedPipelineText language={language} style={styles.pointValue}>{point.valueText}</LocalizedPipelineText>
                          <LocalizedPipelineText language={language} style={styles.pointMeta}>
                            {formatDate(point.completedAt)} · usable {(point.usableRatio * 100).toFixed(1)}% · tín hiệu tốt {(point.greenRatio * 100).toFixed(1)}%
                          </LocalizedPipelineText>
                        </View>
                        <LocalizedPipelineText language={language} style={styles.pointChevron}>›</LocalizedPipelineText>
                      </View>
                    </Pressable>
                  ))}
                </>
              ) : selected ? (
                <View style={styles.emptyBox}>
                  <LocalizedPipelineText language={language} style={styles.emptyTitle}>Chưa đủ 2 lần cùng một bài kiểm tra</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.emptyBody}>
                    {selected.testName} hiện mới có {selected.points.length} phiên có kết quả kỹ thuật. Cần ít nhất 2 lần đã lưu để vẽ so sánh FR-27.
                  </LocalizedPipelineText>
                </View>
              ) : !loading && !errorMessage ? (
                <View style={styles.emptyBox}>
                  <LocalizedPipelineText language={language} style={styles.emptyTitle}>Chưa có đủ kết quả để so sánh</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.emptyBody}>
                    Hoàn tất và lưu ít nhất hai lần cùng một bài kiểm tra. 03N sẽ đọc dữ liệu đã mã hóa từ SQLite trên thiết bị và tạo biểu đồ theo thời gian.
                  </LocalizedPipelineText>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.replace({
                    pathname: '/patients/[id]',
                    params: { id: patient.id },
                  } as never)
                }
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.primaryButtonText}>VỀ HỒ SƠ BỆNH NHÂN</LocalizedPipelineText>
              </Pressable>

              <LocalizedPipelineText language={language} style={styles.footnote}>
                Dữ liệu FR-27 được đọc từ các phiên và kết quả đã mã hóa trên thiết bị. Không tải dữ liệu lên đám mây và không dùng cơ sở dữ liệu tham chiếu ở bước này.
              </LocalizedPipelineText>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
