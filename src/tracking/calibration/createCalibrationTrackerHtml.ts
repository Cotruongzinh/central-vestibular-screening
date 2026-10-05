import { Asset } from 'expo-asset';

const originProbeAsset = Asset.fromModule(
  require('../../../assets/tracker/mediapipe/vision_bundle.mpbundle')
);

export type TrackerAssetTransportDescriptor = {
  source: 'bundled-module';
  transport: 'expo-go-metro' | 'packaged-asset' | 'unknown';
  assetUriScheme: string;
  assetUriPresent: boolean;
  externalCdnRequired: false;
};

export function getTrackerAssetTransportDescriptor(): TrackerAssetTransportDescriptor {
  const uri = String(originProbeAsset.uri ?? '');
  const schemeMatch = uri.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  const assetUriScheme = schemeMatch?.[1]?.toLowerCase() ?? 'unknown';

  return {
    source: 'bundled-module',
    transport:
      assetUriScheme === 'http' || assetUriScheme === 'https'
        ? 'expo-go-metro'
        : uri
          ? 'packaged-asset'
          : 'unknown',
    assetUriScheme,
    assetUriPresent: uri.length > 0,
    externalCdnRequired: false,
  };
}

function getMetroOrigin() {
  const match = originProbeAsset.uri.match(
    /^(https?:\/\/[^/]+)/
  );

  if (!match) {
    throw new Error(
      `Không xác định được Metro origin từ URI: ${originProbeAsset.uri}`
    );
  }

  return match[1];
}

function escapeForInlineScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function createCalibrationTrackerHtml() {
  const metroOrigin = getMetroOrigin();

  const config = {
    bundleUrl: `${metroOrigin}/__tracker/vision_bundle.mjs`,
    wasmLoaderUrl: `${metroOrigin}/__tracker/vision_wasm_internal.js`,
    wasmBinaryUrl: `${metroOrigin}/__tracker/vision_wasm_internal.wasm`,
    wasmNoSimdLoaderUrl: `${metroOrigin}/__tracker/vision_wasm_nosimd_internal.js`,
    wasmNoSimdBinaryUrl: `${metroOrigin}/__tracker/vision_wasm_nosimd_internal.mpwasm`,
    modelUrl: `${metroOrigin}/__tracker/face_landmarker.task`,
  };

  // Keep the correct no-SIMD path even if an older Metro cache still exists.
  config.wasmNoSimdBinaryUrl =
    `${metroOrigin}/__tracker/vision_wasm_nosimd_internal.wasm`;

  return `<!doctype html>
<html>
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #0b1720;
    }

    #wrap {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0b1720;
    }

    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    #badge {
      position: absolute;
      z-index: 3;
      left: 8px;
      top: 8px;
      padding: 6px 8px;
      border-radius: 7px;
      background: rgba(0,0,0,.55);
      color: white;
      font: 11px -apple-system, BlinkMacSystemFont, sans-serif;
    }
  </style>
</head>

<body>
  <div id="wrap">
    <video id="video" autoplay muted playsinline></video>
    <div id="badge">Initializing...</div>
  </div>

  <script>
    const CONFIG = ${escapeForInlineScript(config)};

    const video = document.getElementById('video');
    const badge = document.getElementById('badge');

    let stream = null;
    let faceLandmarker = null;
    let stopped = false;

    let processedFrames = 0;
    let fpsWindowStart = performance.now();
    let trackingFps = 0;

    let headBaseline = null;
    let headBaselineSamples = [];
    const HEAD_BASELINE_TARGET = 30;

    let lastPostMs = 0;
    const POST_INTERVAL_MS = 66;

    function send(payload) {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify(payload)
        );
      } catch (_) {}
    }

    function describeError(error) {
      if (!error) return 'Unknown error';

      return (
        (error.name || 'Error') +
        ': ' +
        (error.message || String(error))
      );
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function radToDeg(value) {
      return value * 180 / Math.PI;
    }

    function mean(values) {
      const valid = values.filter(
        value =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(value)
      );

      if (!valid.length) return null;

      return (
        valid.reduce(
          (sum, value) => sum + value,
          0
        ) / valid.length
      );
    }

    function averagePoints(landmarks, indices) {
      if (!landmarks) return null;

      let x = 0;
      let y = 0;
      let z = 0;

      for (const index of indices) {
        const point = landmarks[index];

        if (!point) return null;

        x += point.x;
        y += point.y;
        z += point.z || 0;
      }

      const n = indices.length;

      return {
        x: x / n,
        y: y / n,
        z: z / n,
      };
    }

    function midpoint(a, b) {
      return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: ((a.z || 0) + (b.z || 0)) / 2,
      };
    }

    function distance2d(a, b) {
      if (!a || !b) return 0;

      return Math.hypot(
        b.x - a.x,
        b.y - a.y
      );
    }

    function sub2d(a, b) {
      return {
        x: a.x - b.x,
        y: a.y - b.y,
      };
    }

    function dot2d(a, b) {
      return a.x * b.x + a.y * b.y;
    }

    function irisAverage(landmarks, indices) {
      const point = averagePoints(
        landmarks,
        indices
      );

      if (!point) return null;

      return {
        x: point.x,
        y: point.y,
      };
    }

    function normalizeEye(
      landmarks,
      iris,
      imageLeftCornerIndex,
      imageRightCornerIndex
    ) {
      if (!landmarks || !iris) {
        return {
          horizontal: null,
          vertical: null,
          aperture: null,
        };
      }

      const left = landmarks[imageLeftCornerIndex];
      const right = landmarks[imageRightCornerIndex];

      if (!left || !right) {
        return {
          horizontal: null,
          vertical: null,
          aperture: null,
        };
      }

      const eyeVector = sub2d(right, left);

      const width = Math.hypot(
        eyeVector.x,
        eyeVector.y
      );

      if (width < 0.001) {
        return {
          horizontal: null,
          vertical: null,
          aperture: null,
        };
      }

      const xAxis = {
        x: eyeVector.x / width,
        y: eyeVector.y / width,
      };

      let yAxis = {
        x: -xAxis.y,
        y: xAxis.x,
      };

      if (yAxis.y < 0) {
        yAxis = {
          x: -yAxis.x,
          y: -yAxis.y,
        };
      }

      const eyeCenter = midpoint(left, right);

      const irisFromLeft = {
        x: iris.x - left.x,
        y: iris.y - left.y,
      };

      const irisFromCenter = {
        x: iris.x - eyeCenter.x,
        y: iris.y - eyeCenter.y,
      };

      const horizontal =
        dot2d(irisFromLeft, xAxis) / width;

      const vertical =
        dot2d(irisFromCenter, yAxis) / width;

      return {
        horizontal:
          Number.isFinite(horizontal)
            ? horizontal
            : null,
        vertical:
          Number.isFinite(vertical)
            ? vertical
            : null,
        aperture: null,
      };
    }

    function binocularAverage(leftEye, rightEye) {
      return {
        horizontal: mean([
          leftEye.horizontal,
          rightEye.horizontal,
        ]),
        vertical: mean([
          leftEye.vertical,
          rightEye.vertical,
        ]),
        aperture: null,
      };
    }

    function matrixEulerDegrees(matrix) {
      if (
        !matrix ||
        !matrix.data ||
        matrix.data.length < 16
      ) {
        return null;
      }

      const d = matrix.data;

      let r00 = d[0];
      let r01 = d[4];
      let r02 = d[8];

      let r10 = d[1];
      let r11 = d[5];
      let r12 = d[9];

      let r20 = d[2];
      let r21 = d[6];
      let r22 = d[10];

      const sx = Math.hypot(r00, r10, r20);
      const sy = Math.hypot(r01, r11, r21);
      const sz = Math.hypot(r02, r12, r22);

      if (sx < 1e-6 || sy < 1e-6 || sz < 1e-6) {
        return null;
      }

      r00 /= sx; r10 /= sx; r20 /= sx;
      r01 /= sy; r11 /= sy; r21 /= sy;
      r02 /= sz; r12 /= sz; r22 /= sz;

      const yaw = Math.asin(
        clamp(-r20, -1, 1)
      );

      const cosYaw = Math.cos(yaw);

      let pitch;
      let roll;

      if (Math.abs(cosYaw) > 1e-5) {
        pitch = Math.atan2(r21, r22);
        roll = Math.atan2(r10, r00);
      } else {
        pitch = Math.atan2(-r12, r11);
        roll = 0;
      }

      return {
        yawDeg: radToDeg(yaw),
        pitchDeg: radToDeg(pitch),
        rollDeg: radToDeg(roll),
      };
    }

    function faceCenterAndScale(
      landmarks,
      leftIris,
      rightIris
    ) {
      const forehead = landmarks[10];
      const chin = landmarks[152];
      const cheekA = landmarks[234];
      const cheekB = landmarks[454];

      if (!forehead || !chin || !cheekA || !cheekB) {
        return null;
      }

      const horizontalCenter = midpoint(
        cheekA,
        cheekB
      );

      const verticalCenter = midpoint(
        forehead,
        chin
      );

      const center = {
        x:
          (
            horizontalCenter.x +
            verticalCenter.x
          ) / 2,
        y:
          (
            horizontalCenter.y +
            verticalCenter.y
          ) / 2,
      };

      let scale =
        leftIris && rightIris
          ? distance2d(leftIris, rightIris)
          : distance2d(
              landmarks[33],
              landmarks[263]
            );

      if (scale < 0.01) {
        scale = 0.01;
      }

      return {
        center,
        scale,
      };
    }

    function resetHeadBaseline() {
      headBaseline = null;
      headBaselineSamples = [];

      send({
        type: 'baseline-status',
        status: 'reset',
        samples: 0,
      });

      badge.textContent =
        'Head baseline: collecting';
    }

    window.__resetHeadBaseline =
      resetHeadBaseline;

    function updateHeadBaseline(
      angles,
      geometry
    ) {
      if (
        headBaseline ||
        !angles ||
        !geometry
      ) {
        return;
      }

      headBaselineSamples.push({
        yaw: angles.yawDeg,
        pitch: angles.pitchDeg,
        roll: angles.rollDeg,
        centerX: geometry.center.x,
        centerY: geometry.center.y,
        scale: geometry.scale,
      });

      send({
        type: 'baseline-status',
        status: 'collecting',
        samples:
          headBaselineSamples.length,
      });

      badge.textContent =
        'Head baseline: ' +
        headBaselineSamples.length +
        '/' +
        HEAD_BASELINE_TARGET;

      if (
        headBaselineSamples.length >=
        HEAD_BASELINE_TARGET
      ) {
        headBaseline = {
          yaw: mean(
            headBaselineSamples.map(
              sample => sample.yaw
            )
          ),
          pitch: mean(
            headBaselineSamples.map(
              sample => sample.pitch
            )
          ),
          roll: mean(
            headBaselineSamples.map(
              sample => sample.roll
            )
          ),
          centerX: mean(
            headBaselineSamples.map(
              sample => sample.centerX
            )
          ),
          centerY: mean(
            headBaselineSamples.map(
              sample => sample.centerY
            )
          ),
          scale: mean(
            headBaselineSamples.map(
              sample => sample.scale
            )
          ),
        };

        send({
          type: 'baseline-status',
          status: 'ready',
          samples:
            headBaselineSamples.length,
        });

        badge.textContent =
          'Head baseline: ready';
      }
    }

    function buildHeadPose(
      result,
      landmarks,
      leftIris,
      rightIris
    ) {
      const matrix =
        result.facialTransformationMatrixes &&
        result.facialTransformationMatrixes.length > 0
          ? result.facialTransformationMatrixes[0]
          : null;

      const angles =
        matrixEulerDegrees(matrix);

      const geometry =
        faceCenterAndScale(
          landmarks,
          leftIris,
          rightIris
        );

      updateHeadBaseline(
        angles,
        geometry
      );

      if (!angles || !geometry) {
        return {
          matrixAvailable: !!matrix,
          yawDeg: angles?.yawDeg ?? null,
          pitchDeg: angles?.pitchDeg ?? null,
          rollDeg: angles?.rollDeg ?? null,
          yawDeltaDeg: null,
          pitchDeltaDeg: null,
          rollDeltaDeg: null,
          shiftX: null,
          shiftY: null,
          baselineReady: false,
          movementLabel: 'NO BASELINE',
        };
      }

      if (!headBaseline) {
        return {
          matrixAvailable: true,
          yawDeg: angles.yawDeg,
          pitchDeg: angles.pitchDeg,
          rollDeg: angles.rollDeg,
          yawDeltaDeg: null,
          pitchDeltaDeg: null,
          rollDeltaDeg: null,
          shiftX: null,
          shiftY: null,
          baselineReady: false,
          movementLabel: 'COLLECTING',
        };
      }

      const scale =
        headBaseline.scale > 0.01
          ? headBaseline.scale
          : geometry.scale;

      return {
        matrixAvailable: true,
        yawDeg: angles.yawDeg,
        pitchDeg: angles.pitchDeg,
        rollDeg: angles.rollDeg,
        yawDeltaDeg:
          angles.yawDeg -
          headBaseline.yaw,
        pitchDeltaDeg:
          angles.pitchDeg -
          headBaseline.pitch,
        rollDeltaDeg:
          angles.rollDeg -
          headBaseline.roll,
        shiftX:
          (
            geometry.center.x -
            headBaseline.centerX
          ) / scale,
        shiftY:
          (
            geometry.center.y -
            headBaseline.centerY
          ) / scale,
        baselineReady: true,
        movementLabel: 'READY',
      };
    }

    function updateTrackingFps() {
      processedFrames += 1;

      const now = performance.now();
      const elapsed =
        now - fpsWindowStart;

      if (elapsed >= 1000) {
        trackingFps =
          processedFrames *
          1000 /
          elapsed;

        processedFrames = 0;
        fpsWindowStart = now;
      }
    }

    async function assertLocalEndpoint(
      url,
      stage
    ) {
      send({
        type: 'asset-status',
        status: 'loading',
        stage,
      });

      const response =
        await fetch(
          url,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

      if (!response.ok) {
        throw new Error(
          stage +
          ' HTTP ' +
          response.status +
          ': ' +
          url
        );
      }

      return response;
    }

    async function startCamera() {
      send({
        type: 'environment',
        secureContext:
          window.isSecureContext === true,
        hasMediaDevices:
          !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia
          ),
        bundleUri: CONFIG.bundleUrl,
        wasmUri: CONFIG.wasmBinaryUrl,
        modelUri: CONFIG.modelUrl,
      });

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          'getUserMedia unavailable.'
        );
      }

      send({
        type: 'camera-status',
        status: 'requesting',
      });

      stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: false,
            video: {
              facingMode: 'user',
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
              frameRate: {
                ideal: 60,
                min: 24,
              },
            },
          });

      video.srcObject = stream;

      await video.play();

      const track =
        stream.getVideoTracks()[0];

      const settings =
        track && track.getSettings
          ? track.getSettings()
          : {};

      send({
        type: 'camera-status',
        status: 'ready',
        width:
          settings.width ||
          video.videoWidth ||
          null,
        height:
          settings.height ||
          video.videoHeight ||
          null,
        frameRate:
          typeof settings.frameRate === 'number'
            ? settings.frameRate
            : null,
      });
    }

    function getFileset(noSimd) {
      return noSimd
        ? {
            wasmLoaderPath:
              CONFIG.wasmNoSimdLoaderUrl,
            wasmBinaryPath:
              CONFIG.wasmNoSimdBinaryUrl,
          }
        : {
            wasmLoaderPath:
              CONFIG.wasmLoaderUrl,
            wasmBinaryPath:
              CONFIG.wasmBinaryUrl,
          };
    }

    async function loadMediaPipe() {
      await assertLocalEndpoint(
        CONFIG.modelUrl,
        'model'
      );

      await assertLocalEndpoint(
        CONFIG.wasmBinaryUrl,
        'wasm'
      );

      send({
        type: 'asset-status',
        status: 'loading',
        stage: 'module',
      });

      const module =
        await import(CONFIG.bundleUrl);

      const FaceLandmarker =
        module.FaceLandmarker;

      if (!FaceLandmarker) {
        throw new Error(
          'FaceLandmarker export missing.'
        );
      }

      send({
        type: 'mediapipe-status',
        status: 'loading',
      });

      let lastError = null;

      for (const noSimd of [false, true]) {
        const fileset =
          getFileset(noSimd);

        const commonOptions = {
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: true,
        };

        try {
          faceLandmarker =
            await FaceLandmarker
              .createFromOptions(
                fileset,
                {
                  ...commonOptions,
                  baseOptions: {
                    modelAssetPath:
                      CONFIG.modelUrl,
                    delegate: 'GPU',
                  },
                }
              );

          send({
            type: 'asset-status',
            status: 'ready',
            stage:
              noSimd
                ? 'nosimd'
                : 'simd',
          });

          send({
            type: 'mediapipe-status',
            status: 'ready',
            delegate: 'GPU',
          });

          badge.textContent =
            'Tracker ready';

          return;
        } catch (gpuError) {
          lastError = gpuError;

          try {
            faceLandmarker =
              await FaceLandmarker
                .createFromOptions(
                  fileset,
                  {
                    ...commonOptions,
                    baseOptions: {
                      modelAssetPath:
                        CONFIG.modelUrl,
                    },
                  }
                );

            send({
              type: 'asset-status',
              status: 'ready',
              stage:
                noSimd
                  ? 'nosimd'
                  : 'simd',
            });

            send({
              type: 'mediapipe-status',
              status: 'ready',
              delegate: 'CPU',
            });

            badge.textContent =
              'Tracker ready';

            return;
          } catch (cpuError) {
            lastError = cpuError;
          }
        }
      }

      throw (
        lastError ||
        new Error(
          'MediaPipe initialization failed.'
        )
      );
    }

    function postTracking(timestampMs, payload) {
      if (
        timestampMs -
        lastPostMs <
        POST_INTERVAL_MS
      ) {
        return;
      }

      lastPostMs =
        timestampMs;

      send({
        type: 'tracking',
        timestampMs,
        trackingFps:
          Number(
            trackingFps.toFixed(1)
          ),
        ...payload,
      });
    }

    function scheduleNextFrame() {
      if (stopped) return;

      if (
        typeof video.requestVideoFrameCallback ===
        'function'
      ) {
        video.requestVideoFrameCallback(
          now => processFrame(now)
        );
      } else {
        requestAnimationFrame(
          now => processFrame(now)
        );
      }
    }

    function processFrame(timestampMs) {
      if (
        stopped ||
        !faceLandmarker
      ) {
        return;
      }

      try {
        if (video.readyState >= 2) {
          const result =
            faceLandmarker
              .detectForVideo(
                video,
                timestampMs
              );

          updateTrackingFps();

          const faces =
            result.faceLandmarks || [];

          const face =
            faces.length > 0
              ? faces[0]
              : null;

          if (face) {
            const rightIris =
              irisAverage(
                face,
                [469, 470, 471, 472]
              );

            const leftIris =
              irisAverage(
                face,
                [474, 475, 476, 477]
              );

            const subjectLeftEye =
              normalizeEye(
                face,
                leftIris,
                362,
                263
              );

            const subjectRightEye =
              normalizeEye(
                face,
                rightIris,
                33,
                133
              );

            const binocularEye =
              binocularAverage(
                subjectLeftEye,
                subjectRightEye
              );

            const headPose =
              buildHeadPose(
                result,
                face,
                leftIris,
                rightIris
              );

            postTracking(
              timestampMs,
              {
                faceDetected: true,
                landmarkCount:
                  face.length,
                leftIris,
                rightIris,
                subjectLeftEye,
                subjectRightEye,
                binocularEye,
                eyeDiagnostic: {
                  baselineReady: false,
                  horizontalDelta: null,
                  verticalDelta: null,
                  baselineSigmaH: null,
                  baselineSigmaV: null,
                  horizontalThreshold: null,
                  verticalThreshold: null,
                  horizontalRangeMin: null,
                  horizontalRangeMax: null,
                  verticalRangeMin: null,
                  verticalRangeMax: null,
                  state: 'CALIBRATION',
                },
                headPose,
              }
            );
          } else {
            postTracking(
              timestampMs,
              {
                faceDetected: false,
                landmarkCount: 0,
                leftIris: null,
                rightIris: null,
                subjectLeftEye: {
                  horizontal: null,
                  vertical: null,
                  aperture: null,
                },
                subjectRightEye: {
                  horizontal: null,
                  vertical: null,
                  aperture: null,
                },
                binocularEye: {
                  horizontal: null,
                  vertical: null,
                  aperture: null,
                },
                eyeDiagnostic: {
                  baselineReady: false,
                  horizontalDelta: null,
                  verticalDelta: null,
                  baselineSigmaH: null,
                  baselineSigmaV: null,
                  horizontalThreshold: null,
                  verticalThreshold: null,
                  horizontalRangeMin: null,
                  horizontalRangeMax: null,
                  verticalRangeMin: null,
                  verticalRangeMax: null,
                  state: 'NO FACE',
                },
                headPose: {
                  matrixAvailable: false,
                  yawDeg: null,
                  pitchDeg: null,
                  rollDeg: null,
                  yawDeltaDeg: null,
                  pitchDeltaDeg: null,
                  rollDeltaDeg: null,
                  shiftX: null,
                  shiftY: null,
                  baselineReady:
                    !!headBaseline,
                  movementLabel:
                    'NO FACE',
                },
              }
            );
          }
        }
      } catch (error) {
        send({
          type: 'tracking-error',
          message:
            describeError(error),
        });
      }

      scheduleNextFrame();
    }

    async function boot() {
      try {
        await startCamera();
        await loadMediaPipe();
        scheduleNextFrame();
      } catch (error) {
        const message =
          describeError(error);

        send({
          type: 'asset-status',
          status: 'error',
          message,
        });

        send({
          type: 'boot-error',
          message,
        });
      }
    }

    boot();
  </script>
</body>
</html>`;
}
