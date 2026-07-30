import { HANZI_WRITER_ENGINE_JS } from './hanziWriterEngine'

/**
 * Static HTML loaded into each glyph's WebView. hanzi-writer draws into real
 * SVG/DOM, which only exists inside the WebView — everything from creating the
 * writer to the quiz/demo lifecycle and the "first stroke" hint overlay for
 * blind quiz mode runs in here. The RN side only sends an `init` (with this
 * glyph's stroke data, looked up on the RN side) and a `start` message, and
 * listens for the handful of events posted back — see HanziStage.tsx.
 */
export const WRITER_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  #guides { position: absolute; inset: 0; pointer-events: none; }
  #target { position: absolute; inset: 0; }
  #hint { position: absolute; inset: 0; pointer-events: none; }

  /*
   * hanzi-writer parses strokeColor as a real colour (it interpolates it during
   * animation), so a paint-server reference can't be passed as an option — it
   * throws "Invalid color". Instead it writes the flat colour into each path's
   * fill *attribute*, and we swap that for the gradient here: a CSS declaration
   * always beats a presentation attribute. Matching on the exact colour keeps
   * this off the grey target glyph underneath. The drop shadow is what gives the
   * finished strokes their raised, 3D look.
   */
  #target path[fill="#22c55e"] {
    fill: url(#strokeGrad) !important;
    filter: drop-shadow(0 2px 2px rgba(6, 78, 59, 0.32));
  }
  #target path[fill="#16a34a"] {
    fill: url(#radicalGrad) !important;
    filter: drop-shadow(0 2px 2px rgba(6, 78, 59, 0.32));
  }
</style>
</head>
<body>
<svg id="guides"></svg>
<div id="target"></div>
<svg id="hint" style="display:none"><path id="hint-path" fill="#22c55e" fill-opacity="0.32" /></svg>
<svg width="0" height="0" style="position:absolute">
  <defs>
    <!-- Top-lit jade gradient: light crest, saturated body, dark underside. -->
    <linearGradient id="strokeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5fe08a" />
      <stop offset="45%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#12833f" />
    </linearGradient>
    <linearGradient id="radicalGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4bd97c" />
      <stop offset="45%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#0d6a32" />
    </linearGradient>
  </defs>
</svg>
<script>${HANZI_WRITER_ENGINE_JS}</script>
<script>
(function () {
  var writer = null;
  var mode = 'demo';
  var hintShown = false;
  // hanzi-writer doesn't expose how far through a quiz you are, so we count
  // correct strokes ourselves to know which one a hint should highlight.
  var strokeIndex = 0;

  function post(payload) {
    var json = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(json);
    } else if (window.parent && window.parent !== window) {
      // Web fallback: this HTML is running inside a plain <iframe> (no react-native-webview
      // bridge exists there), so post straight to the parent window instead.
      window.parent.postMessage(json, '*');
    }
  }

  function showHint(size, padding, firstStrokePath) {
    var svg = document.getElementById('hint');
    var path = document.getElementById('hint-path');
    var transform = HanziWriter.getScalingTransform(size, size, padding).transform;
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    path.setAttribute('transform', transform);
    path.setAttribute('d', firstStrokePath);
    svg.style.display = 'block';
    hintShown = true;
  }

  function hideHint() {
    if (!hintShown) return;
    document.getElementById('hint').style.display = 'none';
    hintShown = false;
  }

  /** Draws the 米字格 practice grid — centre cross plus both diagonals — behind the glyph. */
  function drawGuides(size) {
    var svg = document.getElementById('guides');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    var mid = size / 2;
    var lines = [
      [0, mid, size, mid],
      [mid, 0, mid, size],
      [0, 0, size, size],
      [size, 0, 0, size],
    ];
    svg.innerHTML = lines
      .map(function (l) {
        return (
          '<line x1="' + l[0] + '" y1="' + l[1] + '" x2="' + l[2] + '" y2="' + l[3] +
          '" stroke="#e2e2dd" stroke-width="1" stroke-dasharray="6 6" />'
        );
      })
      .join('');
  }

  function handleMessage(event) {
    var msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    if (msg.type === 'init') {
      mode = msg.mode;
      document.getElementById('target').innerHTML = '';
      hideHint();
      if (msg.showGuides) drawGuides(msg.size);

      writer = HanziWriter.create('target', msg.char, {
        width: msg.size,
        height: msg.size,
        padding: msg.padding,
        charDataLoader: function () {
          return Promise.resolve(msg.strokeData);
        },
        showOutline: msg.showOutline,
        showCharacter: false,
        strokeAnimationSpeed: mode === 'demo' ? 3.5 : 1,
        strokeFadeDuration: 200,
        delayBetweenStrokes: mode === 'demo' ? 60 : 250,
        // These exact values are the hooks the gradient CSS above matches on —
        // change one and you must change the corresponding selector too.
        strokeColor: '#22c55e',
        radicalColor: '#16a34a',
        outlineColor: '#dedede',
        highlightColor: '#ff6b6b',
        drawingColor: '#0f172a',
        drawingWidth: msg.drawingWidth,
        strokeWidth: msg.strokeWidth,
        outlineWidth: msg.strokeWidth,
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        leniency: 1.2,
        onLoadCharDataSuccess: function (data) {
          if (msg.showStartHint && data.strokes[0]) {
            showHint(msg.size, msg.padding, data.strokes[0]);
          }
          post({ type: 'loadSuccess' });
        },
        onLoadCharDataError: function () {
          post({ type: 'loadError' });
        },
      });
    } else if (msg.type === 'hint') {
      // Flashes the stroke the learner is currently expected to draw.
      if (writer) writer.highlightStroke(strokeIndex);
    } else if (msg.type === 'reveal') {
      if (writer) writer.showCharacter();
    } else if (msg.type === 'start') {
      if (!writer) return;
      if (mode === 'demo') {
        writer.animateCharacter({
          onComplete: function () {
            post({ type: 'demoComplete' });
          },
        });
      } else {
        strokeIndex = 0;
        writer.quiz({
          onCorrectStroke: function (strokeData) {
            hideHint();
            strokeIndex += 1;
            post({
              type: 'correctStroke',
              strokesRemaining: strokeData.strokesRemaining,
              totalMistakes: strokeData.totalMistakes,
            });
          },
          onComplete: function (summary) {
            post({ type: 'quizComplete', totalMistakes: summary.totalMistakes });
          },
        });
      }
    }
  }

  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);

  post({ type: 'ready' });
})();
</script>
</body>
</html>`
