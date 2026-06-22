import React, { useEffect } from 'react';
import * as THREE from 'three';

export default function ParticleBackground({ canvasRef }) {
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#020203", 0.025);
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 20;
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const geometry = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorSeed = new THREE.Color("#f5f2eb");
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      
      const clr = colorSeed.clone().multiplyScalar(0.2 + Math.random() * 0.4);
      colors[i * 3] = clr.r;
      colors[i * 3 + 1] = clr.g;
      colors[i * 3 + 2] = clr.b;
    }
    
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    
    let animationFrameId;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      points.rotation.y = elapsedTime * 0.008;
      points.rotation.x = elapsedTime * 0.004;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      camera.aspect = canvas.parentElement.clientWidth / canvas.parentElement.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [canvasRef]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-45">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
