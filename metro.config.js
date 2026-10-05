const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const localTrackerAssetExts = [
  'mpbundle',
  'mpjs',
  'mpwasm',
  'mpmodel',
];

for (const ext of localTrackerAssetExts) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

const trackerRoot = path.join(
  __dirname,
  'assets',
  'tracker',
  'mediapipe'
);

const trackerFiles = {
  '/__tracker/vision_bundle.mjs': {
    file: 'vision_bundle.mpbundle',
    type: 'text/javascript; charset=utf-8',
  },
  '/__tracker/vision_wasm_internal.js': {
    file: 'vision_wasm_internal.mpjs',
    type: 'text/javascript; charset=utf-8',
  },
  '/__tracker/vision_wasm_internal.wasm': {
    file: 'vision_wasm_internal.mpwasm',
    type: 'application/wasm',
  },
  '/__tracker/vision_wasm_nosimd_internal.js': {
    file: 'vision_wasm_nosimd_internal.mpjs',
    type: 'text/javascript; charset=utf-8',
  },
  '/__tracker/vision_wasm_nosimd_internal.wasm': {
    file: 'vision_wasm_nosimd_internal.mpwasm',
    type: 'application/wasm',
  },
  '/__tracker/face_landmarker.task': {
    file: 'face_landmarker.mpmodel',
    type: 'application/octet-stream',
  },
};

config.server = config.server || {};

const previousEnhancer =
  config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (
  metroMiddleware,
  metroServer
) => {
  const baseMiddleware = previousEnhancer
    ? previousEnhancer(
        metroMiddleware,
        metroServer
      )
    : metroMiddleware;

  return (req, res, next) => {
    const pathname = (req.url || '').split('?')[0];

    const asset = trackerFiles[pathname];

    if (!asset) {
      return baseMiddleware(req, res, next);
    }

    res.setHeader(
      'Access-Control-Allow-Origin',
      '*'
    );

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, OPTIONS'
    );

    res.setHeader(
      'Access-Control-Allow-Headers',
      '*'
    );

    res.setHeader(
      'Cross-Origin-Resource-Policy',
      'cross-origin'
    );

    res.setHeader(
      'Cache-Control',
      'no-store'
    );

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const filePath = path.join(
      trackerRoot,
      asset.file
    );

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.setHeader(
        'Content-Type',
        'text/plain; charset=utf-8'
      );
      res.end(
        `Tracker asset not found: ${asset.file}`
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader(
      'Content-Type',
      asset.type
    );

    fs.createReadStream(filePath)
      .on('error', error => {
        console.error(
          '[tracker asset server]',
          error
        );

        if (!res.headersSent) {
          res.statusCode = 500;
        }

        res.end();
      })
      .pipe(res);
  };
};

module.exports = config;
