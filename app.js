// ==================== MAIN APPLICATION ====================
document.addEventListener('DOMContentLoaded', () => {
    init3DBackground();
    renderQuestionForm();
    setupEventListeners();
    restoreSession();
});

function setupEventListeners() {
    document.getElementById('joinGameBtn')?.addEventListener('click', joinGame);
    document.getElementById('hostGameBtn')?.addEventListener('click', hostNewGame);
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('endGameBtn')?.addEventListener('click', endGame);
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestion);
    document.getElementById('addSampleBtn')?.addEventListener('click', addSampleQuestions);
    document.getElementById('clearAllQuestionsBtn')?.addEventListener('click', clearAllQuestions);
    document.getElementById('previewQuestionsBtn')?.addEventListener('click', previewQuestions);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeModalFooterBtn')?.addEventListener('click', closeModal);
    document.getElementById('questionTypeSelect')?.addEventListener('change', renderQuestionForm);
}

// ==================== 3D BACKGROUND ====================
function init3DBackground() {
    const container = document.getElementById('three-bg');
    if (!container) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 200;
        posArray[i + 1] = (Math.random() - 0.5) * 100;
        posArray[i + 2] = (Math.random() - 0.5) * 100;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({ size: 0.2, color: 0x667eea, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x764ba2, emissive: 0x2d1b4e, roughness: 0.3 });
    const spheres = [];
    
    for (let i = 0; i < 80; i++) {
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60);
        sphere.scale.setScalar(Math.random() * 1.5 + 0.5);
        scene.add(sphere);
        spheres.push(sphere);
    }
    
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    
    camera.position.z = 35;
    camera.position.y = 5;
    
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    
    let time = 0;
    
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        
        particles.rotation.y = time * 0.1;
        particles.rotation.x = Math.sin(time * 0.2) * 0.1;
        
        spheres.forEach((sphere, i) => {
            sphere.position.y += Math.sin(time + i) * 0.002;
            sphere.position.x += Math.cos(time * 0.5 + i) * 0.002;
        });
        
        camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}