// ==================== 3D NEURAL NETWORK BACKGROUND ====================

function init3D() {
    const canvas = document.getElementById('networkCanvas');
    if (!canvas) return;

    try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        scene.fog = new THREE.FogExp2(0x050510, 0.0004);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 0, 20);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Earth sphere
        const earthGeo = new THREE.SphereGeometry(4, 128, 128);
        const earthMat = new THREE.MeshStandardMaterial({
            color: 0x1a3a6a,
            emissive: 0x0a1a3a,
            emissiveIntensity: 0.5,
            metalness: 0.4,
            roughness: 0.4
        });
        const earth = new THREE.Mesh(earthGeo, earthMat);
        scene.add(earth);

        // Atmosphere glow
        const atmosGeo = new THREE.SphereGeometry(4.3, 64, 64);
        const atmosMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
        scene.add(atmosphere);

        // Inner core glow
        const coreGeo = new THREE.SphereGeometry(3.5, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xff44aa,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending
        });
        const coreGlow = new THREE.Mesh(coreGeo, coreMat);
        scene.add(coreGlow);

        // Particles
        const particleCount = 4000;
        const particlesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const r = 6 + Math.random() * 12;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
            positions[i*3+2] = r * Math.cos(phi);

            const hue = 0.5 + Math.random() * 0.4;
            const color = new THREE.Color().setHSL(hue, 0.9, 0.55);
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        const particles = new THREE.Points(particlesGeo, particleMat);
        scene.add(particles);

        // Connecting lines
        const linePositions = [];
        for (let i = 0; i < 5000; i++) {
            const i1 = Math.floor(Math.random() * particleCount);
            const i2 = Math.floor(Math.random() * particleCount);
            if (i1 !== i2) {
                const dx = positions[i1*3] - positions[i2*3];
                const dy = positions[i1*3+1] - positions[i2*3+1];
                const dz = positions[i1*3+2] - positions[i2*3+2];
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                if (dist < 8) {
                    linePositions.push(positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
                    linePositions.push(positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
                }
            }
        }
        const linesGeo = new THREE.BufferGeometry();
        linesGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
        const linesMat = new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0.12,
            color: 0x4488ff
        });
        const lines = new THREE.LineSegments(linesGeo, linesMat);
        scene.add(lines);

        // Data pulse particles
        const pulseCount = 150;
        const pulses = [];
        const pulseGeo = new THREE.SphereGeometry(0.08, 8, 8);

        for (let i = 0; i < pulseCount; i++) {
            const pulseMat = new THREE.MeshBasicMaterial({
                color: 0xffaa44,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            const pulse = new THREE.Mesh(pulseGeo, pulseMat);
            const startIdx = Math.floor(Math.random() * particleCount);
            let endIdx = Math.floor(Math.random() * particleCount);
            while (endIdx === startIdx) endIdx = Math.floor(Math.random() * particleCount);

            pulse.userData = {
                startIdx, endIdx,
                progress: Math.random(),
                speed: 0.002 + Math.random() * 0.005
            };
            pulse.position.set(positions[startIdx*3], positions[startIdx*3+1], positions[startIdx*3+2]);
            scene.add(pulse);
            pulses.push(pulse);
        }

        // Rings
        const ringGeo1 = new THREE.TorusGeometry(6, 0.06, 32, 200);
        const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x6644aa, transparent: true, opacity: 0.3 });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 2;
        scene.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(8, 0.04, 32, 200);
        const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xaa66cc, transparent: true, opacity: 0.2 });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.x = Math.PI / 2 + 0.3;
        ring2.rotation.z = 0.2;
        scene.add(ring2);

        // Lights
        const ambient = new THREE.AmbientLight(0x111122, 0.8);
        scene.add(ambient);
        const light1 = new THREE.PointLight(0x4488ff, 1, 100);
        light1.position.set(5, 5, 8);
        scene.add(light1);
        const light2 = new THREE.PointLight(0xff44aa, 0.6, 100);
        light2.position.set(-5, 3, -8);
        scene.add(light2);
        const light3 = new THREE.PointLight(0x44ffaa, 0.4, 100);
        light3.position.set(0, -5, 5);
        scene.add(light3);

        // Mouse interaction
        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        let time = 0;

        function animate() {
            requestAnimationFrame(animate);
            time += 0.008;

            // Earth rotation
            earth.rotation.y = time * 0.08;
            atmosphere.rotation.y = time * 0.08;
            coreGlow.rotation.y = time * 0.05;

            // Core pulse
            coreMat.opacity = 0.04 + Math.sin(time * 3) * 0.02;

            // Particles rotation
            particles.rotation.y = time * 0.04;
            particles.rotation.x = Math.sin(time * 0.15) * 0.15;
            lines.rotation.y = time * 0.03;

            // Rings rotation
            ring1.rotation.z = time * 0.03;
            ring2.rotation.z = -time * 0.02;

            // Camera movement based on mouse
            camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
            camera.position.y += (mouseY * 2 - camera.position.y) * 0.02;
            camera.lookAt(0, 0, 0);

            // Update data pulses
            pulses.forEach(pulse => {
                pulse.userData.progress += pulse.userData.speed;
                if (pulse.userData.progress >= 1) {
                    pulse.userData.progress = 0;
                    pulse.userData.startIdx = Math.floor(Math.random() * particleCount);
                    pulse.userData.endIdx = Math.floor(Math.random() * particleCount);
                }
                const s = pulse.userData.startIdx;
                const e = pulse.userData.endIdx;
                const t = pulse.userData.progress;
                pulse.position.x = positions[s*3] + (positions[e*3] - positions[s*3]) * t;
                pulse.position.y = positions[s*3+1] + (positions[e*3+1] - positions[s*3+1]) * t;
                pulse.position.z = positions[s*3+2] + (positions[e*3+2] - positions[s*3+2]) * t;
                pulse.material.opacity = 0.5 + Math.sin(t * Math.PI) * 0.5;
            });

            // Pulsing line opacity
            linesMat.opacity = 0.08 + Math.sin(time * 2) * 0.04;

            renderer.render(scene, camera);
        }

        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        console.log('✅ 3D Neural Background initialized');
    } catch (e) {
        console.error('3D init error:', e);
        canvas.style.background = 'radial-gradient(ellipse at center, #0a0a2e 0%, #050510 100%)';
    }
}
