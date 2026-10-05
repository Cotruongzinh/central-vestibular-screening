import type { Href } from 'expo-router';

import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

type TestRouteContext = {
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex?: number;
};

export function testSelectHref(patientId: string): Href {
  return {
    pathname: '/tests/select',
    params: { patientId },
  } as Href;
}

export function testInstructionsHref(params: TestRouteContext): Href {
  return {
    pathname: '/tests/instructions',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
    },
  } as Href;
}

export function testCalibrationHref(params: TestRouteContext): Href {
  return {
    pathname: '/tests/calibration',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
    },
  } as unknown as Href;
}

export function testBatteryQuickCalibrationHref(params: TestRouteContext): Href {
  return {
    pathname: '/tests/battery-quick-calibration',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: 'battery',
      batteryIndex: String(params.batteryIndex ?? 0),
    },
  } as unknown as Href;
}

export function testReadyHref(
  params: TestRouteContext & { calibrationId?: string },
): Href {
  return {
    pathname: '/tests/ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId ?? '',
    },
  } as Href;
}

export function testMappingHref(
  params: TestRouteContext & { calibrationId: string },
): Href {
  return {
    pathname: '/tests/mapping',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
    },
  } as unknown as Href;
}

export function testMappingReadyHref(
  params: TestRouteContext & { calibrationId: string; mappingId: string },
): Href {
  return {
    pathname: '/tests/mapping-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
    },
  } as unknown as Href;
}

export function testValidationHref(
  params: TestRouteContext & { calibrationId: string; mappingId: string },
): Href {
  return {
    pathname: '/tests/validation',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
    },
  } as unknown as Href;
}

export function testValidationReadyHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
  },
): Href {
  return {
    pathname: '/tests/validation-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
    },
  } as unknown as Href;
}

export function testRuntimeHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    setupMode?: 'standard' | 'quick';
  },
): Href {
  return {
    pathname: '/tests/runtime',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      setupMode: params.setupMode ?? 'standard',
    },
  } as unknown as Href;
}

export function testRuntimeReadyHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
  },
): Href {
  return {
    pathname: '/tests/runtime-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
    },
  } as unknown as Href;
}

export function testMetricsHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
  },
): Href {
  return {
    pathname: '/tests/metrics',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
    },
  } as unknown as Href;
}

export function testMetricsReadyHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
    metricsId: string;
  },
): Href {
  return {
    pathname: '/tests/metrics-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
      metricsId: params.metricsId,
    },
  } as unknown as Href;
}

export function testSaccadeMetricsHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
  },
): Href {
  return {
    pathname: '/tests/saccade-metrics',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
    },
  } as unknown as Href;
}

export function testSaccadeMetricsReadyHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
    metricsId: string;
  },
): Href {
  return {
    pathname: '/tests/saccade-metrics-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
      metricsId: params.metricsId,
    },
  } as unknown as Href;
}

export function testNystagmusMetricsHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
  },
): Href {
  return {
    pathname: '/tests/nystagmus-metrics',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
    },
  } as unknown as Href;
}

export function testNystagmusMetricsReadyHref(
  params: TestRouteContext & {
    calibrationId: string;
    mappingId: string;
    validationId: string;
    traceId: string;
    metricsId: string;
  },
): Href {
  return {
    pathname: '/tests/nystagmus-metrics-ready',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      calibrationId: params.calibrationId,
      mappingId: params.mappingId,
      validationId: params.validationId,
      traceId: params.traceId,
      metricsId: params.metricsId,
    },
  } as unknown as Href;
}


export function testPersistHref(
  params: TestRouteContext & { traceId: string; metricsId: string },
): Href {
  return {
    pathname: '/tests/session-save',
    params: {
      patientId: params.patientId,
      testId: params.testId,
      mode: params.mode,
      batteryIndex: String(params.batteryIndex ?? 0),
      traceId: params.traceId,
      metricsId: params.metricsId,
    },
  } as unknown as Href;
}

export function testStoredSessionHref(
  patientId: string,
  sessionId: string,
): Href {
  return {
    pathname: '/tests/session-detail',
    params: { patientId, sessionId },
  } as unknown as Href;
}


export function testReportHref(
  patientId: string,
  sessionId: string,
): Href {
  return {
    pathname: '/tests/report',
    params: { patientId, sessionId },
  } as unknown as Href;
}

export function testTrendsHref(
  patientId: string,
  testId?: ClinicalTestId,
): Href {
  return {
    pathname: '/tests/trends',
    params: { patientId, testId: testId ?? '' },
  } as unknown as Href;
}



export function testReplayHref(
  patientId: string,
  sessionId: string,
): Href {
  return {
    pathname: '/tests/replay',
    params: { patientId, sessionId },
  } as unknown as Href;
}

export function testBatteryProgressHref(
  patientId: string,
  batteryRunId: string,
): Href {
  return {
    pathname: '/tests/battery-progress',
    params: { patientId, batteryRunId },
  } as unknown as Href;
}

export function testBatterySummaryHref(
  patientId: string,
  batteryRunId: string,
): Href {
  return {
    pathname: '/tests/battery-summary',
    params: { patientId, batteryRunId },
  } as unknown as Href;
}
