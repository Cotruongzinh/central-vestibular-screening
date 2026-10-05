export type NormalizedPoint = {
  x: number;
  y: number;
};

export type EyeRelativeFeatures = {
  horizontal: number | null;
  vertical: number | null;
  aperture: number | null;
};

export type EyeDiagnosticFeatures = {
  baselineReady: boolean;
  horizontalDelta: number | null;
  verticalDelta: number | null;
  baselineSigmaH: number | null;
  baselineSigmaV: number | null;
  horizontalThreshold: number | null;
  verticalThreshold: number | null;
  horizontalRangeMin: number | null;
  horizontalRangeMax: number | null;
  verticalRangeMin: number | null;
  verticalRangeMax: number | null;
  state: string;
};

export type HeadPoseFeatures = {
  matrixAvailable: boolean;
  yawDeg: number | null;
  pitchDeg: number | null;
  rollDeg: number | null;
  yawDeltaDeg: number | null;
  pitchDeltaDeg: number | null;
  rollDeltaDeg: number | null;
  shiftX: number | null;
  shiftY: number | null;
  baselineReady: boolean;
  movementLabel: string;
};

export type EyeTrackingSpikeMessage =
  | {
      type: 'environment';
      secureContext: boolean;
      hasMediaDevices: boolean;
      bundleUri?: string;
      wasmUri?: string;
      modelUri?: string;
    }
  | {
      type: 'asset-status';
      status: 'loading' | 'ready' | 'error';
      stage?: string;
      message?: string;
    }
  | {
      type: 'camera-status';
      status: 'requesting' | 'ready' | 'error';
      width?: number | null;
      height?: number | null;
      frameRate?: number | null;
      message?: string;
    }
  | {
      type: 'mediapipe-status';
      status: 'loading' | 'ready' | 'error';
      delegate?: 'GPU' | 'CPU';
      message?: string;
    }
  | {
      type: 'baseline-status';
      status: 'collecting' | 'ready' | 'reset';
      samples?: number;
    }
  | {
      type: 'tracking';
      faceDetected: boolean;
      landmarkCount: number;
      leftIris: NormalizedPoint | null;
      rightIris: NormalizedPoint | null;
      subjectLeftEye: EyeRelativeFeatures;
      subjectRightEye: EyeRelativeFeatures;
      binocularEye: EyeRelativeFeatures;
      eyeDiagnostic: EyeDiagnosticFeatures;
      headPose: HeadPoseFeatures;
      trackingFps: number;
      timestampMs: number;
      epochTimestampMs?: number;
    }
  | {
      type: 'tracking-error';
      message: string;
    }
  | {
      type: 'boot-error';
      message: string;
    };
