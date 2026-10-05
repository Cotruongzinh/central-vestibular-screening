import type { ClinicalTestDefinition, ClinicalTestId } from '@/types/test-administration';

export const CLINICAL_TESTS: readonly ClinicalTestDefinition[] = [
  {
    id: 'smooth-pursuit',
    order: 1,
    nameVi: 'Smooth Pursuit',
    nameEn: 'Smooth Pursuit',
    shortName: 'Pursuit',
    durationLabel: '~60 giây',
    purpose: 'Đánh giá khả năng bám theo mục tiêu chuyển động mượt theo protocol ngang 0,1 Hz.',
    clinicianInstruction:
      'Giữ điện thoại ổn định, nhắc bệnh nhân giữ đầu yên và chỉ dùng mắt để bám mục tiêu.',
    patientInstruction:
      'Giữ đầu yên. Dùng mắt bám theo chấm tròn chuyển động qua lại trên màn hình.',
    stimulusSummary: 'Chấm tròn di chuyển mượt theo phương ngang, không nhảy vị trí.',
    measurements: ['Vị trí mắt', 'Vận tốc mắt', 'Gain của Smooth Pursuit', 'Saccade hiệu chỉnh', 'Chất lượng tín hiệu'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'horizontal-saccades',
    order: 2,
    nameVi: 'Horizontal Saccades',
    nameEn: 'Horizontal Saccades',
    shortName: 'H-Saccades',
    durationLabel: '~60 giây',
    purpose: 'Đánh giá chuyển động mắt nhanh theo phương ngang.',
    clinicianInstruction:
      'Yêu cầu bệnh nhân nhìn vào mục tiêu mới ngay khi chấm tròn đổi vị trí.',
    patientInstruction:
      'Nhìn vào chấm tròn mới nhanh và chính xác nhất có thể khi mục tiêu đổi vị trí.',
    stimulusSummary: 'Mục tiêu nhảy tức thời giữa trái, giữa và phải.',
    measurements: ['Độ trễ', 'Vận tốc đỉnh', 'Độ chính xác', 'Vượt mục tiêu', 'Thiếu biên độ'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'vertical-saccades',
    order: 3,
    nameVi: 'Vertical Saccades',
    nameEn: 'Vertical Saccades',
    shortName: 'V-Saccades',
    durationLabel: '~60 giây',
    purpose: 'Đánh giá chuyển động mắt nhanh theo phương dọc.',
    clinicianInstruction:
      'Yêu cầu bệnh nhân giữ đầu yên và chuyển mắt ngay khi mục tiêu nhảy lên hoặc xuống.',
    patientInstruction:
      'Nhìn vào từng mục tiêu mới nhanh nhất có thể khi chấm tròn đổi vị trí lên hoặc xuống.',
    stimulusSummary: 'Mục tiêu nhảy tức thời giữa trên, giữa và dưới.',
    measurements: ['Độ trễ', 'Vận tốc đỉnh', 'Độ chính xác', 'Vượt mục tiêu', 'Thiếu biên độ'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'anti-saccade',
    order: 4,
    nameVi: 'Anti-Saccade',
    nameEn: 'Anti-Saccade',
    shortName: 'Anti-Saccade',
    durationLabel: '~60 giây',
    purpose: 'Đánh giá khả năng ức chế phản xạ nhìn trực tiếp vào kích thích thị giác.',
    clinicianInstruction:
      'Giải thích rõ trước khi kiểm tra: khi mục tiêu xuất hiện ở một bên, bệnh nhân cần nhìn sang phía đối diện.',
    patientInstruction:
      'Khi chấm tròn xuất hiện một bên, hãy nhìn sang phía đối diện thay vì nhìn trực tiếp vào chấm.',
    stimulusSummary: 'Mục tiêu xuất hiện ngẫu nhiên bên trái hoặc phải; phản ứng đúng là nhìn ngược phía.',
    measurements: ['Tỷ lệ đáp ứng đúng', 'Tỷ lệ lỗi', 'Độ trễ', 'Độ trễ hiệu chỉnh'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'gaze-evoked-nystagmus',
    order: 5,
    nameVi: 'Gaze-Evoked Nystagmus',
    nameEn: 'Gaze-Evoked Nystagmus',
    shortName: 'GEN',
    durationLabel: '~30 giây',
    purpose: 'Quan sát chuyển động mắt khi duy trì nhìn ở các vị trí lệch tâm.',
    clinicianInstruction:
      'Cho bệnh nhân giữ ánh nhìn tại từng vị trí mục tiêu cho tới khi được hướng dẫn đổi vị trí.',
    patientInstruction:
      'Giữ mắt nhìn vào mục tiêu đang hiển thị và tiếp tục nhìn cho tới khi được hướng dẫn.',
    stimulusSummary: 'Mục tiêu đứng yên lần lượt ở giữa, trái, phải, trên và dưới.',
    measurements: ['Vị trí mắt', 'Vận tốc pha chậm SPV (nếu khả thi)', 'Tần suất nhịp (nếu khả thi)', 'Hướng'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'okn',
    order: 6,
    nameVi: 'Optokinetic Nystagmus (OKN)',
    nameEn: 'Optokinetic Nystagmus',
    shortName: 'OKN',
    durationLabel: '~30 giây',
    purpose: 'Đánh giá phản ứng thị động (optokinetic) khi các sọc chuyển động qua trường nhìn.',
    clinicianInstruction:
      'Yêu cầu bệnh nhân nhìn các sọc chuyển động một cách tự nhiên; kích thích thị giác sẽ đổi chiều theo quy trình.',
    patientInstruction:
      'Nhìn các sọc chuyển động một cách tự nhiên. Không cố giữ mắt tại một điểm cố định.',
    stimulusSummary: 'Các sọc song song chạy theo một hướng rồi đảo chiều.',
    measurements: ['Gain OKN', 'Vận tốc mắt', 'Độ đối xứng'],
    inFullBattery: true,
    availability: 'active',
    requirement: 'FR-13 · FR-14',
  },
  {
    id: 'npc',
    order: 7,
    nameVi: 'Convergence / NPC',
    nameEn: 'Near Point of Convergence',
    shortName: 'NPC',
    durationLabel: '~45 giây',
    purpose: 'Đo điểm hội tụ gần (NPC).',
    clinicianInstruction:
      'Di chuyển mục tiêu từ xa tiến dần về gần mũi bệnh nhân. Ở phiên bản hiện tại, chuyên viên ghi nhận khoảng cách BREAK và RECOVERY thủ công.',
    patientInstruction:
      'Theo dõi mục tiêu khi nó từ từ tiến gần về phía mũi.',
    stimulusSummary: 'Mục tiêu tiến dần từ xa đến gần theo trục nhìn.',
    measurements: ['Điểm BREAK', 'Điểm RECOVERY', 'Khoảng cách hội tụ ước tính'],
    inFullBattery: false,
    availability: 'protocol',
    requirement: 'NPC',
  },
] as const;

export const FULL_BATTERY_TESTS = CLINICAL_TESTS.filter((test) => test.inFullBattery);

export function getClinicalTest(testId: string | undefined): ClinicalTestDefinition | undefined {
  return CLINICAL_TESTS.find((test) => test.id === testId);
}

export function isClinicalTestId(value: string | undefined): value is ClinicalTestId {
  return CLINICAL_TESTS.some((test) => test.id === value);
}
