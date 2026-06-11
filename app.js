// ==================== MAIN APP ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('App starting...');
    init3DBackground();
    renderQuestionForm();
    setupEventListeners();
    restoreSession();
});

function setupEventListeners() {
    // Auth buttons
    document.getElementById('joinGameBtn')?.addEventListener('click', joinGame);
    document.getElementById('hostGameBtn')?.addEventListener('click', hostNewGame);
    
    // Host buttons
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestion);
    document.getElementById('addSampleBtn')?.addEventListener('click', addSampleQuestions);
    document.getElementById('clearQuestionsBtn')?.addEventListener('click', clearAllQuestions);
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('endGameBtn')?.addEventListener('click', endGame);
    document.getElementById('previewBtn')?.addEventListener('click', previewQuestions);
    document.getElementById('questionType')?.addEventListener('change', renderQuestionForm);
    
    // Modal
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    
    // Enter key
    document.getElementById('gamePinInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    document.getElementById('playerNameInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    
    console.log('Event listeners attached');
}

// ==================== 3D BACKGROUND ====================
function init3DBackground() {
    const container = document.getElementById('three-bg');
    if (!container) return;
    
    try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);
        
        // Particles
        const particles = new THREE.BufferGeometry();
        const count = 1000;
        const positions = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i+1] = (Math.random() - 0.5) * 100;
            positions[i+2] = (Math.random() - 0.5) * 100;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({ color: 0x667eea, size: 0.2, transparent: true, opacity: 0.5 });
        const particleSys = new THREE.Points(particles, particleMat);
        scene.add(particleSys);
        
        // Spheres
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0x764ba2, emissive: 0x2d1b4e });
        const spheres = [];
        
        for (let i = 0; i < 50; i++) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60);
            sphere.scale.setScalar(Math.random() * 1.5 + 0.5);
            scene.add(sphere);
            spheres.push(sphere);
        }
        
        // Lights
        const ambient = new THREE.AmbientLight(0x404060);
        scene.add(ambient);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 10, 7);
        scene.add(light);
        
        camera.position.z = 30;
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
            
            particleSys.rotation.y = time * 0.1;
            particleSys.rotation.x = Math.sin(time * 0.2) * 0.1;
            
            spheres.forEach((s, i) => {
                s.position.y += Math.sin(time + i) * 0.002;
                s.position.x += Math.cos(time * 0.5 + i) * 0.002;
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
        
        console.log('3D background ready');
    } catch (error) {
        console.error('3D error:', error);
    }
}