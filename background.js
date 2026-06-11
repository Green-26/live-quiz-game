// ==================== NEURAL NETWORK 3D BACKGROUND ====================
// Breathtaking volumetric visualization of a colossal sentient global neural network

const canvas = document.getElementById('network-bg');
if (canvas) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.0008);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // ==================== LIGHTING ====================
    const ambientLight = new THREE.AmbientLight(0x111122);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);
    
    const backLight = new THREE.PointLight(0x4466ff, 0.5);
    backLight.position.set(-5, 0, -10);
    scene.add(backLight);
    
    const coreLight = new THREE.PointLight(0xff44aa, 0.8);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    
    const fillLight = new THREE.PointLight(0x44ffaa, 0.4);
    fillLight.position.set(3, 2, 4);
    scene.add(fillLight);

    // ==================== CORE EARTH (Active Data Hub) ====================
    const earthGeometry = new THREE.SphereGeometry(2.2, 128, 128);
    
    // Earth texture with glow
    const earthTexture = (() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Base ocean color
        ctx.fillStyle = '#0a2a4a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Continents (simplified)
        ctx.fillStyle = '#4a9e6e';
        // North America
        ctx.beginPath();
        ctx.moveTo(150, 200);
        ctx.bezierCurveTo(200, 150, 280, 160, 300, 220);
        ctx.bezierCurveTo(310, 270, 280, 320, 230, 310);
        ctx.bezierCurveTo(180, 300, 140, 260, 150, 200);
        ctx.fill();
        
        // South America
        ctx.beginPath();
        ctx.moveTo(280, 400);
        ctx.bezierCurveTo(310, 430, 300, 500, 270, 550);
        ctx.bezierCurveTo(240, 570, 220, 520, 240, 470);
        ctx.bezierCurveTo(250, 440, 260, 410, 280, 400);
        ctx.fill();
        
        // Europe/Asia
        ctx.beginPath();
        ctx.moveTo(550, 180);
        ctx.bezierCurveTo(600, 160, 700, 170, 780, 200);
        ctx.bezierCurveTo(800, 250, 780, 320, 720, 340);
        ctx.bezierCurveTo(660, 350, 580, 320, 550, 280);
        ctx.bezierCurveTo(520, 240, 520, 200, 550, 180);
        ctx.fill();
        
        // Africa
        ctx.beginPath();
        ctx.moveTo(560, 380);
        ctx.bezierCurveTo(600, 370, 650, 400, 660, 460);
        ctx.bezierCurveTo(650, 520, 600, 560, 560, 530);
        ctx.bezierCurveTo(520, 500, 510, 430, 560, 380);
        ctx.fill();
        
        // Australia
        ctx.beginPath();
        ctx.moveTo(780, 550);
        ctx.bezierCurveTo(810, 540, 840, 560, 830, 590);
        ctx.bezierCurveTo(810, 620, 770, 610, 770, 580);
        ctx.bezierCurveTo(770, 560, 770, 555, 780, 550);
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    })();
    
    const earthMaterial = new THREE.MeshStandardMaterial({
        map: earthTexture,
        emissive: 0x2244aa,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.5,
        color: 0x88aaff
    });
    
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Glowing atmosphere around Earth
    const atmosGeometry = new THREE.SphereGeometry(2.35, 64, 64);
    const atmosMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosGeometry, atmosMaterial);
    scene.add(atmosphere);
    
    // Core energy pulse (inner glow)
    const coreGlowGeometry = new THREE.SphereGeometry(1.8, 32, 32);
    const coreGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff66cc,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    const coreGlow = new THREE.Mesh(coreGlowGeometry, coreGlowMaterial);
    scene.add(coreGlow);

    // ==================== NEURAL NETWORK NODES ====================
    const nodeCount = 1800;
    const nodePositions = [];
    const nodeColors = [];
    const nodeSizes = [];
    
    const nodeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    
    for (let i = 0; i < nodeCount; i++) {
        // Spherical distribution around the earth
        const radius = 4.5 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta) * 0.8;
        const z = radius * Math.cos(phi);
        
        nodePositions.push({ x, y, z, radius, theta, phi, originalRadius: radius });
        
        // Color based on position and random (cyan, amber, gold, violet)
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.35) color = new THREE.Color(0x00ffff); // Cyan
        else if (colorChoice < 0.6) color = new THREE.Color(0xffaa44); // Amber
        else if (colorChoice < 0.8) color = new THREE.Color(0xffdd88); // Gold
        else color = new THREE.Color(0xaa44ff); // Violet
        
        nodeColors.push(color);
        nodeSizes.push(0.06 + Math.random() * 0.08);
        
        const nodeMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4 + Math.random() * 0.3,
            metalness: 0.7,
            roughness: 0.2
        });
        
        const node = new THREE.Mesh(nodeGeometry, nodeMat);
        node.position.set(x, y, z);
        node.userData = { originalScale: nodeSizes[i], pulsePhase: Math.random() * Math.PI * 2 };
        scene.add(node);
    }
    
    // ==================== CONNECTING LINES (Neural Links) ====================
    const lineCount = 4200;
    const lineVertices = [];
    const lineColors = [];
    
    for (let i = 0; i < lineCount; i++) {
        const idx1 = Math.floor(Math.random() * nodePositions.length);
        let idx2 = Math.floor(Math.random() * nodePositions.length);
        while (idx2 === idx1) idx2 = Math.floor(Math.random() * nodePositions.length);
        
        const p1 = nodePositions[idx1];
        const p2 = nodePositions[idx2];
        
        // Only connect nodes within reasonable distance
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        if (dist < 6 && dist > 1.5) {
            lineVertices.push(p1.x, p1.y, p1.z);
            lineVertices.push(p2.x, p2.y, p2.z);
            
            const mixColor = nodeColors[idx1].clone().lerp(nodeColors[idx2], 0.5);
            lineColors.push(mixColor.r, mixColor.g, mixColor.b);
            lineColors.push(mixColor.r, mixColor.g, mixColor.b);
        }
    }
    
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineVertices), 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lineColors), 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    
    // ==================== DATA PULSE PARTICLES (Tracer lights) ====================
    const pulseCount = 300;
    const pulses = [];
    
    const pulseGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    
    for (let i = 0; i < pulseCount; i++) {
        const startNode = Math.floor(Math.random() * nodePositions.length);
        let endNode = Math.floor(Math.random() * nodePositions.length);
        while (endNode === startNode) endNode = Math.floor(Math.random() * nodePositions.length);
        
        const pulseMat = new THREE.MeshStandardMaterial({
            color: 0xffaa66,
            emissive: 0xff8844,
            emissiveIntensity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const pulse = new THREE.Mesh(pulseGeometry, pulseMat);
        pulse.userData = {
            startIdx: startNode,
            endIdx: endNode,
            progress: Math.random(),
            speed: 0.003 + Math.random() * 0.007,
            color: new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 1, 0.6)
        };
        
        scene.add(pulse);
        pulses.push(pulse);
    }
    
    // ==================== COSMIC DUST MOTES ====================
    const dustCount = 4000;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    
    for (let i = 0; i < dustCount; i++) {
        dustPositions[i*3] = (Math.random() - 0.5) * 120;
        dustPositions[i*3+1] = (Math.random() - 0.5) * 80;
        dustPositions[i*3+2] = (Math.random() - 0.5) * 100 - 30;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
        color: 0x8866aa,
        size: 0.04,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);
    
    // ==================== NEBULA RINGS ====================
    const ringGeometry = new THREE.TorusGeometry(7, 0.08, 64, 300);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x6644aa,
        emissive: 0x442266,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = 0.3;
    scene.add(ring);
    
    const ring2Geometry = new THREE.TorusGeometry(9, 0.06, 64, 300);
    const ring2Material = new THREE.MeshStandardMaterial({
        color: 0xaa66cc,
        emissive: 0x663399,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.3
    });
    const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
    ring2.rotation.x = Math.PI / 2 + 0.2;
    ring2.rotation.z = -0.2;
    scene.add(ring2);
    
    // ==================== ANIMATION VARIABLES ====================
    let time = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;
    let currentRotY = 0;
    let currentRotX = 0;
    
    document.addEventListener('mousemove', (e) => {
        targetRotationY = (e.clientX / window.innerWidth - 0.5) * 0.5;
        targetRotationX = (e.clientY / window.innerHeight - 0.5) * 0.3;
    });
    
    // ==================== ANIMATION LOOP ====================
    function animate() {
        requestAnimationFrame(animate);
        time += 0.008;
        
        // Smooth camera rotation based on mouse
        currentRotY += (targetRotationY - currentRotY) * 0.05;
        currentRotX += (targetRotationX - currentRotX) * 0.05;
        
        camera.position.x = currentRotY * 8;
        camera.position.y = 15 + currentRotX * 5;
        camera.lookAt(0, 0, 0);
        
        // Rotate earth and atmosphere
        earth.rotation.y = time * 0.1;
        earth.rotation.x = Math.sin(time * 0.2) * 0.05;
        atmosphere.rotation.y = time * 0.1;
        coreGlow.rotation.y = time * 0.05;
        
        // Pulse core glow
        const pulseIntensity = 0.5 + Math.sin(time * 3) * 0.2;
        coreGlowMaterial.opacity = 0.2 + Math.sin(time * 4) * 0.15;
        coreLight.intensity = 0.6 + Math.sin(time * 2.5) * 0.3;
        
        // Rotate rings
        ring.rotation.z = time * 0.05;
        ring2.rotation.z = -time * 0.03;
        
        // Rotate dust and particles
        dust.rotation.y = time * 0.02;
        dust.rotation.x = Math.sin(time * 0.1) * 0.1;
        
        // Animate lines (pulsing opacity)
        lineMaterial.opacity = 0.3 + Math.sin(time * 1.5) * 0.1;
        
        // Update data pulses
        pulses.forEach(pulse => {
            pulse.userData.progress += pulse.userData.speed;
            
            if (pulse.userData.progress >= 1) {
                pulse.userData.progress = 0;
                pulse.userData.startIdx = Math.floor(Math.random() * nodePositions.length);
                pulse.userData.endIdx = Math.floor(Math.random() * nodePositions.length);
            }
            
            const start = nodePositions[pulse.userData.startIdx];
            const end = nodePositions[pulse.userData.endIdx];
            
            if (start && end) {
                const t = pulse.userData.progress;
                const x = start.x + (end.x - start.x) * t;
                const y = start.y + (end.y - start.y) * t;
                const z = start.z + (end.z - start.z) * t;
                
                pulse.position.set(x, y, z);
                
                // Pulse color based on progress
                const intensity = 0.8 + Math.sin(t * Math.PI) * 0.5;
                pulse.material.emissiveIntensity = intensity;
                pulse.material.color.setHSL(0.55 + t * 0.2, 1, 0.6);
            }
        });
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    console.log('🌐 Neural Network Background Loaded');
}