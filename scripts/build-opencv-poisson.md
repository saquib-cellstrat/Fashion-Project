# Build OpenCV.js with `seamlessClone` (Pure Poisson)

The default public OpenCV.js builds usually do not expose `cv.seamlessClone`.
For true client-side Poisson blending, build a custom `opencv.js` that exports photo bindings, then place it at:

- `public/vendor/opencv-custom.js`

Your app already loads this path via `ensureOpenCvLoaded()`.

## Option A: One-command local build (Docker)

From repo root:

```bash
npm run build:opencv:poisson
```

This script:

- uses `emscripten/emsdk:4.0.10`
- clones OpenCV `4.12.0`
- patches JS config to export `seamlessClone`
- builds `opencv.js`
- writes output to `public/vendor/opencv-custom.js`

## Option B: Build on a machine with Emscripten

### 1) Clone OpenCV

```bash
git clone --depth=1 https://github.com/opencv/opencv.git
cd opencv
```

### 2) Patch JS config to export `seamlessClone`

Edit `platforms/js/opencv_js.config.py` and ensure `photo` includes `seamlessClone`.
If `photo` list does not exist, add one.

### 3) Build JS bundle

```bash
python3 platforms/js/build_js.py build_js --build_wasm --simd
```

Result is typically:

- `build_js/bin/opencv.js`

### 4) Copy to this project

```bash
cp build_js/bin/opencv.js /path/to/fashion/public/vendor/opencv-custom.js
```

### 5) Verify in browser

Open DevTools console:

```js
typeof cv?.seamlessClone
```

Expected: `"function"`

## Option C: Build via GitHub Actions artifact

Run workflow:

- `.github/workflows/build-opencv-poisson.yml`

Download artifact:

- `opencv-custom-js` (contains `public/vendor/opencv-custom.js`)

Then place the file in your repo at:

- `public/vendor/opencv-custom.js`

## Runtime requirement

Poisson utility in this repo requires:

- `cv.Mat` function
- `cv.seamlessClone` function

If `seamlessClone` is missing, UI shows:

- `Poisson Blend: Unsupported OpenCV build`
