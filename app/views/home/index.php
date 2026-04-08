<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $data['title']; ?></title>
    <link rel="stylesheet" href="<?= BASEURL; ?>/css/style.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <!-- Three.js ESM -->
    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
        }
    }
    </script>
    <script type="module" src="<?= BASEURL; ?>/js/viewer.js"></script>
    <div id="app">
        <!-- Dashboard Header -->
        <header class="glass-header">
            <div class="logo">
                <span class="icon">🌀</span>
                <h1>AeroStream <small>v1.0</small></h1>
            </div>
            <div class="status-badge" id="sim-status">System Ready</div>
        </header>

        <!-- Main Workspace -->
        <main>
            <div id="canvas-container">
                <div id="loading-overlay" class="hidden">
                    <div class="spinner"></div>
                    <p>Simulating Turbulence...</p>
                </div>
                <div id="drop-zone">
                    <div class="drop-content">
                        <span class="upload-icon">📤</span>
                        <h3>Drop GLB Model Here</h3>
                        <p>or click to select file</p>
                        <input type="file" id="file-input" accept=".glb,.gltf" hidden>
                    </div>
                </div>
            </div>

            <!-- Side Dashboard -->
            <aside class="glass-panel">
                <section class="controls">
                    <h2>Simulation Controls</h2>
                    
                    <div class="control-group">
                        <label>Wind Speed</label>
                        <input type="range" id="wind-speed" min="0" max="100" value="50">
                        <span class="value-display">50 m/s</span>
                    </div>

                    <div class="control-group">
                        <label>Wind Direction (Y)</label>
                        <input type="range" id="wind-dir" min="0" max="360" value="0">
                        <span class="value-display">0°</span>
                    </div>

                    <div class="control-group">
                        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="cinematic-mode" checked style="width: auto;">
                            Cinematic Effects (Bloom/Mirror)
                        </label>
                    </div>

                    <div class="control-group">
                        <label>Trail Length</label>
                        <input type="range" id="trail-length" min="1" max="100" value="40">
                        <span class="value-display">40 points</span>
                    </div>

                    <div class="control-group">
                        <label>Turbulence Intensity</label>
                        <input type="range" id="turbulence" min="0" max="100" value="30">
                        <span class="value-display">30%</span>
                    </div>

                    <div class="control-group">
                        <label>Visualization Mode</label>
                        <select id="viz-mode">
                            <option value="streamlines">Neon Streamlines</option>
                            <option value="smoke">Smoke Flow</option>
                            <option value="particles">Simple Particles</option>
                            <option value="pressure">Surface Pressure</option>
                        </select>
                    </div>

                    <button id="reset-sim" class="btn-primary">Reset Simulation</button>
                </section>

                <section class="telemetry">
                    <h2>Live Telemetry</h2>
                    <div class="data-grid">
                        <div class="data-item">
                            <label>Drag Coeff (est.)</label>
                            <span id="drag-coeff">--</span>
                        </div>
                        <div class="data-item">
                            <label>Reynolds Num.</label>
                            <span id="re-num">--</span>
                        </div>
                    </div>
                </section>
            </aside>
        </main>

        <!-- Tooltip / Overlay -->
        <div id="toast-container"></div>
    </div>

    <!-- Removed duplicate script tag -->
</body>
</html>
