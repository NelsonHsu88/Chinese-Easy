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
  #target { position: absolute; inset: 0; }
  #hint { position: absolute; inset: 0; pointer-events: none; }
</style>
</head>
<body>
<div id="target"></div>
<svg id="hint" style="display:none"><path id="hint-path" fill="#1fb96d" fill-opacity="0.32" /></svg>
<script>${HANZI_WRITER_ENGINE_JS}</script>
<script>
(function () {
  var writer = null;
  var mode = 'demo';
  var hintShown = false;

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
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
        strokeColor: '#1fb96d',
        radicalColor: '#149457',
        outlineColor: '#cbd5e1',
        highlightColor: '#f6432c',
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
    } else if (msg.type === 'start') {
      if (!writer) return;
      if (mode === 'demo') {
        writer.animateCharacter({
          onComplete: function () {
            post({ type: 'demoComplete' });
          },
        });
      } else {
        writer.quiz({
          onCorrectStroke: function (strokeData) {
            hideHint();
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
