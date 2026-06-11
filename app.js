// ==================== MAIN APPLICATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SmartQuiz Live starting...');
    
    init3DBackground();
    renderQuestionForm();
    setupUIListeners();
    showLandingPage();
    
    console.log('✅ App ready');
});

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
        const count = 1500;
        const positions = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i+1] = (Math.random() - 0.5) * 100;
            positions[i+2] = (Math.random() - 0.5) * 100;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({ color: 0x667eea, size: 0.2, transparent: true, opacity: 0.4 });
        const particleSys = new THREE.Points(particles, particleMat);
        scene.add(particleSys);
        
        // Floating spheres
        const sphereGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0x764ba2, emissive: 0x2d1b4e });
        const spheres = [];
        
        for (let i = 0; i < 60; i++) {
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 70);
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
        const backLight = new THREE.PointLight(0x667eea, 0.5);
        backLight.position.set(-5, 0, -10);
        scene.add(backLight);
        
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
            
            particleSys.rotation.y = time * 0.1;
            particleSys.rotation.x = Math.sin(time * 0.2) * 0.1;
            
            spheres.forEach((s, i) => {
                s.position.y += Math.sin(time + i) * 0.002;
                s.position.x += Math.cos(time * 0.5 + i) * 0.002;
                s.rotation.x += 0.01;
                s.rotation.y += 0.02;
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
        
        console.log('✨ 3D background ready');
    } catch (error) {
        console.error('3D error:', error);
    }
}