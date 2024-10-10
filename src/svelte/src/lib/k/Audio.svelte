<script>
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
    import init, { Visualizer } from '$lib/pkg/audio/bg/audio.js';
  
    let canvas;
    let visualizer;
    let audioContext;
    let analyser;
    let rafId;
    let isPlaying = false;
    let staticAudioPath = "/Mortals.mp3"; // Path audio dari folder `static`
  
    $: if (canvas) {
      const updateCanvasSize = () => {
        canvas.width = canvas.offsetWidth * devicePixelRatio;
        canvas.height = canvas.offsetHeight * devicePixelRatio;
        if (visualizer) {
          visualizer = new Visualizer(canvas);
        }
      };
      updateCanvasSize();
    }
  
    async function initVisualizer() {
      if (!browser || !canvas) return;
  
      try {
        await init();
  
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
  
        visualizer = new Visualizer(canvas);
  
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
        function draw() {
          analyser.getByteFrequencyData(dataArray);
          visualizer.draw(dataArray);
          rafId = requestAnimationFrame(draw);
        }
  
        draw();
      } catch (error) {
        console.error('Failed to initialize visualizer:', error);
      }
    }
  
    async function handleAudio(arrayBuffer) {
      if (!audioContext) await initVisualizer();
      if (!audioContext || !analyser) return;
  
      try {
        if (isPlaying) {
          audioContext.close();
          await initVisualizer();
        }
  
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
  
        // Add some audio processing
        const gainNode = audioContext.createGain();
        const biquadFilter = audioContext.createBiquadFilter();
        biquadFilter.type = "lowshelf";
        biquadFilter.frequency.value = 1000;
        biquadFilter.gain.value = 25;
  
        source.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioContext.destination);
  
        source.start(0);
        isPlaying = true;
  
        source.onended = () => {
          isPlaying = false;
        };
      } catch (error) {
        console.error('Failed to process audio:', error);
      }
    }
  
    async function loadStaticAudio() {
      try {
        const response = await fetch(staticAudioPath);
        const arrayBuffer = await response.arrayBuffer();
        handleAudio(arrayBuffer);
      } catch (error) {
        console.error('Failed to load static audio file:', error);
      }
    }
  
    onMount(() => {
      const resizeObserver = new ResizeObserver(() => {
        if (canvas) {
          canvas.width = canvas.offsetWidth * devicePixelRatio;
          canvas.height = canvas.offsetHeight * devicePixelRatio;
          if (visualizer) {
            visualizer = new Visualizer(canvas);
          }
        }
      });
  
      resizeObserver.observe(canvas);
  
      // Langsung memanggil loadStaticAudio() untuk memulai visualisasi
      loadStaticAudio();
  
      return () => {
        resizeObserver.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        if (audioContext) audioContext.close();
      };
    });
  </script>
  
  <div class="visualizer-container">
    <canvas bind:this={canvas}></canvas>
  </div>
  
  <style>
    .visualizer-container {
      width: 100%;
      aspect-ratio: 16/9;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
  
    canvas {
      width: 100%;
      height: 100%;
      background: #000;
      border-radius: 8px;
    }
  </style>
  