/**
 * Scene.jsx — Cursor-magnetic 3D scene.
 * Wireframe geo + glassmorphism-tinted colors, smooth cursor tracking.
 */
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const cursor = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };

function Tracker() {
    useEffect(() => {
        const h = (e) => {
            cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
            cursor.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', h);
        return () => window.removeEventListener('mousemove', h);
    }, []);
    return null;
}

function Shape({ position, geo, color, speed, dir, pull }) {
    const mesh = useRef();
    useFrame(({ clock }) => {
        if (!mesh.current) return;
        smooth.x += (cursor.x - smooth.x) * 0.045;
        smooth.y += (cursor.y - smooth.y) * 0.045;
        const t = clock.getElapsedTime() * speed;
        mesh.current.position.y = position[1] + Math.sin(t) * 0.3;
        mesh.current.position.x = position[0] + smooth.x * pull;
        mesh.current.position.z = position[2] + smooth.y * pull * 0.6;
        mesh.current.rotation.x += 0.003 * dir + smooth.y * 0.012;
        mesh.current.rotation.y += 0.005 * dir + smooth.x * 0.012;
    });
    return (
        <mesh ref={mesh} position={position} geometry={geo}>
            <meshStandardMaterial
                color={color} wireframe transparent opacity={0.4}
                emissive={color} emissiveIntensity={0.1}
            />
        </mesh>
    );
}

function CursorLight() {
    const l = useRef();
    useFrame(() => {
        if (!l.current) return;
        l.current.position.x += (smooth.x * 7 - l.current.position.x) * 0.06;
        l.current.position.y += (smooth.y * 5 - l.current.position.y) * 0.06;
    });
    return <pointLight ref={l} position={[0, 0, 5]} intensity={2.5} color="#FFE135" distance={14} />;
}

const makeGeo = (type) => {
    switch (type) {
        case 'box': return new THREE.BoxGeometry(1.1, 1.1, 1.1);
        case 'torus': return new THREE.TorusGeometry(0.65, 0.2, 8, 22);
        case 'oct': return new THREE.OctahedronGeometry(0.9, 0);
        case 'tet': return new THREE.TetrahedronGeometry(0.9, 0);
        case 'ico': return new THREE.IcosahedronGeometry(0.8, 0);
        default: return new THREE.BoxGeometry(1, 1, 1);
    }
};

const SHAPES = [
    { position: [-4.5, 1, -5], type: 'box', color: '#FFE135', speed: 0.5, dir: 1, pull: 0.9 },
    { position: [4.5, 0, -6], type: 'torus', color: '#39FF14', speed: 0.6, dir: -1, pull: 1.1 },
    { position: [-2, -1, -8], type: 'oct', color: '#ede8de', speed: 0.38, dir: 1, pull: 0.7 },
    { position: [3.5, 2, -9], type: 'tet', color: '#FFE135', speed: 0.68, dir: -1, pull: 1.3 },
    { position: [0, 3, -10], type: 'ico', color: '#39FF14', speed: 0.33, dir: 1, pull: 0.6 },
    { position: [-5.5, -2, -7], type: 'torus', color: '#ede8de', speed: 0.52, dir: -1, pull: 1.0 },
    { position: [6, -1, -8], type: 'box', color: '#39FF14', speed: 0.44, dir: 1, pull: 0.8 },
];

export default function Scene({ className = '' }) {
    const geos = useMemo(() => SHAPES.map(s => makeGeo(s.type)), []);
    return (
        <div className={className} style={{ pointerEvents: 'none' }}>
            <Tracker />
            <Canvas camera={{ position: [0, 0, 7], fov: 58 }} style={{ background: 'transparent' }} dpr={[1, 1.5]}>
                <ambientLight intensity={0.2} />
                <pointLight position={[-6, 5, 4]} intensity={1} color="#39FF14" distance={22} />
                <CursorLight />
                <gridHelper args={[40, 22, '#FFE13520', '#1a1a1a']} position={[0, -5.5, -5]} />
                {SHAPES.map((s, i) => (
                    <Shape key={i} {...s} geo={geos[i]} />
                ))}
            </Canvas>
        </div>
    );
}
