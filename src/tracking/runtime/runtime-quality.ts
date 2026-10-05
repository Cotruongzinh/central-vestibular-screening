import {
  HEAD_PITCH_LIMIT,
  HEAD_ROLL_LIMIT,
  HEAD_SHIFT_LIMIT,
  HEAD_YAW_LIMIT,
} from '@/tracking/calibration/calibration';
import type { RuntimeQualityLevel } from '@/types/test-runtime';
import type { EyeTrackingSpikeMessage } from '@/types/tracking';

type TrackingState = Extract<EyeTrackingSpikeMessage, { type: 'tracking' }>;

export type RuntimeQualityAssessment = {
  level: RuntimeQualityLevel;
  message: string;
};

export function assessRuntimeQuality(
  tracking: TrackingState | undefined,
): RuntimeQualityAssessment {
  if (!tracking) {
    return {
      level: 'red',
      message: 'Đang chờ tracking',
    };
  }

  const head = tracking.headPose;
  const eye = tracking.binocularEye;

  if (
    !tracking.faceDetected ||
    !head?.baselineReady ||
    eye?.horizontal === null ||
    eye?.horizontal === undefined ||
    eye?.vertical === null ||
    eye?.vertical === undefined
  ) {
    return {
      level: 'red',
      message: 'Mất face/eye signal',
    };
  }

  const fps = tracking.trackingFps ?? 0;

  if (fps > 0 && fps < 20) {
    return {
      level: 'red',
      message: 'Tracking FPS thấp',
    };
  }

  if (
    head.yawDeltaDeg === null ||
    head.pitchDeltaDeg === null ||
    head.rollDeltaDeg === null ||
    head.shiftX === null ||
    head.shiftY === null
  ) {
    return {
      level: 'red',
      message: 'Head pose chưa sẵn sàng',
    };
  }

  const hardHeadLimitExceeded =
    Math.abs(head.yawDeltaDeg) > HEAD_YAW_LIMIT ||
    Math.abs(head.pitchDeltaDeg) > HEAD_PITCH_LIMIT ||
    Math.abs(head.rollDeltaDeg) > HEAD_ROLL_LIMIT ||
    Math.abs(head.shiftX) > HEAD_SHIFT_LIMIT ||
    Math.abs(head.shiftY) > HEAD_SHIFT_LIMIT;

  if (hardHeadLimitExceeded) {
    return {
      level: 'red',
      message: 'Giữ đầu/điện thoại ổn định',
    };
  }

  const nearHeadLimit =
    Math.abs(head.yawDeltaDeg) > HEAD_YAW_LIMIT * 0.7 ||
    Math.abs(head.pitchDeltaDeg) > HEAD_PITCH_LIMIT * 0.7 ||
    Math.abs(head.rollDeltaDeg) > HEAD_ROLL_LIMIT * 0.7 ||
    Math.abs(head.shiftX) > HEAD_SHIFT_LIMIT * 0.7 ||
    Math.abs(head.shiftY) > HEAD_SHIFT_LIMIT * 0.7;

  if ((fps > 0 && fps < 30) || nearHeadLimit) {
    return {
      level: 'yellow',
      message: nearHeadLimit
        ? 'Đầu đang gần giới hạn kỹ thuật'
        : 'Tracking FPS trung bình',
    };
  }

  return {
    level: 'green',
    message: 'Tracking ổn định',
  };
}
