let scene, camera, renderer;
let starsGroup; // 3D group to hold all star meshes
let userLat, userLon;
let astronomicalData = { stars: [], lines: [], names: [] };

// DOM Elements
const permissionScreen = document.getElementById('permission-screen');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const arUiLayer = document.getElementById('ar-ui-layer');

// 1. Load Astronomical Data
async function loadData() {
    try {
        statusText.innerText = "Downloading Star Catalogs...";
        const [starsRes, linesRes, namesRes] = await Promise.all([
            fetch('./data/stars.6.json').then(r => r.json()),
            fetch('./data/constellations.lines.json').then(r => r.json()),
            fetch('./data/starnames.json').then(r => r.json())
        ]);
        astronomicalData.stars = starsRes.features;
        astronomicalData.lines = linesRes;
        astronomicalData.names = namesRes;
        statusText.innerText = "Star data loaded successfully!";
        startBtn.style.display = 'block';
    } catch (err) {
        statusText.innerText = "Error loading star data. Check connection.";
        console.error(err);
    }
}

// 2. Initialize Three.js Scene
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.zIndex = '2';
    document.getElementById('camera-container').appendChild(renderer.domElement);

    starsGroup = new THREE.Group();
    scene.add(starsGroup);

    // Add ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Create Star Sprites
    const starGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    let starCount = 0;
    astronomicalData.stars.forEach(feature => {
        // D3-Celestial uses RA/Dec in degrees in its geometry coordinates
        const ra = feature.geometry.coordinates[0];
        const dec = feature.geometry.coordinates[1];
        
        // Convert to Vector3 for our sky dome (Radius 100)
        const phi = (90 - dec) * Math.PI / 180;
        const theta = ra * Math.PI / 180;
        
        const x = 100 * Math.sin(phi) * Math.cos(theta);
        const y = 100 * Math.cos(phi);
        const z = 100 * Math.sin(phi) * Math.sin(theta);

        const star = new THREE.Mesh(starGeometry, starMaterial.clone());
        star.position.set(x, y, z);
        starsGroup.add(star);
        starCount++;
    });

    document.getElementById('star-count').innerText = starCount;
    
    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// 3. Handle Device Orientation (Compass/Gyroscope)
function handleOrientation(event) {
    // event.alpha = Compass direction (0 to 360)
    // event.beta = Front-back tilt (-180 to 180)
    // event.gamma = Left-right tilt (-90 to 90)
    
    if (userLat === undefined) return; // Wait for GPS

    // Rotate the star map to match device orientation
    // Note: This is a simplified V1 rotation mapping for testing.
    // Full astronomical alignment requires complex quaternion math which we will refine.
    starsGroup.rotation.y = THREE.Math.degToRad(event.alpha);
    starsGroup.rotation.x = THREE.Math.degToRad(event.beta);
    starsGroup.rotation.z = THREE.Math.degToRad(event.gamma);

    document.getElementById('orientation-status').classList.add('tracking-active');
    document.getElementById('hud-text').innerText = "TRACKING SKY";
}

// 4. Start App Flow
async function startApp() {
    startBtn.style.display = 'none';
    statusText.innerText = "Requesting GPS Location...";

    // Request Geolocation
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLat = pos.coords.latitude;
            userLon = pos.coords.longitude;
            document.getElementById('gps-status').innerText = "ON";
            document.getElementById('gps-status').style.color = "var(--accent-green)";
            statusText.innerText = "Requesting Motion Sensors...";

            // Request Device Orientation (iOS 13+ requires explicit permission)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                            launchAR();
                        }
                    })
                    .catch(console.error);
            } else {
                // Android / Older iOS
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                window.addEventListener('deviceorientation', handleOrientation, true);
                launchAR();
            }
        },
        (err) => {
            statusText.innerText = "GPS Permission Denied. Please enable.";
        },
        { enableHighAccuracy: true }
    );
}

function launchAR() {
    permissionScreen.style.display = 'none';
    arUiLayer.style.display = 'block';
    initThreeJS();
}

// Event Listeners
startBtn.addEventListener('click', startApp);

// Initialize
loadData();
