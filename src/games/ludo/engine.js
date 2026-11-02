// MAF_LUDO_STEP_2 — Adaptation du code fourni par l'utilisateur ; Three.js est déjà une dépendance de MAF GAME.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountLudoGame(document, window, options = {}) {
  if (!document || !window || !document.getElementById('gameContainer')) throw new Error('Document Ludo incomplet');

  // MAF_LUDO_STEP_3 : gestion des temporisations et animations pour fermer/recommencer proprement.
  let disposed = false;
  const pendingTimers = new Set();
  const pendingFrames = new Set();
  function scheduleTimeout(callback, delay) {
    if (disposed) return null;
    const timer = window.setTimeout(() => {
      pendingTimers.delete(timer);
      if (!disposed) callback();
    }, delay);
    pendingTimers.add(timer);
    return timer;
  }
  function cancelTimeout(timer) {
    window.clearTimeout(timer);
    pendingTimers.delete(timer);
  }
  function scheduleFrame(callback) {
    if (disposed) return null;
    const frame = window.requestAnimationFrame((...args) => {
      pendingFrames.delete(frame);
      if (!disposed) callback(...args);
    });
    pendingFrames.add(frame);
    return frame;
  }
  function cancelFrame(frame) {
    window.cancelAnimationFrame(frame);
    pendingFrames.delete(frame);
  }





        // ============ GAME CONSTANTS ============
        const COLORS = {
            red: 0xea4330, redDark: 0xa32011, redLight: 0xd22915,
            green: 0x34a853, greenDark: 0x1c5a2d, greenLight: 0x288140,
            blue: 0x4285f4, blueDark: 0x0b51c5, blueLight: 0x1266f1,
            yellow: 0xfbbc05, yellowDark: 0x987102, yellowLight: 0xca9703,
            white: 0xffffff, gray: 0xaaaaaa, border: 0x666666
        };
        const BOARD_SIZE = 15, CELL_SIZE = 40, BOARD_TOTAL = 600, BASE_SIZE = 240;
        const BOARD_THICKNESS = 8, TOKEN_RADIUS = 14, TOKEN_HEIGHT = 8;

        // Player paths - movement around the board
        const PLAYER_PATHS = {
            red: [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7]],
            green: [[8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0]],
            yellow: [[13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7]],
            blue: [[6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14]]
        };
        const FINAL_PATHS = {
            red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
            green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
            yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
            blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]]
        };
        const HOME_POSITIONS = {
            red: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
            green: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
            yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
            blue: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]]
        };
        // Positions within each player's home triangle at center
        // Red's triangle: between x=6 and x=7, centered on y=7
        // Green's triangle: between y=6 and y=7, centered on x=7
        // Yellow's triangle: between x=7 and x=8, centered on y=7
        // Blue's triangle: between y=7 and y=8, centered on x=7
        const HOME_TRIANGLE_POSITIONS = {
            red: [[5.8, 6.5], [5.8, 7.5], [6.2, 6.75], [6.2, 7.25]],
            green: [[6.5, 5.8], [7.5, 5.8], [6.75, 6.2], [7.25, 6.2]],
            yellow: [[8.2, 6.5], [8.2, 7.5], [7.8, 6.75], [7.8, 7.25]],
            blue: [[6.5, 8.2], [7.5, 8.2], [6.75, 7.8], [7.25, 7.8]]
        };
        const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47]; // Safe spots on main track
        const START_CELLS = { red: 0, green: 13, yellow: 26, blue: 39 };

        // ============ DOM ELEMENTS ============
        const menuOverlay = document.getElementById('menuOverlay');
        const colorSelection = document.getElementById('colorSelection');
        const colorPlayerLabel = document.getElementById('colorPlayerLabel');
        const colorGrid = document.getElementById('colorGrid');
        const confirmColors = document.getElementById('confirmColors');
        const gameContainer = document.getElementById('gameContainer');
        const boardContainer = document.getElementById('board-container');
        const currentPlayerEl = document.getElementById('currentPlayer');
        const messageBox = document.getElementById('messageBox');
        const diceEl = document.getElementById('dice');
        const rollBtn = document.getElementById('rollBtn');
        const scoreGrid = document.getElementById('scoreGrid');
        const rulesModal = document.getElementById('rulesModal');
        const winModal = document.getElementById('winModal');
        const winPlayer = document.getElementById('winPlayer');

        // ============ GAME STATE ============
        let gameMode = null, playerCount = 0, players = [], currentPlayerIndex = 0;
        let tokens = {}, tokenMeshes = {}, lastRoll = 0, isRolling = false, gameActive = false;
        let selectedColors = [], colorSelectingPlayer = 0, aiPlayers = [];
        const isOnline = options.mode === 'online';
        if (isOnline) document.body.classList.add('maf-ludo-online-mode'); // MAF_LUDO_UI_FIX_V2
        let networkState = null;
        let scene, camera, renderer, controls, boardGroup, raycaster, mouse;

        // ============ MENU LOGIC ============
        document.querySelectorAll('.mode-card').forEach(card => {
            card.querySelectorAll('.player-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    card.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    card.querySelector('.start-btn').classList.add('active');
                });
            });
            card.querySelector('.start-btn').addEventListener('click', e => {
                e.stopPropagation();
                const mode = e.target.closest('.start-btn').dataset.mode;
                const selectedBtn = card.querySelector('.player-btn.selected');
                if (!selectedBtn) return;
                gameMode = mode;
                playerCount = parseInt(selectedBtn.dataset.players);
                startColorSelection();
            });
        });

        function startColorSelection() {
            menuOverlay.classList.add('hidden');
            colorSelection.classList.add('active');
            selectedColors = [];
            colorSelectingPlayer = 0;
            updateColorSelectionUI();
        }

        function closeColorSelection() {
            colorSelection.classList.remove('active');
            menuOverlay.classList.remove('hidden');
            // Reset any selected player buttons
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.start-btn').forEach(b => b.classList.remove('active'));
        }

        // Back button click handler
        document.getElementById('colorBackBtn').addEventListener('click', closeColorSelection);

        // Click outside to close color selection modal
        colorSelection.addEventListener('click', (e) => {
            if (e.target === colorSelection) {
                closeColorSelection();
            }
        });

        function updateColorSelectionUI() {
            const humanPlayers = gameMode === 'vscomputer' ? 1 : playerCount;
            if (colorSelectingPlayer < humanPlayers) {
                colorPlayerLabel.textContent = `Player ${colorSelectingPlayer + 1}, select your color:`;
                confirmColors.textContent = colorSelectingPlayer < humanPlayers - 1 ? 'Next Player' : 'Start Game';
            }
            colorGrid.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected', 'disabled');
                if (selectedColors.includes(opt.dataset.color)) opt.classList.add('disabled');
            });
            confirmColors.disabled = true;
        }

        colorGrid.addEventListener('click', e => {
            const option = e.target.closest('.color-option');
            if (!option || option.classList.contains('disabled')) return;
            colorGrid.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            confirmColors.disabled = false;
        });

        confirmColors.addEventListener('click', () => {
            const selected = colorGrid.querySelector('.color-option.selected');
            if (!selected) return;
            selectedColors.push(selected.dataset.color);
            colorSelectingPlayer++;
            const humanPlayers = gameMode === 'vscomputer' ? 1 : playerCount;
            if (colorSelectingPlayer >= humanPlayers) {
                assignRemainingColors();
                colorSelection.classList.remove('active');
                initGame();
            } else {
                updateColorSelectionUI();
            }
        });

        function assignRemainingColors() {
            const allColors = ['red', 'green', 'blue', 'yellow'];
            const available = allColors.filter(c => !selectedColors.includes(c));
            while (selectedColors.length < playerCount) {
                const idx = Math.floor(Math.random() * available.length);
                selectedColors.push(available.splice(idx, 1)[0]);
            }
            players = selectedColors.slice(0, playerCount);
            aiPlayers = gameMode === 'vscomputer' ? players.slice(1) : [];
        }

        // ============ SOUND EFFECTS ============
        let audioContext = null;

        function initAudio() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        function playSound(type) {
            if (!audioContext) initAudio();
            if (audioContext.state === 'suspended') audioContext.resume();

            switch (type) {
                case 'roll':
                    playDiceRollSound();
                    break;
                case 'hop':
                    playHopSound();
                    break;
                case 'capture':
                    playCaptureSound();
                    break;
                case 'win':
                    playWinSound();
                    break;
                case 'safe':
                    playSafeSound();
                    break;
                case 'home':
                    playHomeSound();
                    break;
            }
        }

        function playDiceRollSound() {
            // Sharp clicking sounds like dice on hard surface
            const clicks = [0, 60, 130, 200, 280, 370, 470, 580, 700];

            clicks.forEach((delay, i) => {
                scheduleTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();

                    osc.connect(gain);
                    gain.connect(audioContext.destination);

                    // High frequency click
                    osc.frequency.value = 1200 + Math.random() * 800;
                    osc.type = 'sine';

                    // Quick attack and decay
                    const vol = 0.12 * (1 - i * 0.08);
                    gain.gain.setValueAtTime(vol, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.03);

                    osc.start(audioContext.currentTime);
                    osc.stop(audioContext.currentTime + 0.03);
                }, delay);
            });
        }

        function playHopSound() {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(400, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.05);
            osc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.1);
        }

        function playCaptureSound() {
            // Dramatic descending tone
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(800, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.3);
        }

        function playWinSound() {
            // Victory fanfare - ascending notes
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                scheduleTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
                    osc.start(audioContext.currentTime);
                    osc.stop(audioContext.currentTime + 0.3);
                }, i * 150);
            });
        }

        function playSafeSound() {
            // Gentle chime for safe zone
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(880, audioContext.currentTime);
            osc.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.25);
        }

        function playHomeSound() {
            // Triumphant double chime for reaching home
            [0, 120].forEach((delay, i) => {
                scheduleTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = i === 0 ? 784 : 1047; // G5 then C6
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.18, audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
                    osc.start(audioContext.currentTime);
                    osc.stop(audioContext.currentTime + 0.3);
                }, delay);
            });
        }

        // ============ BACKGROUND MUSIC ============
        let bgMusicInterval = null;
        let musicEnabled = false;

        function startBackgroundMusic() {
            if (!audioContext || bgMusicInterval) return;

            const melody = [
                { note: 262, dur: 0.3 }, { note: 294, dur: 0.3 }, { note: 330, dur: 0.3 }, { note: 349, dur: 0.3 },
                { note: 392, dur: 0.6 }, { note: 349, dur: 0.3 }, { note: 330, dur: 0.3 },
                { note: 294, dur: 0.6 }, { note: 262, dur: 0.6 },
                { note: 294, dur: 0.3 }, { note: 330, dur: 0.3 }, { note: 349, dur: 0.3 }, { note: 392, dur: 0.3 },
                { note: 440, dur: 0.6 }, { note: 392, dur: 0.3 }, { note: 349, dur: 0.3 },
                { note: 330, dur: 0.6 }, { note: 294, dur: 0.6 }
            ];

            let noteIndex = 0;

            const playNextNote = () => {
                if (!musicEnabled || !audioContext) return;

                const { note, dur } = melody[noteIndex];
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(note, audioContext.currentTime);
                gain.gain.setValueAtTime(0.03, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur * 0.9);

                osc.start();
                osc.stop(audioContext.currentTime + dur);

                noteIndex = (noteIndex + 1) % melody.length;

                bgMusicInterval = scheduleTimeout(playNextNote, dur * 1000);
            };

            playNextNote();
        }

        function stopBackgroundMusic() {
            if (bgMusicInterval) {
                cancelTimeout(bgMusicInterval);
                bgMusicInterval = null;
            }
        }

        function toggleBackgroundMusic() {
            musicEnabled = !musicEnabled;
            const musicBtn = document.getElementById('musicBtn');

            if (musicEnabled) {
                initAudio();
                startBackgroundMusic();
                musicBtn.innerHTML = '<i class="fas fa-music"></i>';
                musicBtn.classList.remove('music-off');
            } else {
                stopBackgroundMusic();
                musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                musicBtn.classList.add('music-off');
            }
        }

        function gridToWorld(gx, gy) {
            const offset = BOARD_TOTAL / 2 - CELL_SIZE / 2;
            return { x: gx * CELL_SIZE - offset, z: gy * CELL_SIZE - offset };
        }

        function initThreeJS() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a1628);
            const w = boardContainer.clientWidth, h = boardContainer.clientHeight;
            camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
            camera.position.set(0, 650, 550);
            camera.lookAt(0, 0, 0);
            // MAF_LUDO_STAGE5: réduire la charge GPU et la mémoire sur téléphone.
            const compactScreen = window.innerWidth <= 700;
            // MAF_LUDO_SHARP_V1: antialiasing toujours actif et resolution complete pour un plateau net.
            renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(Math.max(1, w), Math.max(1, h));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            boardContainer.appendChild(renderer.domElement);
            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2.2;
            controls.minDistance = 300;
            controls.maxDistance = 1400;
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(200, 400, 200);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.set(compactScreen ? 1024 : 2048, compactScreen ? 1024 : 2048);
            dirLight.shadow.camera.near = 100;
            dirLight.shadow.camera.far = 1000;
            dirLight.shadow.camera.left = dirLight.shadow.camera.bottom = -400;
            dirLight.shadow.camera.right = dirLight.shadow.camera.top = 400;
            scene.add(dirLight);
            boardGroup = new THREE.Group();
            scene.add(boardGroup);
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            window.addEventListener('resize', onWindowResize);
            renderer.domElement.addEventListener('click', onBoardClick);
            // Ne pas interpréter la fin d'une rotation du plateau comme un choix de pion.
            renderer.domElement.addEventListener('pointerdown', trackPointerDown);
            renderer.domElement.addEventListener('pointermove', trackPointerMove);
        }

        function onWindowResize() {
            const w = boardContainer.clientWidth, h = boardContainer.clientHeight;
            if (!w || !h || !camera || !renderer) return;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);

            // Automatically adjust camera distance for smaller screens
            adjustCameraForScreenSize();
        }

        function adjustCameraForScreenSize() {
            if (!camera || !controls) return;
            const screenWidth = window.innerWidth;

            // Calculate appropriate camera distance based on screen width
            // On mobile (< 600px), zoom out more; on larger screens, stay closer
            let targetDistance;
            if (screenWidth < 480) {
                targetDistance = 1200; // Very small screens - max zoom out
            } else if (screenWidth < 600) {
                targetDistance = 1000; // Small mobile screens
            } else if (screenWidth < 768) {
                targetDistance = 850; // Tablets portrait
            } else if (screenWidth < 1024) {
                targetDistance = 750; // Tablets landscape
            } else {
                targetDistance = 850; // Desktop
            }

            // Update camera position
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            direction.negate();
            camera.position.copy(controls.target).add(direction.multiplyScalar(targetDistance));
        }

        // ============ ZOOM CONTROLS ============
        const ZOOM_STEP = 50;
        const MIN_ZOOM = 300;
        const MAX_ZOOM = 1400;

        function zoomIn() {
            if (!controls) return;
            const currentDistance = controls.getDistance();
            const newDistance = Math.max(MIN_ZOOM, currentDistance - ZOOM_STEP);
            smoothZoom(newDistance);
        }

        function zoomOut() {
            if (!controls) return;
            const currentDistance = controls.getDistance();
            const newDistance = Math.min(MAX_ZOOM, currentDistance + ZOOM_STEP);
            smoothZoom(newDistance);
        }

        function smoothZoom(targetDistance) {
            const startDistance = controls.getDistance();
            const duration = 200;
            const startTime = Date.now();

            function animateZoom() {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const easeT = 1 - Math.pow(1 - t, 3);
                const currentDistance = startDistance + (targetDistance - startDistance) * easeT;

                // Move camera along its look direction
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                direction.negate();
                camera.position.copy(controls.target).add(direction.multiplyScalar(currentDistance));

                if (t < 1) {
                    scheduleFrame(animateZoom);
                }
            }
            animateZoom();
        }

        // Zoom button event listeners
        document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
        document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);

        // ============ TOP VIEW TOGGLE ============
        let isTopView = false;
        const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

        // Get the default camera position adjusted for screen size
        function getDefaultCameraPosition() {
            const screenWidth = window.innerWidth;
            let distance;
            if (screenWidth < 480) {
                distance = 1200;
            } else if (screenWidth < 600) {
                distance = 1000;
            } else if (screenWidth < 768) {
                distance = 850;
            } else if (screenWidth < 1024) {
                distance = 750;
            } else {
                distance = 850;
            }
            // Original camera was at (0, 650, 550), which is about 852 units from origin
            // Scale the original position to match the target distance
            const originalDistance = Math.sqrt(650 * 650 + 550 * 550);
            const scale = distance / originalDistance;
            return new THREE.Vector3(0, 650 * scale, 550 * scale);
        }

        function toggleTopView() {
            const topViewBtn = document.getElementById('topViewBtn');

            if (!isTopView) {
                // Animate to top view (directly above the board)
                animateCameraTo(
                    new THREE.Vector3(0, 900, 0),  // Position directly above
                    new THREE.Vector3(0, 0, 0),    // Looking at center
                    500
                );

                topViewBtn.classList.add('active');
                isTopView = true;
            } else {
                // Animate directly to the screen-size-adjusted default position
                animateCameraTo(
                    getDefaultCameraPosition(),
                    DEFAULT_CAMERA_TARGET.clone(),
                    500
                );

                topViewBtn.classList.remove('active');
                isTopView = false;
            }
        }

        function animateCameraTo(targetPosition, targetLookAt, duration, onComplete) {
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            const startTime = Date.now();

            function animate() {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const easeT = 1 - Math.pow(1 - t, 3); // Ease out cubic

                // Interpolate position
                camera.position.lerpVectors(startPosition, targetPosition, easeT);

                // Interpolate target
                controls.target.lerpVectors(startTarget, targetLookAt, easeT);

                camera.lookAt(controls.target);
                controls.update();

                if (t < 1) {
                    scheduleFrame(animate);
                } else if (onComplete) {
                    onComplete();
                }
            }
            animate();
        }

        document.getElementById('topViewBtn').addEventListener('click', toggleTopView);

        function buildBoard() {
            // Main board
            const boardGeo = new THREE.BoxGeometry(BOARD_TOTAL, BOARD_THICKNESS, BOARD_TOTAL);
            const boardMat = new THREE.MeshStandardMaterial({ color: COLORS.white, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
            const board = new THREE.Mesh(boardGeo, boardMat);
            board.position.y = -BOARD_THICKNESS / 2 - 2;
            board.receiveShadow = true;
            boardGroup.add(board);
            // Bases
            createBase(0, 0, COLORS.red, 'red');
            createBase(9, 0, COLORS.green, 'green');
            createBase(0, 9, COLORS.blue, 'blue');
            createBase(9, 9, COLORS.yellow, 'yellow');
            // Race cells
            createRaceCells();
            // Final paths
            createFinalPaths();
            // Center home
            createCenterHome();
        }

        // Store base glow indicators for each player
        const baseGlowIndicators = {};

        function createBase(gx, gy, color, playerColorName) {
            const group = new THREE.Group();
            const outerGeo = new THREE.BoxGeometry(BASE_SIZE, 0.5, BASE_SIZE);
            const outerMat = new THREE.MeshStandardMaterial({ color });
            const outer = new THREE.Mesh(outerGeo, outerMat);
            outer.position.y = 0.25;
            outer.receiveShadow = true;
            group.add(outer);
            const innerSize = BASE_SIZE - 80;
            const innerGeo = new THREE.BoxGeometry(innerSize, 0.6, innerSize);
            const innerMat = new THREE.MeshStandardMaterial({ color: COLORS.white });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            inner.position.y = 0.55;
            inner.receiveShadow = true;
            group.add(inner);

            // Create glowing square outline inside the base (thick mesh frame)
            const glowSize = innerSize - 10;  // Larger size, closer to edge
            const frameThickness = 6;
            const frameHeight = 3;
            const glowGroup = new THREE.Group();
            glowGroup.name = 'baseGlow';

            // Create 4 sides of the frame
            const frameMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0
            });

            // Top and bottom bars
            const hBarGeo = new THREE.BoxGeometry(glowSize + frameThickness, frameHeight, frameThickness);
            const topBar = new THREE.Mesh(hBarGeo, frameMat);
            topBar.position.set(0, 0, -glowSize / 2);
            glowGroup.add(topBar);

            const bottomBar = new THREE.Mesh(hBarGeo, frameMat.clone());
            bottomBar.position.set(0, 0, glowSize / 2);
            glowGroup.add(bottomBar);

            // Left and right bars
            const vBarGeo = new THREE.BoxGeometry(frameThickness, frameHeight, glowSize + frameThickness);
            const leftBar = new THREE.Mesh(vBarGeo, frameMat.clone());
            leftBar.position.set(-glowSize / 2, 0, 0);
            glowGroup.add(leftBar);

            const rightBar = new THREE.Mesh(vBarGeo, frameMat.clone());
            rightBar.position.set(glowSize / 2, 0, 0);
            glowGroup.add(rightBar);

            glowGroup.position.y = 0.8;
            group.add(glowGroup);

            // Store reference for animation
            if (playerColorName) {
                baseGlowIndicators[playerColorName] = glowGroup;
            }

            const pos = gridToWorld(gx + 2.5, gy + 2.5);
            group.position.set(pos.x, 0.1, pos.z);
            boardGroup.add(group);
        }

        // Base glow animation
        let baseGlowAnimationId = null;
        let currentGlowPlayer = null;

        function startBaseGlow(playerColor) {
            // Stop previous animation
            stopBaseGlow();

            currentGlowPlayer = playerColor;
            let glowTime = 0;

            function animateGlow() {
                if (!currentGlowPlayer || !baseGlowIndicators[currentGlowPlayer]) return;

                glowTime += 0.05;
                const opacity = (Math.sin(glowTime * 2) + 1) / 2;
                const finalOpacity = 0.5 + opacity * 0.5;

                // Update opacity for all children in the glow group
                baseGlowIndicators[currentGlowPlayer].children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = finalOpacity;
                    }
                });

                baseGlowAnimationId = scheduleFrame(animateGlow);
            }

            animateGlow();
        }

        function stopBaseGlow() {
            if (baseGlowAnimationId) {
                cancelFrame(baseGlowAnimationId);
                baseGlowAnimationId = null;
            }

            // Reset all base glows to invisible
            Object.values(baseGlowIndicators).forEach(glowGroup => {
                if (glowGroup && glowGroup.children) {
                    glowGroup.children.forEach(child => {
                        if (child.material) {
                            child.material.opacity = 0;
                        }
                    });
                }
            });

            currentGlowPlayer = null;
        }

        const raceCellPositions = [
            [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
            [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11],
            [8, 12], [8, 13], [8, 14], [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6]
        ];
        const startCells = { 1: COLORS.red, 14: COLORS.green, 27: COLORS.yellow, 40: COLORS.blue };
        const safeZones = [1, 9, 14, 22, 27, 35, 40, 48];
        const safeZoneColors = { 1: 0xef6d5e, 9: 0xcccccc, 14: 0x48c76a, 22: 0xcccccc, 27: 0xfcc937, 35: 0xcccccc, 40: 0x72a4f7, 48: 0xcccccc };

        function createRaceCells() {
            raceCellPositions.forEach((pos, idx) => {
                const cellNum = idx + 1;
                const wp = gridToWorld(pos[0], pos[1]);
                let cellColor = COLORS.white;
                if (startCells[cellNum]) cellColor = startCells[cellNum];
                const cellGeo = new THREE.BoxGeometry(CELL_SIZE - 1, 1, CELL_SIZE - 1);
                const cellMat = new THREE.MeshStandardMaterial({ color: cellColor });
                const cell = new THREE.Mesh(cellGeo, cellMat);
                cell.position.set(wp.x, 0.6, wp.z);
                cell.receiveShadow = true;
                boardGroup.add(cell);
                const edges = new THREE.EdgesGeometry(cellGeo);
                const lineMat = new THREE.LineBasicMaterial({ color: COLORS.border });
                const wire = new THREE.LineSegments(edges, lineMat);
                wire.position.set(wp.x, 0.6, wp.z);
                boardGroup.add(wire);
                if (safeZones.includes(cellNum)) createStar(wp.x, wp.z, safeZoneColors[cellNum]);
            });
        }

        function createStar(x, z, color) {
            const shape = new THREE.Shape();
            const outerR = 12, innerR = 5, points = 5;
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
                i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
            }
            shape.closePath();
            const geo = new THREE.ShapeGeometry(shape);
            const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
            const star = new THREE.Mesh(geo, mat);
            star.rotation.x = -Math.PI / 2;
            star.position.set(x, 1.2, z);
            boardGroup.add(star);
        }

        function createFinalPaths() {
            const paths = [
                { cells: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], color: COLORS.red },
                { cells: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], color: COLORS.green },
                { cells: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], color: COLORS.yellow },
                { cells: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], color: COLORS.blue }
            ];
            paths.forEach(p => {
                p.cells.forEach(c => {
                    const wp = gridToWorld(c[0], c[1]);
                    const geo = new THREE.BoxGeometry(CELL_SIZE - 1, 1, CELL_SIZE - 1);
                    const mat = new THREE.MeshStandardMaterial({ color: p.color });
                    const cell = new THREE.Mesh(geo, mat);
                    cell.position.set(wp.x, 0.6, wp.z);
                    cell.receiveShadow = true;
                    boardGroup.add(cell);
                    const edges = new THREE.EdgesGeometry(geo);
                    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.border });
                    const wire = new THREE.LineSegments(edges, lineMat);
                    wire.position.set(wp.x, 0.6, wp.z);
                    boardGroup.add(wire);
                });
            });
        }

        function createCenterHome() {
            const centerSize = 3 * CELL_SIZE, halfSize = centerSize / 2;
            const triangles = [
                { color: COLORS.red, rotation: 0 },
                { color: COLORS.green, rotation: -Math.PI / 2 },
                { color: COLORS.yellow, rotation: Math.PI },
                { color: COLORS.blue, rotation: Math.PI / 2 }
            ];
            triangles.forEach(({ color, rotation }) => {
                const shape = new THREE.Shape();
                shape.moveTo(-halfSize, -halfSize);
                shape.lineTo(0, 0);
                shape.lineTo(-halfSize, halfSize);
                shape.lineTo(-halfSize, -halfSize);
                const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
                const mat = new THREE.MeshStandardMaterial({ color });
                const tri = new THREE.Mesh(geo, mat);
                tri.rotation.x = -Math.PI / 2;
                tri.rotation.z = rotation;
                tri.position.y = 0.1;
                boardGroup.add(tri);
            });
        }

        function createToken(color, colorLight) {
            const group = new THREE.Group();
            const outerGeo = new THREE.CylinderGeometry(TOKEN_RADIUS, TOKEN_RADIUS, TOKEN_HEIGHT, 32);
            const outerMat = new THREE.MeshStandardMaterial({ color });
            const outer = new THREE.Mesh(outerGeo, outerMat);
            outer.castShadow = true;
            group.add(outer);
            const innerGeo = new THREE.CylinderGeometry(TOKEN_RADIUS - 3, TOKEN_RADIUS - 3, TOKEN_HEIGHT + 0.5, 32);
            const innerMat = new THREE.MeshStandardMaterial({ color: colorLight });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            inner.position.y = 0.25;
            inner.castShadow = true;
            group.add(inner);
            group.position.y = TOKEN_HEIGHT / 2 + 0.8;
            return group;
        }

        function createPlayerTokens() {
            const colorMap = {
                red: { dark: COLORS.redDark, light: COLORS.redLight },
                green: { dark: COLORS.greenDark, light: COLORS.greenLight },
                blue: { dark: COLORS.blueDark, light: COLORS.blueLight },
                yellow: { dark: COLORS.yellowDark, light: COLORS.yellowLight }
            };
            players.forEach(player => {
                tokens[player] = [-1, -1, -1, -1]; // -1 = at home
                tokenMeshes[player] = [];
                for (let i = 0; i < 4; i++) {
                    const token = createToken(colorMap[player].dark, colorMap[player].light);
                    const hp = HOME_POSITIONS[player][i];
                    const wp = gridToWorld(hp[0], hp[1]);
                    token.position.set(wp.x, token.position.y, wp.z);
                    token.userData = { player, index: i };
                    boardGroup.add(token);
                    tokenMeshes[player].push(token);
                }
            });
        }

        // ============ GAME LOGIC ============
        function initGame() {
            gameContainer.classList.add('active');
            initThreeJS();
            buildBoard();
            adjustCameraForScreenSize(); // Set initial camera position based on screen size
            createPlayerTokens();

            // Rotate board for optimal 2-player view
            rotateBoardForPlayers();

            currentPlayerIndex = 0;
            gameActive = true;
            updateUI();
            updateScoreboard();
            animate();

            // Start background music when game begins
            initAudio();
            if (musicEnabled) startBackgroundMusic();

            if (aiPlayers.includes(players[currentPlayerIndex])) {
                scheduleTimeout(aiTurn, 1000);
            }
        }

        // Rotate the board so 2-player games have both players' bases facing the camera
        function rotateBoardForPlayers() {
            if (playerCount !== 2) return;

            const [p1, p2] = players;

            // Board color positions:
            // Red: top-left, Green: top-right
            // Blue: bottom-left, Yellow: bottom-right
            // Camera faces "south" (positive Z), so bottom colors are already front

            // Same row pairs
            const topRow = ['red', 'green'];
            const bottomRow = ['blue', 'yellow'];
            // Same column pairs  
            const leftColumn = ['red', 'blue'];
            const rightColumn = ['green', 'yellow'];

            let rotation = 0;

            // Check if both players are on same row
            if (topRow.includes(p1) && topRow.includes(p2)) {
                // Both on top row - rotate 180° to bring top to front
                rotation = Math.PI;
            } else if (bottomRow.includes(p1) && bottomRow.includes(p2)) {
                // Both on bottom row - already at front, no rotation needed
                rotation = 0;
            }
            // Check if both players are on same column
            else if (leftColumn.includes(p1) && leftColumn.includes(p2)) {
                // Both on left column - rotate 90° clockwise
                rotation = Math.PI / 2;
            } else if (rightColumn.includes(p1) && rightColumn.includes(p2)) {
                // Both on right column - rotate 90° counter-clockwise
                rotation = -Math.PI / 2;
            }
            // If players are diagonal, no rotation needed

            if (rotation !== 0) {
                boardGroup.rotation.y = rotation;
            }
        }

        function animate() {
            if (!gameActive) return;
            scheduleFrame(animate);
            if (document.hidden) return;
            controls.update();
            renderer.render(scene, camera);
        }

        function updateUI() {
            const player = players[currentPlayerIndex];
            const isAI = aiPlayers.includes(player);
            const colorVar = `var(--${player})`;

            // Determine display name based on game mode
            let displayName;
            if (gameMode === 'vscomputer') {
                if (isAI) {
                    const aiIndex = aiPlayers.indexOf(player);
                    displayName = players.length > 2 ? `Bot ${aiIndex + 1}` : 'Bot';
                } else {
                    displayName = 'You';
                }
            } else {
                displayName = isOnline && networkState
                  ? (networkState.toMove === networkState.viewer ? 'Vous' : 'Adversaire')
                  : `Player ${currentPlayerIndex + 1}`;
            }

            currentPlayerEl.innerHTML = `<i class="fas ${isAI ? 'fa-robot' : 'fa-user'}"></i> <span>${displayName}</span>`;
            currentPlayerEl.style.color = colorVar;
            document.documentElement.style.setProperty('--current-color', colorVar);
            rollBtn.disabled = isOnline ? (isRolling || !networkState || networkState.finished || networkState.viewer !== networkState.toMove || networkState.roll != null || options.busy?.()) : (isRolling || isAI);

            // Activate base glow for current player
            startBaseGlow(player);
        }

        function updateScoreboard() {
            scoreGrid.innerHTML = '';
            let botCount = 0;
            players.forEach((player, idx) => {
                const score = tokens[player].filter(t => t === 56).length; // 56 = home
                const isAI = aiPlayers.includes(player);
                const isCurrent = idx === currentPlayerIndex;

                // Determine display name based on game mode
                let displayName;
                if (gameMode === 'vscomputer') {
                    if (isAI) {
                        botCount++;
                        displayName = players.length > 2 ? `Bot ${botCount}` : 'Bot';
                    } else {
                        displayName = 'You';
                    }
                } else {
                    displayName = isOnline && networkState
                      ? ((idx === 0 ? 'host' : 'guest') === networkState.viewer ? 'Vous' : 'Adversaire')
                      : `Player ${idx + 1}`;
                }

                scoreGrid.innerHTML += `
                    <div class="score-item ${isCurrent ? 'current' : ''}">
                        <div class="score-dot ${player}"></div>
                        <span class="score-name">${displayName}</span>
                        ${isAI ? '<i class="fas fa-robot"></i>' : ''}
                        <span class="score-value">${score}/4</span>
                    </div>
                `;
            });
        }

        function setMessage(msg) { messageBox.textContent = msg; }

        // ============ DICE ============
        let diceAngleX = 0, diceAngleY = 0;
        const diceContainer = document.getElementById('diceContainer');
        const ROLL_MAX = 8;
        // MAF_LUDO_UI_FIX_V2 — Anime le resultat DEJA valide par le serveur.
        // Aucune valeur aleatoire locale ne determine le score d'un duel.
        function animateServerDice(result, packet) {
            if (!isOnline || !Number.isInteger(result) || result < 1 || result > 6) return;
            const orientations = {
                1: [0, 0], 2: [0, 270], 3: [270, 0],
                4: [90, 0], 5: [0, 90], 6: [0, 180],
            };
            const [endX, endY] = orientations[result];
            const positiveMod = value => ((value % 360) + 360) % 360;
            diceAngleX += 720 + positiveMod(endX - positiveMod(diceAngleX));
            diceAngleY += 720 + positiveMod(endY - positiveMod(diceAngleY));
            isRolling = true;
            rollBtn.disabled = true;
            playSound('roll');
            setMessage('Le dé roule…');
            diceEl.style.transitionDuration = '1150ms';
            diceEl.style.transitionTimingFunction = 'cubic-bezier(.18,.66,.28,1)';
            // Force le navigateur à prendre la position initiale avant l'animation.
            void diceEl.offsetWidth;
            diceEl.style.transform = `rotateX(${diceAngleX}deg) rotateY(${diceAngleY}deg)`;
            scheduleTimeout(() => {
                isRolling = false;
                // Des polls actualisent serverNow sans changer la version : ne pas
                // perdre la fin d'animation ni les pions selectionnables.
                if (disposed || !networkState || networkState.version !== packet.version) return;
                const live = networkState;
                updateUI();
                const mine = live.viewer === live.toMove;
                if (live.finished) {
                    setMessage('Duel terminé.');
                } else if (mine && live.roll != null) {
                    setMessage(`Dé : ${live.roll} · Choisis ton pion.`);
                    if (!highlightedMeshes.length && Array.isArray(live.valid) && live.valid.length)
                        highlightTokens(players[currentPlayerIndex], live.valid);
                } else {
                    setMessage((live.lastAction || '') + ' · ' + (mine ? 'À toi de lancer le dé.' : 'Attends ton adversaire.'));
                }
            }, 1230);
        }

        rollBtn.addEventListener('click', () => {
            if (isRolling || !gameActive || rollBtn.disabled) return;
            if (isOnline) { if (networkState?.viewer === networkState?.toMove && networkState?.roll == null) options.onRoll?.(); return; }
            rollDice();
        });

        diceContainer.addEventListener('click', () => {
            if (isRolling || !gameActive || rollBtn.disabled || aiPlayers.includes(players[currentPlayerIndex])) return;
            if (isOnline) { if (networkState?.viewer === networkState?.toMove && networkState?.roll == null) options.onRoll?.(); return; }
            rollDice();
        });

        function getRandomInt(max) {
            return Math.floor(Math.random() * max);
        }
        // MAF_LUDO_FAIR_DICE_V1 : tirage uniforme (1 a 6) sans biais ; l'animation s'oriente ensuite vers la face tiree.
        function secureInt(max) {
            const cryptoApi = window.crypto || globalThis.crypto;
            if (!cryptoApi?.getRandomValues) return Math.floor(Math.random() * max);
            const limit = Math.floor(0x100000000 / max) * max;
            const buffer = new Uint32Array(1);
            do { cryptoApi.getRandomValues(buffer); } while (buffer[0] >= limit);
            return buffer[0] % max;
        }
        const spinTo = (current, target, minimum) => {
            let delta = (((target - current) % 360) + 360) % 360;
            while (delta < minimum) delta += 360;
            return current + delta;
        };
        let homeTries = 0;

        function rollDice() {
            if (isRolling || !gameActive || disposed) return;
            isRolling = true;
            rollBtn.disabled = true;
            playSound('roll');

            const result = secureInt(6) + 1;
            // Orientation finale de chaque face (voir le calcul de lecture historique : x/y en degres).
            const CODE = { 1: 0, 5: 90, 6: 180, 2: 270 };
            let targetX, targetY;
            if (result === 4) { targetX = 90; targetY = 90 * secureInt(4); }
            else if (result === 3) { targetX = 270; targetY = 90 * secureInt(4); }
            else {
                targetX = secureInt(2) === 0 ? 0 : 180;
                targetY = (((CODE[result] - targetX) % 360) + 360) % 360;
            }
            const previousX = diceAngleX, previousY = diceAngleY;
            diceAngleX = spinTo(diceAngleX, targetX, 360 + 90 * secureInt(4));
            diceAngleY = spinTo(diceAngleY, targetY, 360 + 90 * secureInt(4));
            const delay = Math.max((diceAngleX - previousX) / 90, (diceAngleY - previousY) / 90) * 200;

            diceEl.style.transform = `rotateX(${diceAngleX}deg) rotateY(${diceAngleY}deg)`;
            diceEl.style.transitionDuration = delay + 'ms';

            scheduleTimeout(() => {
                lastRoll = result;
                isRolling = false;
                setMessage(`Rolled a ${result}!`);
                handleRoll(result);
            }, delay + 100);
        }

        function handleRoll(value) {
            const player = players[currentPlayerIndex];
            const validMoves = getValidMoves(player, value);
            if (validMoves.length === 0) {
                const allHome = tokens[player].every(pos => pos === -1);
                if (allHome && homeTries < 2) {
                    homeTries++;
                    setMessage(`Rolled ${value}. Essai ${homeTries}/3 : relance pour sortir un pion avec un 6.`);
                    scheduleTimeout(() => { if (!disposed) { rollBtn.disabled = false; if (aiPlayers.includes(player)) aiTurn(); } }, 900);
                    return;
                }
                homeTries = 0;
                setMessage(`Rolled ${value}. No valid moves!`);
                scheduleTimeout(nextTurn, 1500);
            } else if (validMoves.length === 1) {
                scheduleTimeout(() => moveToken(player, validMoves[0], value), 500);
            } else {
                setMessage(`Rolled ${value}. Select a token to move.`);
                highlightTokens(player, validMoves);
                rollBtn.disabled = true;
            }
        }

        function getValidMoves(player, value) {
            const moves = [];
            for (let i = 0; i < 4; i++) {
                const pos = tokens[player][i];
                if (pos === -1) {
                    if (value === 6) moves.push(i); // Can leave home
                } else if (pos < 51) {
                    if (pos + value <= 56) moves.push(i); // Normal move or entering final path
                } else if (pos >= 51 && pos < 56) {
                    if (pos + value <= 56) moves.push(i); // In final path
                }
            }
            return moves;
        }

        let highlightAnimationId = null;
        let highlightedMeshes = [];

        function highlightTokens(player, validMoves) {
            // Eviter les anneaux en double si la synchronisation relance la selection.
            clearHighlights();
            if (!tokenMeshes[player]) return;
            highlightedMeshes = [];

            // Get player's light color for the ring
            const lightColors = {
                red: 0xff6b6b,
                green: 0x69db7c,
                blue: 0x74c0fc,
                yellow: 0xffd43b
            };
            const ringColor = lightColors[player] || 0xffffff;

            validMoves.forEach(i => {
                const mesh = tokenMeshes[player][i];
                mesh.userData.highlighted = true;
                highlightedMeshes.push(mesh);

                // Create glowing ring indicator
                const ringGeo = new THREE.RingGeometry(TOKEN_RADIUS + 3, TOKEN_RADIUS + 7, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: ringColor,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.y = 1;
                ring.name = 'highlightRing';
                mesh.add(ring);
            });

            // Start blinking animation
            startHighlightBlink();
        }

        function startHighlightBlink() {
            let blinkTime = 0;
            function blink() {
                blinkTime += 0.05;
                const opacity = (Math.sin(blinkTime * 2) + 1) / 2;

                highlightedMeshes.forEach(mesh => {
                    const ring = mesh.getObjectByName('highlightRing');
                    if (ring) {
                        ring.material.opacity = 0.3 + opacity * 0.7;
                    }
                });

                if (highlightedMeshes.length > 0) {
                    highlightAnimationId = scheduleFrame(blink);
                }
            }
            blink();
        }

        function clearHighlights() {
            if (highlightAnimationId) {
                cancelFrame(highlightAnimationId);
                highlightAnimationId = null;
            }

            players.forEach(p => {
                tokenMeshes[p].forEach(mesh => {
                    mesh.userData.highlighted = false;
                    const ring = mesh.getObjectByName('highlightRing');
                    if (ring) {
                        mesh.remove(ring);
                        ring.geometry.dispose();
                        ring.material.dispose();
                    }
                });
            });
            highlightedMeshes = [];
        }

        let pointerOrigin = null;
        let pointerDragged = false;
        function trackPointerDown(event) {
            pointerOrigin = { x: event.clientX, y: event.clientY };
            pointerDragged = false;
        }
        function trackPointerMove(event) {
            if (pointerOrigin && (Math.abs(event.clientX - pointerOrigin.x) > 9 || Math.abs(event.clientY - pointerOrigin.y) > 9)) {
                pointerDragged = true;
            }
        }
        function onBoardClick(event) {
            if (pointerDragged) { pointerDragged = false; return; }
            if (!gameActive || aiPlayers.includes(players[currentPlayerIndex])) return;
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const player = players[currentPlayerIndex];
            const legal = isOnline
                ? ((networkState?.viewer === networkState?.toMove && networkState?.roll != null && !networkState.finished)
                    ? networkState.valid || [] : [])
                : tokenMeshes[player].filter(m => m.userData.highlighted).map(m => m.userData.index);
            const meshes = tokenMeshes[player].filter(m => legal.includes(m.userData.index));
            const intersects = raycaster.intersectObjects(meshes, true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj.parent && !obj.userData.player) obj = obj.parent;
                if (obj.userData.player === player && legal.includes(obj.userData.index)) {
                    clearHighlights();
                    if (isOnline) options.onMove?.(obj.userData.index);
                    else moveToken(player, obj.userData.index, lastRoll);
                }
            }
        }

        function moveToken(player, tokenIndex, steps) {
            const oldPos = tokens[player][tokenIndex];
            let newPos;
            if (oldPos === -1) {
                newPos = 0; // Move to start
            } else {
                newPos = oldPos + steps;
            }
            tokens[player][tokenIndex] = newPos;
            animateTokenMove(player, tokenIndex, oldPos, newPos, () => {
                checkCapture(player, tokenIndex, newPos);
                // Redistribute tokens on both old and new positions
                if (oldPos >= 0) distributeTokensOnCell(oldPos);
                distributeTokensOnCell(newPos);

                // Play sound for safe zone or home entry
                if (newPos === 56) {
                    playSound('home');
                } else if (newPos >= 0 && newPos < 51 && (SAFE_CELLS.includes(newPos) || newPos === START_CELLS[player])) {
                    playSound('safe');
                }

                updateScoreboard();
                if (checkWin(player)) {
                    showWin(player);
                } else if (lastRoll === 6) {
                    setMessage('Rolled 6! Roll again.');
                    rollBtn.disabled = aiPlayers.includes(player);
                    if (aiPlayers.includes(player)) scheduleTimeout(aiTurn, 1000);
                } else {
                    nextTurn();
                }
            });
        }

        function distributeTokensOnCell(pos) {
            // Get grid coordinates for the given position for the current player
            // Then find ALL tokens from ALL players at those grid coordinates

            // First, we need to find the actual grid coordinates
            // We'll check from the perspective of the player who just moved
            const player = players[currentPlayerIndex];
            let targetGridPos;

            if (pos === 56) {
                // Home triangle - each token has its own spot, no redistribution needed
                return;
            } else if (pos >= 51 && pos < 56) {
                targetGridPos = FINAL_PATHS[player][pos - 51];
            } else if (pos >= 0 && pos < 51) {
                targetGridPos = PLAYER_PATHS[player][pos];
            } else {
                return; // Home position, no distribution needed
            }

            // Now find all tokens at this grid position
            const tokensOnCell = [];

            players.forEach(p => {
                tokens[p].forEach((tPos, idx) => {
                    if (tPos < 0) return; // Skip tokens at home

                    let gridPos;
                    if (tPos === 56) {
                        gridPos = [7, 7];
                    } else if (tPos >= 51 && tPos < 56) {
                        gridPos = FINAL_PATHS[p][tPos - 51];
                    } else if (tPos >= 0 && tPos < 51) {
                        gridPos = PLAYER_PATHS[p][tPos];
                    } else {
                        return;
                    }

                    // Check if this token is at the same grid position
                    if (gridPos[0] === targetGridPos[0] && gridPos[1] === targetGridPos[1]) {
                        tokensOnCell.push({ player: p, index: idx, gridPos });
                    }
                });
            });

            // Reposition based on count
            const spacing = 12;
            const count = tokensOnCell.length;

            tokensOnCell.forEach((token, i) => {
                const basePos = gridToWorld(token.gridPos[0], token.gridPos[1]);
                const mesh = tokenMeshes[token.player][token.index];

                let offsetX = 0, offsetZ = 0;

                if (count === 1) {
                    // Single token - center it
                    offsetX = 0;
                    offsetZ = 0;
                } else if (count === 2) {
                    offsetX = (i - 0.5) * spacing;
                } else if (count === 3) {
                    if (i === 0) { offsetX = -spacing * 0.7; offsetZ = -spacing * 0.4; }
                    else if (i === 1) { offsetX = spacing * 0.7; offsetZ = -spacing * 0.4; }
                    else { offsetZ = spacing * 0.6; }
                } else if (count >= 4) {
                    offsetX = (i % 2 === 0 ? -1 : 1) * spacing * 0.5;
                    offsetZ = (Math.floor(i / 2) % 2 === 0 ? -1 : 1) * spacing * 0.5;
                }

                mesh.position.x = basePos.x + offsetX;
                mesh.position.z = basePos.z + offsetZ;
            });
        }

        function getPositionForStep(player, tokenIndex, pos) {
            if (pos === 56) {
                // Home triangle - each token goes to its player's colored triangle
                const htp = HOME_TRIANGLE_POSITIONS[player][tokenIndex];
                return gridToWorld(htp[0], htp[1]);
            } else if (pos >= 51) {
                // Final path
                const fpIdx = pos - 51;
                const fp = FINAL_PATHS[player][fpIdx];
                return gridToWorld(fp[0], fp[1]);
            } else if (pos >= 0) {
                // Main track
                const pp = PLAYER_PATHS[player][pos];
                return gridToWorld(pp[0], pp[1]);
            } else {
                // Home base
                const hp = HOME_POSITIONS[player][tokenIndex];
                return gridToWorld(hp[0], hp[1]);
            }
        }

        function animateTokenMove(player, tokenIndex, oldPos, newPos, callback) {
            const mesh = tokenMeshes[player][tokenIndex];
            const stepDuration = 150; // Time for each step in ms
            const pauseDuration = 50;  // Pause between steps

            // Build list of positions to move through
            const positions = [];

            if (oldPos === -1) {
                // Moving from home to start position
                positions.push(0);
            } else {
                // Moving step by step
                for (let p = oldPos + 1; p <= newPos; p++) {
                    positions.push(p);
                }
            }

            let currentStep = 0;

            function animateStep() {
                if (currentStep >= positions.length) {
                    callback();
                    return;
                }

                playSound('hop');

                const targetWorldPos = getPositionForStep(player, tokenIndex, positions[currentStep]);
                const startPos = mesh.position.clone();
                const endPos = new THREE.Vector3(targetWorldPos.x, mesh.position.y, targetWorldPos.z);
                const startTime = Date.now();

                function stepAnim() {
                    const elapsed = Date.now() - startTime;
                    const t = Math.min(elapsed / stepDuration, 1);
                    // Ease out for snappy movement
                    const easeT = 1 - Math.pow(1 - t, 3);
                    mesh.position.lerpVectors(startPos, endPos, easeT);

                    // Add slight hop effect
                    const hopHeight = 8;
                    const hopProgress = Math.sin(t * Math.PI);
                    mesh.position.y = (TOKEN_HEIGHT / 2 + 0.8) + hopProgress * hopHeight;

                    if (t < 1) {
                        scheduleFrame(stepAnim);
                    } else {
                        // Pause briefly then move to next step
                        currentStep++;
                        scheduleTimeout(animateStep, pauseDuration);
                    }
                }
                stepAnim();
            }

            animateStep();
        }

        function checkCapture(player, tokenIndex, pos) {
            if (pos < 0 || pos >= 51) return; // Can't capture in final path or home
            const safeIdx = SAFE_CELLS.includes(pos);
            const startIdx = Object.values(START_CELLS).includes(pos);
            if (safeIdx || startIdx) return; // Safe zone
            const gridPos = PLAYER_PATHS[player][pos];
            players.forEach(other => {
                if (other === player) return;
                for (let i = 0; i < 4; i++) {
                    const oPos = tokens[other][i];
                    if (oPos >= 0 && oPos < 51) {
                        const otherGridPos = PLAYER_PATHS[other][oPos];
                        if (gridPos[0] === otherGridPos[0] && gridPos[1] === otherGridPos[1]) {
                            // Capture!
                            tokens[other][i] = -1;
                            const hp = HOME_POSITIONS[other][i];
                            const wp = gridToWorld(hp[0], hp[1]);
                            tokenMeshes[other][i].position.set(wp.x, tokenMeshes[other][i].position.y, wp.z);
                            setMessage(`${player} captured ${other}'s token!`);
                            playSound('capture');
                        }
                    }
                }
            });
        }

        function checkWin(player) {
            return tokens[player].every(t => t === 56);
        }

        function showWin(player) {
            gameActive = false;
            playSound('win');
            startConfetti(); // Trigger confetti animation

            const winTitle = document.getElementById('winTitle');
            const winIcon = document.getElementById('winIcon');
            const isAI = aiPlayers.includes(player);
            const playerIdx = players.indexOf(player);

            if (gameMode === 'vscomputer') {
                if (isAI) {
                    // Bot won - defeat
                    winTitle.textContent = 'Defeat!';
                    winIcon.className = 'fas fa-sad-tear';
                    const aiIndex = aiPlayers.indexOf(player);
                    const botName = players.length > 2 ? `Bot ${aiIndex + 1}` : 'Bot';
                    winPlayer.textContent = `${botName} Wins!`;
                } else {
                    // Human won - victory
                    winTitle.textContent = 'Victory!';
                    winIcon.className = 'fas fa-crown';
                    winPlayer.textContent = 'You Won!';
                }
            } else {
                // Pass and Play mode
                winTitle.textContent = 'Victory!';
                winIcon.className = 'fas fa-crown';
                winPlayer.textContent = `Player ${playerIdx + 1} Wins!`;
            }

            winPlayer.style.color = `var(--${player})`;
            winModal.classList.add('active');
        }

        // ============ CONFETTI ANIMATION ============
        const confettiCanvas = document.getElementById('confettiCanvas');
        const confettiCtx = confettiCanvas.getContext('2d');
        let confettiParticles = [];
        let confettiAnimationId = null;

        function resizeConfettiCanvas() {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
        resizeConfettiCanvas();
        window.addEventListener('resize', resizeConfettiCanvas);

        class ConfettiParticle {
            constructor() {
                this.reset();
                this.y = Math.random() * -confettiCanvas.height; // Start above screen
            }

            reset() {
                this.x = Math.random() * confettiCanvas.width;
                this.y = -20;
                this.size = Math.random() * 10 + 5;
                this.speedY = Math.random() * 3 + 2;
                this.speedX = Math.random() * 2 - 1;
                this.rotation = Math.random() * 360;
                this.rotationSpeed = Math.random() * 10 - 5;
                this.color = this.getRandomColor();
                this.shape = Math.floor(Math.random() * 3); // 0: rect, 1: circle, 2: triangle
                this.wobble = Math.random() * 10;
                this.wobbleSpeed = Math.random() * 0.1 + 0.05;
            }

            getRandomColor() {
                const colors = [
                    '#ea4330', '#34a853', '#4285f4', '#fbbc05', // Ludo colors
                    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96c93d', // Vibrant extras
                    '#f9ca24', '#f0932b', '#eb4d4b', '#6ab04c',
                    '#be2edd', '#22a6b3', '#ff9ff3', '#feca57'
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.y += this.speedY;
                this.x += this.speedX + Math.sin(this.wobble) * 0.5;
                this.wobble += this.wobbleSpeed;
                this.rotation += this.rotationSpeed;

                // Reset if off screen
                if (this.y > confettiCanvas.height + 20) {
                    this.reset();
                }
            }

            draw() {
                confettiCtx.save();
                confettiCtx.translate(this.x, this.y);
                confettiCtx.rotate((this.rotation * Math.PI) / 180);
                confettiCtx.fillStyle = this.color;

                switch (this.shape) {
                    case 0: // Rectangle
                        confettiCtx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
                        break;
                    case 1: // Circle
                        confettiCtx.beginPath();
                        confettiCtx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                        confettiCtx.fill();
                        break;
                    case 2: // Triangle
                        confettiCtx.beginPath();
                        confettiCtx.moveTo(0, -this.size / 2);
                        confettiCtx.lineTo(this.size / 2, this.size / 2);
                        confettiCtx.lineTo(-this.size / 2, this.size / 2);
                        confettiCtx.closePath();
                        confettiCtx.fill();
                        break;
                }

                confettiCtx.restore();
            }
        }

        function startConfetti() {
            // Create particles
            confettiParticles = [];
            for (let i = 0; i < 150; i++) {
                confettiParticles.push(new ConfettiParticle());
            }

            // Start animation
            animateConfetti();

            // Stop confetti after 8 seconds
            scheduleTimeout(stopConfetti, 8000);
        }

        function animateConfetti() {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            confettiParticles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            confettiAnimationId = scheduleFrame(animateConfetti);
        }

        function stopConfetti() {
            if (confettiAnimationId) {
                cancelFrame(confettiAnimationId);
                confettiAnimationId = null;
            }
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiParticles = [];
        }

        function nextTurn() {
            homeTries = 0;
            clearHighlights();
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            lastRoll = 0;
            updateUI();
            updateScoreboard();
            setMessage('Roll the dice!');
            if (aiPlayers.includes(players[currentPlayerIndex])) {
                scheduleTimeout(aiTurn, 1000);
            }
        }

        // ============ AI ============
        function aiTurn() {
            if (!gameActive || disposed || !aiPlayers.includes(players[currentPlayerIndex])) return;
            setMessage('Le bot réfléchit...');
            scheduleTimeout(() => {
                if (gameActive && aiPlayers.includes(players[currentPlayerIndex])) rollDice();
            }, 500);
        }

        // Override handleRoll for AI
        const originalHandleRoll = handleRoll;
        handleRoll = function (value) {
            const player = players[currentPlayerIndex];
            if (aiPlayers.includes(player)) {
                const validMoves = getValidMoves(player, value);
                if (validMoves.length === 0) {
                    if (tokens[player].every(pos => pos === -1) && homeTries < 2) {
                        homeTries++;
                        setMessage(`Le bot a obtenu ${value}. Essai ${homeTries}/3.`);
                        scheduleTimeout(aiTurn, 900);
                        return;
                    }
                    homeTries = 0;
                    setMessage(`Le bot a obtenu ${value}. Aucun déplacement possible !`);
                    scheduleTimeout(nextTurn, 1500);
                } else {
                    // Simple AI: prefer captures, then furthest token, then leaving home
                    const bestMove = chooseBestMove(player, value, validMoves);
                    scheduleTimeout(() => { if (gameActive && aiPlayers.includes(players[currentPlayerIndex])) moveToken(player, bestMove, value); }, 800);
                }
            } else {
                originalHandleRoll(value);
            }
        };

        function chooseBestMove(player, value, validMoves) {
            // Priority: capture > enter home > advance furthest > leave base
            let best = validMoves[0];
            let bestScore = -1000;
            validMoves.forEach(i => {
                let score = 0;
                const pos = tokens[player][i];
                const newPos = pos === -1 ? 0 : pos + value;
                // Entering home
                if (newPos === 56) score += 100;
                // Capture potential
                if (newPos >= 0 && newPos < 51) {
                    const gp = PLAYER_PATHS[player][newPos];
                    players.forEach(other => {
                        if (other === player) return;
                        for (let j = 0; j < 4; j++) {
                            const oPos = tokens[other][j];
                            if (oPos >= 0 && oPos < 51) {
                                const ogp = PLAYER_PATHS[other][oPos];
                                if (!SAFE_CELLS.includes(newPos) && !Object.values(START_CELLS).includes(newPos) && gp[0] === ogp[0] && gp[1] === ogp[1]) score += 50;
                            }
                        }
                    });
                    // Landing on safe
                    if (SAFE_CELLS.includes(newPos)) score += 10;
                }
                // Advance more = better
                score += newPos;
                // Leaving home
                if (pos === -1) score += 5;
                if (score > bestScore) {
                    bestScore = score;
                    best = i;
                }
            });
            return best;
        }

        // ============ MODALS ============
        document.getElementById('rulesBtn').addEventListener('click', () => rulesModal.classList.add('active'));
        document.getElementById('closeRules').addEventListener('click', () => rulesModal.classList.remove('active'));
        rulesModal.addEventListener('click', e => { if (e.target === rulesModal) rulesModal.classList.remove('active'); });
        const restartFromMaf = () => { if (typeof options.onRestart === 'function') options.onRestart(); };
        document.getElementById('newGameBtn').addEventListener('click', restartFromMaf);
        document.getElementById('playAgainBtn').addEventListener('click', restartFromMaf);

        // ============ BOARD CONTROLS ============
        let boardLocked = false;
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const lockBoardBtn = document.getElementById('lockBoardBtn');

        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen error:', err);
                });
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });

        lockBoardBtn.addEventListener('click', () => {
            boardLocked = !boardLocked;
            if (boardLocked) {
                lockBoardBtn.innerHTML = '<i class="fas fa-lock"></i>';
                lockBoardBtn.classList.add('active');
                if (controls) controls.enabled = false;
            } else {
                lockBoardBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
                lockBoardBtn.classList.remove('active');
                if (controls) controls.enabled = true;
            }
        });

        // Music toggle button
        document.getElementById('musicBtn').addEventListener('click', toggleBackgroundMusic);

        // ============ HELP MODAL ============
        const helpModal = document.getElementById('helpModal');
        const menuHelpBtn = document.getElementById('menuHelpBtn');
        const closeHelpBtn = document.getElementById('closeHelp');

        menuHelpBtn.addEventListener('click', () => {
            helpModal.classList.add('active');
        });

        closeHelpBtn.addEventListener('click', () => {
            helpModal.classList.remove('active');
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('active');
            }
        });
    
        // MAF_LUDO_STEP_3 : partie solo avec un bot (ou deux joueurs locaux).
        const colors = ['red', 'green', 'blue', 'yellow'];
        const humanColor = colors.includes(options.humanColor) ? options.humanColor : 'red';
        const opponentColor = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' }[humanColor];
        const isTraining = options.mode === 'training';
        gameMode = isTraining ? 'vscomputer' : 'passplay';
        playerCount = 2;
        selectedColors = [humanColor, opponentColor];
        players = [...selectedColors];
        aiPlayers = isTraining ? [opponentColor] : [];
        const localModeLabel = document.querySelector('.maf-ludo-local-mode');
        if (localModeLabel) localModeLabel.textContent = isTraining
          ? 'Entraînement · Toi contre le bot · sans mise'
          : isOnline ? 'Duel en ligne · tours validés par le serveur' : 'Partie locale · 2 joueurs · sans mise';
        menuOverlay.classList.add('hidden');
        colorSelection.classList.remove('active');
        initGame();
        function syncOnline(next) {
          if (!isOnline || !next || next.type !== 'ludo' || disposed) return;
          if (networkState?.version === next.version && networkState?.finished === next.finished) {
            // Ne pas desactiver la selection apres un poll serverNow identique.
            networkState = next;
            updateUI();
            if (!isRolling && next.viewer === next.toMove && next.roll != null &&
                Array.isArray(next.valid) && next.valid.length && !highlightedMeshes.length) {
              highlightTokens(players[currentPlayerIndex], next.valid);
            }
            return;
          }
          const old = networkState;
          // Le serveur peut donner un de sans mouvement possible (roll devient null).
          // Lire lastAction permet aussi d'animer ce lancer chez les deux joueurs.
          const serverRoll = /(?:host|guest) a obtenu ([1-6])(?:\b|\s)/.exec(next.lastAction || '');
          const animateRoll = old && Number(next.version) > Number(old.version) && !!serverRoll;
          networkState = next;
          currentPlayerIndex = next.toMove === 'host' ? 0 : 1;
          isRolling = false;
          const host = next.colors?.host || 'red';const guest = next.colors?.guest || 'yellow';
          // Les couleurs et positions sont exclusivement celles du serveur.
          const moving = [];
          for(const colorName of [host,guest]) {
            for(let i=0;i<4;i++) {
              const newPosition=next.tokens?.[colorName]?.[i];
              if(!Number.isInteger(newPosition)) continue;
              const previous=old?.tokens?.[colorName]?.[i];
              tokens[colorName][i]=newPosition;
              if(old && previous!==newPosition && newPosition>=0 && newPosition>previous) {
                moving.push({colorName,index:i,previous,newPosition});
              }
            }
          }
          function layoutOnline(excluded = new Set()) {
            const stacks = new Map();
            for(const col of [host,guest]) for(let i=0;i<4;i++) {
              const pos=tokens[col][i];
              if(!Number.isInteger(pos)) continue;
              const at=getPositionForStep(col,i,pos);
              const key=pos>=0 && pos<56 ? `${Math.round(at.x)}:${Math.round(at.z)}` : `${col}:${i}`;
              if(!stacks.has(key)) stacks.set(key, []);
              stacks.get(key).push({col,i,at});
            }
            for(const stack of stacks.values()) stack.forEach(({col,i,at},slot)=>{
              if(excluded.has(`${col}:${i}`)) return;
              const mesh=tokenMeshes[col][i];
              const offset=(slot-(stack.length-1)/2)*12;
              mesh.position.set(at.x+offset,mesh.position.y,at.z);
            });
          }
          const movingIds=new Set(moving.map(m=>`${m.colorName}:${m.index}`));
          layoutOnline(movingIds);
          moving.forEach(m=>animateTokenMove(m.colorName,m.index,m.previous,m.newPosition,()=>{
            movingIds.delete(`${m.colorName}:${m.index}`);
            layoutOnline(movingIds);
          }));
          clearHighlights();
          lastRoll=next.roll||0;
          updateUI();updateScoreboard();
          // La selection est etablie des la reception de l'etat autoritaire :
          // l'animation du de ne doit JAMAIS etre une condition pour activer un pion.
          if (next.viewer === next.toMove && next.roll != null &&
              Array.isArray(next.valid) && next.valid.length) {
            highlightTokens(players[currentPlayerIndex], next.valid);
          }
          if (animateRoll) { animateServerDice(Number(serverRoll[1]), next); return; }
          const mine=next.viewer===next.toMove;
          if(next.finished) {
            rollBtn.disabled=true;
            setMessage(next.winner===next.viewer?'Tu as gagné !':'Duel terminé.');
          } else if(mine && next.roll != null) {
            setMessage('Dé : '+next.roll+' · Choisis ton pion.');
          } else setMessage((next.lastAction||'')+' · '+(mine?'À toi de lancer le dé.':'Attends ton adversaire.'));
        }
        const cleanup = () => {
            if (disposed) return;
            disposed = true;
            gameActive = false;
            musicEnabled = false;
            stopBackgroundMusic();
            pendingTimers.forEach(id => window.clearTimeout(id));
            pendingTimers.clear();
            pendingFrames.forEach(id => window.cancelAnimationFrame(id));
            pendingFrames.clear();
            if (audioContext) audioContext.close().catch(() => {});
            if (controls) controls.dispose();
            if (scene) scene.traverse(object => {
              if (object.geometry) object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach(material => { if (material?.dispose) material.dispose(); });
            });
            if (renderer) {
              renderer.domElement.removeEventListener('click', onBoardClick);
              renderer.domElement.removeEventListener('pointerdown', trackPointerDown);
              renderer.domElement.removeEventListener('pointermove', trackPointerMove);
              renderer.dispose();
              renderer.forceContextLoss?.();
            }
            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('resize', resizeConfettiCanvas);
        };
        cleanup.sync = syncOnline;
        cleanup.refreshControls = () => { if (!disposed && isOnline && gameActive) updateUI(); };
        if (isOnline && options.initialState) syncOnline(options.initialState);
        return cleanup;

}
