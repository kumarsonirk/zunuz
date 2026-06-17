import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Menu, 
  ShoppingBag, 
  User, 
  ArrowRight, 
  ChevronRight,
  Sparkles,
  Heart,
  X
} from 'lucide-react';
import * as THREE from 'three';

// Synthesizer Engine for Shutter Audio Effects
class SynthController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTick() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.03);
      
      gain.gain.setValueAtTime(0.008, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  playCameraShutter(pitchMultiplier = 1.0) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const noise = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(230 * pitchMultiplier, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.08);

      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(9000 * pitchMultiplier, this.ctx.currentTime);
      noise.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.09);
      
      osc.connect(gain);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      noise.start();
      osc.stop(this.ctx.currentTime + 0.11);
      noise.stop(this.ctx.currentTime + 0.11);
    } catch (e) {}
  }

  playFinalClank() {
    if (this.muted) return;
    this.init();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.06); // E5
      
      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.45);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.5);
      osc2.stop(this.ctx.currentTime + 0.5);
    } catch (e) {}
  }

  playSplitOpen() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.8);
      
      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.85);
    } catch (e) {}
  }
}

const synth = new SynthController();

// 8 Curated High Contrast Editorial Portraits
const PORTRAITS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop"  
];

// Lookbook items specifically matching the layout from image_45d546.png
const LOOKBOOK_ITEMS = [
  {
    id: 'core',
    title: "CORE",
    image: "/core_bg.png",
  },
  {
    id: 'trending',
    title: "TRENDING",
    image: "/trending_bg.png",
  },
  {
    id: 'complete-vibe',
    title: "COMPLETE VIBE",
    image: "/vibe_bg.png",
  
  }
];

// Presets for dynamic camera rotations (1st tilted, 2nd straight, then shifting progressively)
const PORTRAIT_ROTATIONS = [
  "rotate(3.5deg) scale(1.02)",   
  "rotate(0deg) scale(1)",        
  "rotate(-2.5deg) scale(1.01)",  
  "rotate(2deg) scale(1.02)",     
  "rotate(-1.5deg) scale(1.01)",  
  "rotate(2.8deg) scale(1.03)",   
  "rotate(-0.8deg) scale(1)",     
  "rotate(0deg) scale(1)"         
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  
  // Cinematic states
  const [introActive, setIntroActive] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentDelay, setCurrentDelay] = useState(180); 
  const [showText, setShowText] = useState(false);
  const [isSlidIn, setIsSlidIn] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  
  // Automated Unified Reveal States
  const [slideCurtainUp, setSlideCurtainUp] = useState(false);
  const [revealPlatform, setRevealPlatform] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
  }, []);

  // Sync mute values with Synth controller
  useEffect(() => {
    synth.muted = muted;
  }, [muted]);

  // Preload portraits & lookbook cards into browser cache to ensure fluid presentation
  useEffect(() => {
    [...PORTRAITS, ...LOOKBOOK_ITEMS.map(item => item.image)].forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Mathematically paced Loading Counter Progression (0% -> 25% -> 50% -> 100%)
  useEffect(() => {
    let timerId;
    
    const runProgression = (currentVal) => {
      if (currentVal >= 100) {
        // Lingering pause on the complete 100% circle
        timerId = setTimeout(() => {
          initiateIntroSequence();
        }, 900);
        return;
      }

      let jump = 1;
      let delay = 50;

      // Custom curve pacing to guarantee stopping and pausing on 25% and 50%
      if (currentVal < 25) {
        jump = Math.floor(Math.random() * 3) + 2; 
        if (currentVal + jump >= 25) {
          jump = 25 - currentVal; 
        }
        delay = 80; 
      } else if (currentVal === 25) {
        jump = 1; 
        delay = 900; 
      } else if (currentVal < 50) {
        jump = Math.floor(Math.random() * 4) + 2; 
        if (currentVal + jump >= 50) {
          jump = 50 - currentVal; 
        }
        delay = 70;
      } else if (currentVal === 50) {
        jump = 1; 
        delay = 900; 
      } else {
        jump = Math.floor(Math.random() * 6) + 4; 
        if (currentVal + jump >= 100) {
          jump = 100 - currentVal; 
        }
        delay = 45;
      }

      const nextVal = currentVal + jump;

      timerId = setTimeout(() => {
        setProgress(nextVal);
        synth.playTick();
        runProgression(nextVal);
      }, delay);
    };

    runProgression(0);

    return () => {
      clearTimeout(timerId);
    };
  }, []);

  // Step 1: Transitions from loading screen to accelerating flips instantly
  const initiateIntroSequence = () => {
    setIntroActive(true);
    setTimeout(() => {
      setIsSlidIn(true);
      setTimeout(() => {
        triggerAcceleratingFlipping();
      }, 250);
    }, 100);
  };

  // Step 2: Exponentially Accelerating Mechanical Flipping Loop
  const triggerAcceleratingFlipping = () => {
    let currentStep = 0;
    const totalSteps = 23; 

    const runFlip = () => {
      if (currentStep >= totalSteps) {
        // Step 3: Landing Frame - Instantly trigger final elegant text overlay
        setCurrentImageIndex(PORTRAITS.length - 1); 
        synth.playFinalClank(); 
        setShowText(true); 
        setIntroCompleted(true);
        setCurrentDelay(1200); 

        // AUTOMATED SHUTTER REVEAL SEQUENCE (No click needed!)
        // Wait 1.0 seconds so the user admires the title over portrait, then initiate the clean transition sequence:
        setTimeout(() => {
          // Trigger the slide up of the curtain and the slide up of the lookbook simultaneously
          synth.playSplitOpen();
          setSlideCurtainUp(true);
          setRevealPlatform(true);
          setLoading(false);
          
          setTimeout(() => {
            // Curtain has completely gone up (out of screen). Clear the curtain layer completely
            setIntroActive(false);
          }, 1100); // Shutter curtain slide-up timer matches CSS transition exactly

        }, 1200); // 1.2s admiration pause

        return;
      }

      // Cycle index across portraits
      const nextIndex = currentStep % PORTRAITS.length;
      setCurrentImageIndex(nextIndex);
      
      const pitchFactor = 1.0 + (currentStep / totalSteps) * 0.95;
      synth.playCameraShutter(pitchFactor);

      // Accelerating Shutter timing logic
      const t = currentStep / totalSteps;
      const startDelay = 180; 
      const endDelay = 25;    
      const delay = startDelay - (1 - Math.pow(1 - t, 3)) * (startDelay - endDelay);

      setCurrentDelay(delay);

      currentStep++;
      setTimeout(runFlip, delay);
    };

    runFlip();
  };

  // Three.js background subtle dynamic particle field behind lookbook
  useEffect(() => {
    if (loading || !canvasRef.current || introActive) return;

    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#020203', 0.025);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ canvas: container, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const warmCreamColor = new THREE.Color('#f5f2eb');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const c = warmCreamColor.clone().multiplyScalar(0.2 + Math.random() * 0.4);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const time = clock.getElapsedTime();
      particles.rotation.y = time * 0.008;
      particles.rotation.x = time * 0.004;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container || !container.parentElement) return;
      camera.aspect = container.parentElement.clientWidth / container.parentElement.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.parentElement.clientWidth, container.parentElement.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [loading, introActive]);

  // SVG circular properties for initial loader
  const radius = 48;
  const circumference = 2 * Math.PI * radius; 
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Render the intro/shutter flipper in a full-width container centered correctly on screen (NO scanlines overlay)
  const renderIntroContent = () => (
    <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-[#020203]">
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Accelerating Portrait Frame */}
        <div 
          className="relative w-[75vw] max-w-[300px] h-[55vh] max-h-[460px] border border-zinc-800/60 rounded bg-zinc-950 overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.95)] z-10 animate-fade-in"
        >
          {PORTRAITS.map((img, idx) => {
            const isActive = idx === currentImageIndex;
            return (
              <img 
                key={img}
                src={img} 
                alt="ZunUz Portrait" 
                className="absolute inset-0 w-full h-full object-cover filter contrast-[1.25] grayscale brightness-95 will-change-[opacity,transform]"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? PORTRAIT_ROTATIONS[idx] : 'rotate(0deg) scale(0.95)',
                  transition: `opacity ${introCompleted && idx === PORTRAITS.length - 1 ? 1200 : currentDelay * 0.8}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform ${introCompleted && idx === PORTRAITS.length - 1 ? 1200 : currentDelay * 0.85}ms cubic-bezier(0.16, 1, 0.3, 1)`
                }}
              />
            );
          })}
          
          <div key={currentImageIndex} className="absolute inset-0 bg-[#020203] opacity-0 pointer-events-none shutter-flash-trigger" />
        </div>

        {/* Overlapping luxury typography */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="relative w-full text-center">
            <h2 
              className={`text-[12vw] md:text-[8vw] font-light leading-none tracking-tight text-[#F5F2EB] drop-shadow-[0_20px_45px_rgba(0,0,0,0.98)] transition-all duration-[750ms] cubic-bezier(0.16, 1, 0.3, 1) will-change-transform ${showText ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}
              style={{ fontFamily: "'Qrokinex', sans-serif" }}
            >
              Zunuz
            </h2>
            <p className={`text-[9px] md:text-xs font-mono tracking-[0.45em] text-[#F5F2EB]/60 mt-5 uppercase transition-opacity duration-1000 delay-300 ${showText ? 'opacity-100' : 'opacity-0'}`}>
              You Love it! Buy it!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-[#020203] text-[#F5F2EB] font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden relative">
      
      {/* 1. INITIAL PASSIVE CIRCULAR LOADER SCREEN */}
      {loading && !isSlidIn && (
        <div className="fixed inset-0 z-[999] bg-[#020203] flex items-center justify-center select-none">
          <div className="relative flex items-center justify-center scale-95 md:scale-100">
            <div className="w-[72vw] h-[72vw] max-w-[320px] max-h-[320px] flex items-center justify-center relative">
              
              {/* Dynamic circular SVG progress ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#F5F2EB"
                  strokeWidth="0.5"
                  className="opacity-10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#F5F2EB"
                  strokeWidth="1.2"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>

              {/* Centered progress percentage numbers */}
              <span 
                className="text-[16vw] md:text-[100px] font-light text-[#F5F2EB] leading-none tracking-tighter"
                style={{ fontFamily: "'Qrokinex', sans-serif" }}
              >
                {progress}%
              </span>
            </div>
            
          </div>
        </div>
      )}

      {/* 2. UNIFIED COHESIVE SLIDE-UP REVEAL CURTAIN */}
      {introActive && isSlidIn && (
        <div 
          className="fixed inset-0 z-[998] overflow-hidden pointer-events-auto bg-[#020203] border-b border-[#F5F2EB]/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] will-change-transform"
          style={{
            transform: slideCurtainUp ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
            transition: 'transform 1100ms cubic-bezier(0.76, 0, 0.24, 1)'
          }}
        >
          {renderIntroContent()}
        </div>
      )}

      {/* THREEJS BACKGROUND SPACE ENGINE */}
      {isSlidIn && (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-45">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
      )}

      {/* 3. PREMIUM MOBILE LOOKBOOK MAIN APP VIEW (SEAMLESSLY INTEGRATED UNDER REVEAL TRANSITION) */}
      {isSlidIn && (
        <div 
          className="relative z-10 h-[100dvh] w-full flex flex-col justify-between max-w-lg mx-auto bg-[#020203]/90 shadow-2xl border-x border-zinc-900/80 pb-safe-bottom will-change-[opacity,transform]"
          style={{
            opacity: revealPlatform ? 1 : 0,
            transform: revealPlatform ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 100px, 0) scale(0.96)',
            transition: 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1000ms ease-out'
          }}
        >
          
          {/* Lookbook Navigation bar */}
          <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-5 border-b border-zinc-900/50 backdrop-blur-lg bg-[#020203]/40">
            {/* <button className="text-zinc-400 hover:text-white transition-colors" aria-label="Menu list">
              <Menu size={20} strokeWidth={1.5} />
            </button> */}
            
            <span 
              className="text-2xl font-semibold tracking-[0.2em] font-serif text-[#F5F2EB]"
              style={{ fontFamily: "'Qrokinex', sans-serif" }}
            >
              ZUNUZ
            </span>

            <div className="flex items-center gap-8 text-zinc-400">
                <div className="relative">
                    <ShoppingBag size={18} strokeWidth={1.5} className="text-[#F5F2EB]" />
                    <span className="absolute -top-1.5 -right-2 bg-amber-400 text-black font-mono font-bold text-[8px] h-4 w-4 rounded-full flex items-center justify-center">
                    2
                    </span>
                </div>
              <button className="hover:text-white transition-colors" aria-label="User Account">
                <User size={18} strokeWidth={1.5} />
              </button>
             
            </div>
          </header>

          {/* LOOKBOOK SECTION CONTAINER (Precisely replicating image_45d546.png) */}
          <section className="flex-1 flex flex-col w-full bg-black divide-y divide-zinc-950 overflow-hidden">
            {LOOKBOOK_ITEMS.map((item, index) => (
              <div 
                key={item.id}
                onClick={() => {
                  setSelectedProject(item);
                  synth.playConfirm();
                }}
                className="group relative flex-1 min-h-0 w-full overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all duration-700 bg-zinc-950"
              >
                {/* Hardware-Accelerated background closeup lookbook photo */}
                <div className="absolute inset-0 z-0 scale-100 group-hover:scale-105 group-active:scale-102 transition-transform duration-[1200ms] ease-out select-none">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.8] saturate-[1.05]"
                  />
                  {/* Subtle dark-light elegant gradient layer */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/45 group-hover:opacity-75 transition-opacity" />
                </div>

                {/* CENTRAL TITLE AND INTERACTIVE ACCENTS */}
                <div className="relative z-10 text-center px-4 flex flex-col items-center select-none">
                  
                  {/* Minimal collection index badge */}
                  {/* <span className="text-[8px] font-mono tracking-[0.4em] text-zinc-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500 mb-2">
                    COLL_REEL_0{index + 1}
                  </span> */}

                  {/* Wide-Streetwear Typographic Banner */}
                  <h3 
                    className="text-[6.5vw] sm:text-3xl leading-none text-white tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] group-hover:text-amber-300 transition-colors"
                    style={{ 
                      fontFamily: "'Qrokinex', sans-serif",
                      fontWeight: 700
                    }}
                  >
                    {item.title}
                  </h3>

                  <p className="text-[10px] font-mono tracking-[0.2em] text-[#F5F2EB]/70 uppercase mt-2 max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                    {item.subtitle} — {item.price}
                  </p>
                </div>

                {/* Subtle border outline hovering indicator */}
                <div className="absolute inset-3 border border-[#F5F2EB]/0 group-hover:border-[#F5F2EB]/15 rounded transition-all duration-500 pointer-events-none" />
              </div>
            ))}
          </section>

          {/* Premium Footer with Sync indicators */}
          <footer className="px-6 py-5 border-t border-zinc-900/50 bg-[#020203] flex justify-center items-center text-center text-[10px] font-medium text-zinc-500 tracking-wider">
            <span>© copyright Zunuz | 2026</span>
          </footer>

        </div>
      )}

      {/* DYNAMIC CASE / PRODUCT PREVIEW MODAL */}
      {/* {selectedProject && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
          onClick={() => { setSelectedProject(null); synth.playTick(); }}
        >
          <div 
            className="bg-[#020203] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">
                LOOKBOOK ENTRY
              </span>
              <button onClick={() => { setSelectedProject(null); synth.playTick(); }} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="aspect-[4/5] rounded-xl overflow-hidden border border-zinc-900">
              <img src={selectedProject.image} className="w-full h-full object-cover filter contrast-110 saturate-[1.05]" alt="Preview lookbook" />
            </div>

            <div>
              <h3 
                className="text-xl font-bold tracking-widest text-[#F5F2EB] mb-1"
                style={{ fontFamily: "'Qrokinex', sans-serif" }}
              >
                {selectedProject.title}
              </h3>
              <p className="text-xs font-mono text-[#F5F2EB]/70 mt-2 leading-relaxed">
                {selectedProject.subtitle || "Premium, hand-crafted gold chain detail designed specifically for editorial streetwear layers. Polished with anti-tarnish micro coating parameters."}
              </p>
              <div className="mt-4 flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-900">
                <span className="text-[10px] font-mono text-zinc-500">MSRP VALUE:</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{selectedProject.price}</span>
              </div>
            </div>

            <button 
              onClick={() => { setSelectedProject(null); synth.playConfirm(); }}
              className="w-full py-3 bg-[#F5F2EB] text-black font-mono text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors"
            >
              ADD TO REEL BAG
            </button>
          </div>
        </div>
      )} */}

      {/* Embedded Animations and Shutter Splitting Controls */}
      <style>{`
        @font-face {
          font-family: 'Qrokinex';
          src: url('../font/Qrokinex.woff2') format('woff2'),
               url('../font/Qrokinex/Qrokinex.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        /* Aggressive global override to ensure Qrokinex is forced everywhere */
        * {
          font-family: 'Qrokinex', sans-serif !important;
        }

        /* Global scrollbar hiding rules to fix frame & remove sidebar from all views */
        html, body, #root, * {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE, Edge */
        }
        
        ::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
          width: 0 !important;
          height: 0 !important;
        }

        /* Removed body position: fixed and overflow: hidden to allow native mobile pull-to-refresh */

        @keyframes center-fade-in {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInPlatform {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shutter-curtain-flash {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        
        .shutter-flash-trigger {
          animation: shutter-curtain-flash 0.12s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-fade-in-platform {
          animation: fadeInPlatform 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}