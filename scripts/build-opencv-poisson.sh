#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${ROOT_DIR}/.cache/opencv-poisson-build"
OPENCV_REF="${OPENCV_REF:-4.12.0}"
DOCKER_IMAGE="${DOCKER_IMAGE:-emscripten/emsdk:4.0.10}"

mkdir -p "${WORK_DIR}"
mkdir -p "${ROOT_DIR}/public/vendor"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found"
  exit 1
fi

echo "Building custom OpenCV.js (${OPENCV_REF}) with seamlessClone..."

docker run --rm \
  -v "${WORK_DIR}:/work" \
  -v "${ROOT_DIR}:/project" \
  "${DOCKER_IMAGE}" \
  bash -lc "
set -euo pipefail
cd /work
if [ ! -d opencv ]; then
  git clone --branch ${OPENCV_REF} --depth 1 https://github.com/opencv/opencv.git
fi
cd opencv

python3 - <<'PY'
from pathlib import Path
cfg_path = Path('platforms/js/opencv_js.config.py')
text = cfg_path.read_text()
if \"'seamlessClone'\" not in text:
    marker = \"'illuminationChange'\" 
    if marker in text:
        text = text.replace(marker, marker + \",\\n        'seamlessClone'\")
    else:
        raise SystemExit('Could not find photo module marker to inject seamlessClone')
cfg_path.write_text(text)
print('Injected seamlessClone into opencv_js.config.py')
PY

emcmake python3 ./platforms/js/build_js.py build_js --build_wasm
cp build_js/bin/opencv.js /project/public/vendor/opencv-custom.js
"

echo "Done: public/vendor/opencv-custom.js"
