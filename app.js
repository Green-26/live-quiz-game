// ==================== 3D ANIMATED BACKGROUND ====================
function init3DBackground() {
    const container = document.getElementById('three-bg');
    if (!container) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const posArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 200;
        posArray[i + 1] = (Math.random() - 0.5) * 100;
        posArray[i + 2] = (Math.random() - 0.5) * 100 - 50;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x667eea,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    
    // Create floating spheres
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0x764ba2,
        emissive: 0x2d1b4e,
        roughness: 0.3,
        metalness: 0.7
    });
    
    const spheres = [];
    for (let i = 0; i < 50; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.x = (Math.random() - 0.5) * 80;
        sphere.position.y = (Math.random() - 0.5) * 50;
        sphere.position.z = (Math.random() - 0.5) * 60 - 30;
        sphere.scale.setScalar(Math.random() * 1.5 + 0.5);
        scene.add(sphere);
        spheres.push(sphere);
    }
    
    // Create floating rings/toruses
    const torusGeometry = new THREE.TorusGeometry(1, 0.1, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({
        color: 0x4facfe,
        emissive: 0x1a4a8a,
        roughness: 0.2,
        metalness: 0.8
    });
    
    const toruses = [];
    for (let i = 0; i < 30; i++) {
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        torus.position.x = (Math.random() - 0.5) * 70;
        torus.position.y = (Math.random() - 0.5) * 45;
        torus.position.z = (Math.random() - 0.5) * 55 - 25;
        torus.scale.setScalar(Math.random() * 1.2 + 0.3);
        torus.rotation.x = Math.random() * Math.PI * 2;
        torus.rotation.y = Math.random() * Math.PI * 2;
        scene.add(torus);
        toruses.push(torus);
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    const pointLight1 = new THREE.PointLight(0x667eea, 0.5);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x764ba2, 0.5);
    pointLight2.position.set(-5, 3, 5);
    scene.add(pointLight2);
    
    camera.position.z = 30;
    camera.position.y = 5;
    
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    });
    
    let time = 0;
    
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        
        particlesMesh.rotation.y = time * 0.1;
        particlesMesh.rotation.x = Math.sin(time * 0.2) * 0.1;
        
        spheres.forEach((sphere, i) => {
            sphere.position.y += Math.sin(time + i) * 0.003;
            sphere.position.x += Math.cos(time * 0.5 + i) * 0.002;
            sphere.rotation.x += 0.01;
            sphere.rotation.y += 0.02;
        });
        
        toruses.forEach((torus, i) => {
            torus.rotation.x += 0.01;
            torus.rotation.y += 0.015;
            torus.rotation.z += 0.005;
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

// Initialize 3D background when page loads
document.addEventListener('DOMContentLoaded', () => {
    init3DBackground();
});