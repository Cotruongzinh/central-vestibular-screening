import type { ClinicalTestId } from '@/types/test-administration';

export function getStimulusRequirementSummary(testId: ClinicalTestId): string {
  switch (testId) {
    case 'smooth-pursuit':
      return 'Ngang hình sin · 0,1 Hz';
    case 'horizontal-saccades':
      return 'Nhảy ngang · nhịp 1,1–1,9 giây';
    case 'vertical-saccades':
      return 'Nhảy dọc · nhịp 1,1–1,9 giây';
    case 'anti-saccade':
      return 'Cue 0,7 giây · nhìn phía đối diện';
    case 'gaze-evoked-nystagmus':
      return '5 vị trí nhìn · giữ 5 giây/điểm';
    case 'okn':
      return 'Sọc chuyển động · đổi hướng mỗi 5 giây';
    case 'npc':
      return 'BREAK / RECOVERY · đơn vị cm';
  }
}
