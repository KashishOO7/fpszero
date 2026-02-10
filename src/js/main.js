import * as THREE from 'three';
import gsap from 'gsap';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { Cosmos } from '../modules/Cosmos.js';
import { GraphEngine } from '../modules/GraphEngine.js';
import { AudioManager } from '../modules/AudioManager.js';
import { Moon } from '../modules/Moon.js';

const CONFIG = {
    headerLinks: [
        { name: 'SYSTEMS', view: 'SYSTEMS' },
        { name: 'MANIFESTO', view: 'CONTENT', contentKey: 'manifesto' },
        { name: 'BLUEPRINTS', view: 'KIOSK' },
        { name: 'UPLINK', view: 'CONTENT', contentKey: 'uplink' },
    ],
    contentData: {
        manifesto: {
            title: 'First Principle Synthesis',
            body: `
                <p>What I cannot create I do not understand ... that's the core unconscious functioning of homo sapiens, the last of the genus Homo, You and Me.</p>
                <p>We were passionately curious about our existence and our surroundings. From trying to understand the workings, we end up replicating it artificially.</p>
                <p>In fact, we humans never actually invented anything, we just replicated mother nature and our biological self, artificially.</p>
                <p>From the light bulb to harnessing bio electricity.<br>
                From abacus to neuromorphic computing.<br>
                From wheels to star ship.</p>
                <p>We observe and decode the nature, replicate it to make it available for the masses and monetize it to keep the colonization intact.</p>
                <p>We are nature’s mirror, held up by curiosity and refined by necessity. We don’t invent. We remember what the universe already knows—and then charge subscription fees for it. Fun fact, we are the universe itself, unwrapping the reality, one frame at a time. Limitations of being 3D creatures, wanting to step in the parallel realms.</p>
                <p>Eventually, It would be better if we call ourselves Artists, pioneers, wanderers, rather than Inventors with untouched cosmic inventories.</p>
                <p>This site is a manifestation of that impulse: a first‑principles playground proving that if you can see it in your mind, you can build it, iterate on it, and let imagination set the boundary.</p>
                <p>One project at a time. One build at a time. Mindfully and consciously.</p>
            `
        },
        uplink: {
            title: 'Establish Connection',
            body: `<p>We are currently operating in stealth mode.</p>
                   <ul>
                       <li><a href="https://www.linkedin.com/in/kashish-charaya/" target="_blank">LinkedIn</a></li>
                       <li><a href="mailto:lab@fpszero.com">Mail</a></li>
                   </ul>`
        }
    },
    projectsData: {
        'Identity Defense Grid': { 
            color: 0xff0055, 
            isPulsar: true, 
            details: {
                description: "STATUS: ACTIVE FORMATION [PULSAR].\n\nTarget: Cognitive Security & Phishing Prevention.\n\nHypothesis: Identity attacks are semantic anomalies, not just syntactic ones.\nArchitecture: Local-first Neural Nets.",
                ctas: [ { label: 'Request Access', url: 'mailto:lab@fpszero.com' }, { label: 'System Architecture', url: '#' } ]
            }
        },
        'Adversarial Entropy': { 
            color: 0xffaa00, 
            details: {
                description: "RESEARCH SECTOR: OFFENSIVE SECURITY.\n\nStudying system fragility and chaos.\n\nFocus: Automated vulnerability discovery, LLM Jailbreaking, and Protocol Analysis.",
                ctas: [ { label: 'Research Papers', url: '#' }, { label: 'Knowledge Database', url: 'https://github.com/KashishOO7' } ]
            }
        },
        'Probabilistic Compute': { 
            color: 0x00aaff, 
            details: {
                description: "RESEARCH SECTOR: DEEP TECH.\n\nMoving beyond binary logic.\n\nTopics: Quantum Algorithms, High-Dimensional Math, and Non-Deterministic Systems.",
                ctas: [ { label: 'Quantum Notes (GitBook)', url: '#' } ]
            }
        },
        'Cosmic Archetypes': { 
            color: 0xaa00ff, 
            details: {
                description: "RESEARCH SECTOR: NATURAL PATTERNS.\n\nAstrology is not synthetic; it is the oldest data science.\n\nGoal: Decoding the geometric relationships between celestial mechanics and terrestrial events.",
                ctas: [ { label: 'Read Manifesto', url: '#' } ]
            }
        },
        'FPSZERO Origin': {
            color: 0xffffff, 
            details: {
                description: "THE SINGULARITY.\n\nAn open-source research environment built on First Principles.\n\nNo frameworks. No black boxes. Just Math and Code.",
                ctas: [ { label: 'View Source', url: 'https://github.com/KashishOO7/fpszero' } ]
            }
        }
    },
    audioTracks: [
        { title: 'Founder Log 001: Origin', src: '' }, 
        { title: 'Founder Log 002: The Flaw', src: '' },
        { title: 'System Ambience: Core', src: '' }
    ]
};

let scene, camera, renderer, labelRenderer, composer;
let cosmos, graphEngine, audioManager, moon;
let activeView = 'HOME';
let activeNode = null;
let isTransitioning = false;
let animationFrameId = null;
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();

const ui = {
    home: document.getElementById('home-ui'),
    content: document.getElementById('content-panel'),
    kiosk: document.getElementById('kiosk-container'),
    headerLogo: document.querySelector('#main-header .logo'),
    backButton: document.getElementById('back-button'),
    suggestionsBox: document.getElementById('suggestions-box'),
    searchInput: document.getElementById('search-input'),
    searchForm: document.getElementById('search-form'),
    mainNav: document.getElementById('main-nav'),
    contentTitle: document.getElementById('content-title'),
    contentBody: document.getElementById('content-body'),
    projectInfo: document.getElementById('project-info-panel'),
    projectTitle: document.getElementById('project-title'),
    projectDescription: document.getElementById('project-description'),
    projectCtas: document.getElementById('project-ctas'),
    audioPlayer: document.getElementById('audio-player'),
};

function cleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('mousemove', onMouseMove);

    if (scene) {
        disposeHierarchy(scene);
        scene = null;
    }

    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        const canvas = renderer.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        renderer = null;
    }
    
    if (composer) {
        composer.dispose();
        composer = null;
    }

    if (labelRenderer && labelRenderer.domElement && labelRenderer.domElement.parentNode) {
        labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
    }

    if (cosmos && typeof cosmos.dispose === 'function') cosmos.dispose();
    if (graphEngine && typeof graphEngine.cleanup === 'function') graphEngine.cleanup();
    
    cosmos = null;
    moon = null;
    graphEngine = null;
}

function disposeHierarchy(node) {
    if (!node) return;
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
        if (Array.isArray(node.material)) {
            node.material.forEach(m => m.dispose());
        } else {
            node.material.dispose();
        }
    }
    if (node.children) {
        for (let i = node.children.length - 1; i >= 0; i--) {
            disposeHierarchy(node.children[i]);
            node.remove(node.children[i]);
        }
    }
}

function init() {
    cleanup();
    localStorage.setItem('fps_data_link', JSON.stringify({ projects: CONFIG.projectsData, content: CONFIG.contentData }));

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0005); 

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 20, 100);

    renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        alpha: true, 
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 0.8; 
    bloomPass.radius = 0.5;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById('labels-container').appendChild(labelRenderer.domElement);

    cosmos = new Cosmos(scene); 
    moon = new Moon(scene, camera);
    audioManager = new AudioManager(CONFIG.audioTracks);
    audioManager.createUI();

    setupUI();
    
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);

    animate();
}

function setupUI() {
    buildHeader();
    
    const oldForm = document.getElementById('search-form');
    const newForm = oldForm.cloneNode(true);
    oldForm.parentNode.replaceChild(newForm, oldForm);
    ui.searchForm = newForm;
    ui.searchInput = newForm.querySelector('#search-input'); 
    ui.suggestionsBox = document.getElementById('suggestions-box');
    const searchBtn = newForm.querySelector('button');
    ui.searchForm.addEventListener('submit', (e) => { 
        e.preventDefault(); 
        onSearch(e); 
    });
    
    ui.searchInput.addEventListener('input', onSearchInput);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            onSearch(e);
        });
    }

    if(ui.backButton) {
        const newBtn = ui.backButton.cloneNode(true);
        ui.backButton.parentNode.replaceChild(newBtn, ui.backButton);
        ui.backButton = newBtn;
        ui.backButton.addEventListener('click', () => activeNode ? zoomToTarget(null) : switchView('HOME'));
    }
    
    if(ui.headerLogo) {
        const newLogo = ui.headerLogo.cloneNode(true);
        ui.headerLogo.parentNode.replaceChild(newLogo, ui.headerLogo);
        ui.headerLogo = newLogo;
        ui.headerLogo.addEventListener('click', e => { e.preventDefault(); switchView('HOME'); });
    }
    
    document.addEventListener('click', (e) => {
        if (ui.searchForm && !ui.searchForm.contains(e.target)) {
            ui.suggestionsBox.innerHTML = '';
            ui.suggestionsBox.style.display = 'none';
        }
    });
}

function buildHeader() {
    if (!ui.mainNav) return;
    ui.mainNav.innerHTML = '';
    const ul = document.createElement('ul');
    CONFIG.headerLinks.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = link.name;
        a.href = '#';
        a.dataset.view = link.view;
        if (link.contentKey) a.dataset.contentKey = link.contentKey;
        a.onclick = e => { e.preventDefault(); switchView(link.view, { contentKey: link.contentKey }); };
        li.appendChild(a);
        ul.appendChild(li);
    });
    ui.mainNav.appendChild(ul);
}

function switchView(view, options = {}) {
    if (isTransitioning) return;
    isTransitioning = true;

    if (view === 'HOME') gsap.to(ui.audioPlayer, { autoAlpha: 1, duration: 0.6 });
    else gsap.to(ui.audioPlayer, { autoAlpha: 0, duration: 0.4 });

    const tl = gsap.timeline({
        onComplete: () => {
            activeView = view;
            isTransitioning = false;
            if (view === 'KIOSK') {
                const iframe = document.querySelector('#kiosk-container iframe');
                if (iframe && iframe.contentWindow) iframe.contentWindow.focus();
            }
        }
    });

    const elementsToHide = [ui.home, ui.content, ui.kiosk, ui.projectInfo];
    if (view !== 'KIOSK') elementsToHide.push(ui.backButton); 

    tl.to(elementsToHide, { 
        autoAlpha: 0, 
        duration: 0.4, 
        onComplete: () => elementsToHide.forEach(el => el.classList.add('hidden'))
    });

    tl.add(() => {
        if (view === 'SYSTEMS') {
            if(!graphEngine) {
                graphEngine = new GraphEngine(scene, camera, CONFIG, (node) => zoomToTarget(node));
            }
            gsap.to(camera.position, { x: 0, y: 0, z: 80, duration: 1.5, onUpdate: () => camera.lookAt(0,0,0) });
        } else {
            if(graphEngine) { graphEngine.cleanup(); graphEngine = null; }
        }

        if (view === 'HOME' || view === 'CONTENT') {
            gsap.to(camera.position, { x: 0, y: 20, z: 100, duration: 1.5 });
            gsap.to(camera.rotation, { x: 0, y: 0, z: 0, duration: 1.5 });
        }

        if (view === 'CONTENT') {
            ui.contentTitle.innerHTML = CONFIG.contentData[options.contentKey].title;
            ui.contentBody.innerHTML = CONFIG.contentData[options.contentKey].body;
        }

        if (view === 'KIOSK') {
            gsap.to(ui.headerLogo, { autoAlpha: 0, duration: 0.5 });
            ui.backButton.classList.remove('hidden'); 
            gsap.to(ui.backButton, { autoAlpha: 1, duration: 0.5 });
        } else {
            gsap.to(ui.headerLogo, { autoAlpha: 1, duration: 0.5 });
            if (view === 'HOME') {
                gsap.set(ui.backButton, { autoAlpha: 0 });
                ui.backButton.classList.add('hidden');
            }
        }
    }, "-=0.1");

    if (view === 'HOME') { tl.call(() => ui.home.classList.remove('hidden')); tl.to(ui.home, { autoAlpha: 1, duration: 0.6 }); }
    else if (view === 'CONTENT') { tl.call(() => ui.content.classList.remove('hidden')); tl.to(ui.content, { autoAlpha: 1, duration: 0.6 }); }
    else if (view === 'KIOSK') { tl.call(() => ui.kiosk.classList.remove('hidden')); tl.to(ui.kiosk, { autoAlpha: 1, duration: 0.6 }); }
    
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
    let selector = `#main-nav a[data-view="${view}"]`;
    if (options.contentKey) selector += `[data-content-key="${options.contentKey}"]`;
    const activeLink = document.querySelector(selector);
    if (activeLink) activeLink.classList.add('active');
}

function zoomToTarget(target) {
    isTransitioning = true;
    if (target) {
        activeNode = target;
        const targetPos = new THREE.Vector3();
        target.getWorldPosition(targetPos);
        
        ui.projectInfo.classList.remove('hidden');
        ui.backButton.classList.remove('hidden');
        
        const data = target.userData;
        ui.projectTitle.textContent = data.name;
        ui.projectDescription.textContent = data.details.description;
        ui.projectCtas.innerHTML = '';
        if (data.details.ctas) {
            data.details.ctas.forEach(cta => {
                const a = document.createElement('a');
                a.href = cta.url; a.target = '_blank'; a.className = 'cta-button'; a.textContent = cta.label;
                ui.projectCtas.appendChild(a);
            });
        }

        gsap.to(ui.headerLogo, { autoAlpha: 0, duration: 0.5 });
        gsap.to(ui.projectInfo, { autoAlpha: 1, duration: 0.8 });
        gsap.to(ui.backButton, { autoAlpha: 1, duration: 0.5 });

        const offset = new THREE.Vector3(10, 5, 20); 
        const finalPos = targetPos.clone().add(offset);
        
        gsap.to(camera.position, {
            duration: 1.5,
            x: finalPos.x, y: finalPos.y, z: finalPos.z,
            ease: "power2.inOut",
            onUpdate: () => camera.lookAt(targetPos),
            onComplete: () => { isTransitioning = false; camera.lookAt(targetPos); }
        });

    } else {
        activeNode = null;
        gsap.to(ui.headerLogo, { autoAlpha: 1, duration: 0.5 });
        gsap.to(ui.projectInfo, { autoAlpha: 0, duration: 0.5, onComplete: () => ui.projectInfo.classList.add('hidden') });
        gsap.to(ui.backButton, { autoAlpha: 0, duration: 0.5, onComplete: () => ui.backButton.classList.add('hidden') });
        
        gsap.to(camera.position, {
            duration: 1.5,
            x: 0, y: 0, z: 80,
            ease: "power2.inOut",
            onUpdate: () => camera.lookAt(0,0,0),
            onComplete: () => { isTransitioning = false; }
        });
    }
}

function onSearch(e) {
    if (e) e.preventDefault();
    const term = ui.searchInput.value.trim();
    
    if (term.length === 0) return;

    const foundKey = Object.keys(CONFIG.projectsData).find(key => {
        try {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'i');
            return regex.test(key);
        } catch(e) {
            return key.toLowerCase().includes(term.toLowerCase());
        }
    });

    if (foundKey) {
        ui.suggestionsBox.innerHTML = '';
        ui.suggestionsBox.style.display = 'none';
        ui.searchInput.value = ''; 
        
        if (activeView !== 'SYSTEMS') {
            switchView('SYSTEMS');
        }
        const attemptZoom = (retries = 0) => {
            if (retries > 20) return;
            if(graphEngine && graphEngine.group && graphEngine.group.children.length > 0) {
                const node = graphEngine.group.children.find(c => c.userData.name === foundKey);
                if (node) zoomToTarget(node);
            } else {
                setTimeout(() => attemptZoom(retries + 1), 100);
            }
        };
        setTimeout(() => attemptZoom(), 500); 

    } else {
        ui.searchForm.style.transition = '0.2s ease';
        ui.searchForm.style.borderColor = '#ff0055';
        ui.searchForm.style.boxShadow = '0 0 20px rgba(255, 0, 85, 0.6)';
        
        gsap.to(ui.searchForm, { x: 10, duration: 0.05, yoyo: true, repeat: 5, onComplete: () => {
            gsap.to(ui.searchForm, { x: 0, duration: 0.1 });
        }});

        setTimeout(() => {
            ui.searchForm.style.borderColor = 'rgba(100, 150, 255, 0.15)'; 
            ui.searchForm.style.boxShadow = 'none';
        }, 1000);
    }
}

function onSearchInput() {
    const q = ui.searchInput.value.trim();
    ui.suggestionsBox.innerHTML = '';
    
    if (q.length === 0) {
        ui.suggestionsBox.style.display = 'none';
        return;
    }
    
    const matches = Object.keys(CONFIG.projectsData).filter(p => {
        try {
            const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedQ, 'i');
            return regex.test(p);
        } catch(e) {
            return p.toLowerCase().includes(q.toLowerCase());
        }
    });
    
    if (matches.length > 0) {
        ui.suggestionsBox.style.display = 'block';
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = m;
            div.onclick = (e) => { 
                e.stopPropagation();
                ui.searchInput.value = m; 
                onSearch(new Event('submit')); 
            };
            ui.suggestionsBox.appendChild(div);
        });
    } else {
        ui.suggestionsBox.style.display = 'none';
    }
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate); 
    if (document.hidden) return;

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime(); 

    if (cosmos) cosmos.update(time, delta);
    if (moon) moon.update(time, delta);

    if ((activeView === 'HOME' || activeView === 'CONTENT') && !isTransitioning) {
        camera.position.x += (mouse.x * 2 - camera.position.x) * 0.02;
        camera.position.y += (mouse.y * 2 + 20 - camera.position.y) * 0.02; 
        camera.lookAt(0, 0, 0);
    }

    if (graphEngine) {
        graphEngine.update(delta, time, !activeNode && !isTransitioning);
    }

    composer.render();
    labelRenderer.render(scene, camera);
}

init();