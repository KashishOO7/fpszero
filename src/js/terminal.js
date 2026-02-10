if (window.FPS_TERMINAL_CLEANUP) {
    window.FPS_TERMINAL_CLEANUP();
    window.FPS_TERMINAL_CLEANUP = null;
}

const output = document.getElementById('terminal-output');
const inputLine = document.getElementById('command-input');
const inputContainer = document.getElementById('input-line');
const prefix = document.getElementById('prompt-prefix');

let history = [];
let historyIndex = -1;
let currentPath = ['home']; 
let fileSystem = {};
let username = sessionStorage.getItem('fps_username') || null;
let isMuted = localStorage.getItem('fps_mute') === 'true'; 
let isLoginMode = false;
let isAnimating = false;
let matrixInterval = null; 
const startTime = new Date(); 
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag]));
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const baseSystem = {
    'home': {}, 
    'bin': { 
        'ls': '[Ex]', 'cat': '[Ex]', 'pwd': '[Ex]', 'whoami': '[Ex]', 
        'date': '[Ex]', 'status': '[Ex]', 'reboot': '[Ex]', 'sound': '[Ex]',
        'uname': '[Ex]', 'uptime': '[Ex]', 'top': '[Ex]', 'history': '[Ex]',
        'mkdir': '[Ex]', 'help': '[Ex]', 'matrix': '[Ex]'
    },
    'var': { 'log': { 'syslog': 'Daemon started.\nSentinel Engine: LISTENING.' } }
};

const COMMANDS = {
    'help': () => {
        print("FPSZERO SHELL v2.0.0");
        print("--------------------");
        print("  ls, cd, cat, pwd    : File System Navigation");
        print("  mkdir               : Create Directory");
        print("  date, uptime        : Time Information");
        print("  status, uname, top  : System Information");
        print("  sound [on/off]      : Toggle Audio Feedback");
        print("  whoami, history     : User Information");
        print("  reboot              : System Reset (Logout)");
        print("  clear               : Clear Display");
        print("  matrix              : Visualizing the Code");
    },
    'date': () => print(new Date().toString()),
    'uptime': () => {
        const diff = Math.floor((new Date() - startTime) / 1000);
        print(`up ${Math.floor(diff / 60)} min, ${diff % 60} sec, 1 user, load average: 0.02, 0.05, 0.01`);
    },
    'uname': (args) => {
        if (args && args[0] === '-a') print("Linux fpszero-node 2.0.0-generic #42-static FPS x86_64 Github Pages");
        else print("Github Pages");
    },
    'top': () => {
        print("PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND");
        print(`101 ${username || 'guest'}   20   0   82444   5620   3890 R   0.1   0.0   0:00.05 fps_shell`);
    },
    'status': () => {
        print("System Status: NOMINAL");
        print(`Astro Telemetry: [Moon: ${getLiveMoonTelemetry()}]`);
    },
    'sound': (args) => {
        if (args && args[0] === 'off') { isMuted = true; print("Audio feedback: DISABLED"); }
        else if (args && args[0] === 'on') { isMuted = false; print("Audio feedback: ENABLED"); playTypeSound(); }
        else { isMuted = !isMuted; print(`Audio feedback: ${isMuted ? 'DISABLED' : 'ENABLED'}`); if(!isMuted) playTypeSound(); }
        localStorage.setItem('fps_mute', isMuted);
    },
    'reboot': () => {
        print("Initiating shutdown sequence...");
        sessionStorage.clear(); localStorage.removeItem('fps_filesystem_v2'); 
        setTimeout(() => location.reload(), 1000);
    },
    'history': () => history.forEach((cmd, i) => print(`${i + 1}  ${escapeHTML(cmd)}`)),
    'whoami': () => print(username),
    'pwd': () => print(getPathString()),
    'clear': () => output.innerHTML = '',
    'ls': () => {
        const dir = getDir(currentPath);
        if(!dir || typeof dir !== 'object') return;
        
        const keys = Object.keys(dir).sort((a, b) => {
            const isDirA = typeof dir[a] === 'object';
            const isDirB = typeof dir[b] === 'object';
            if (isDirA && !isDirB) return -1;
            if (!isDirA && isDirB) return 1;
            return a.localeCompare(b);
        });

        const items = keys.map(key => {
            if (typeof dir[key] === 'object') return `<span class="dir">${escapeHTML(key)}/</span>`;
            if (key.endsWith('.link')) return `<span class="link">${escapeHTML(key)}</span>`;
            return `<span class="file">${escapeHTML(key)}</span>`;
        });
        print(items.join('  '), 'safe-html');
    },
    'cd': (args) => {
        if (!args || !args[0] || args[0] === '~') { currentPath = ['home', username]; } 
        else if (args[0] === '..') { if (currentPath.length > 0) currentPath.pop(); } 
        else {
            const target = args[0].replace(/\/$/, '');
            const newDir = getDir([...currentPath, target]);
            if (newDir && typeof newDir === 'object') { currentPath.push(target); } 
            else { print(`cd: ${escapeHTML(target)}: No such file or directory`, 'error'); }
        }
        updatePrompt();
    },
    'mkdir': (args) => {
        if (!args || !args[0]) { print("usage: mkdir [directory]", 'error'); return; }
        const currentDirObj = getDir(currentPath);
        if (currentDirObj[args[0]]) print(`mkdir: cannot create directory '${escapeHTML(args[0])}': File exists`, 'error');
        else { currentDirObj[args[0]] = {}; saveSystem(); }
    },
    'cat': (args) => {
        if (!args || !args[0]) { print("usage: cat [file]"); return; }
        const fileContent = getDir(currentPath) ? getDir(currentPath)[args[0]] : null;
        if (fileContent !== undefined) {
            if (typeof fileContent === 'object') print(`cat: ${escapeHTML(args[0])}: Is a directory`, 'error'); 
            else {
                if (args[0].endsWith('.link')) {
                    print(`Opening uplink...`);
                    let url = fileContent;
                    if(url.startsWith('LINK: ')) url = url.substring(6);
                    if(url.startsWith('http')) setTimeout(() => window.open(url, '_blank'), 500);
                } else print(escapeHTML(fileContent)); 
            }
        } else print(`cat: ${escapeHTML(args[0])}: No such file`, 'error');
    },
    'matrix': () => triggerMatrixRain()
};

function getLiveMoonTelemetry() {
    const days = (new Date().getTime() - new Date('1970-01-07T20:35:00Z').getTime()) / 86400000;
    const frac = (days % 29.53058867) / 29.53058867;
    const vis = Math.round(50 * (1 - Math.cos(frac * Math.PI * 2)));
    return `Phase: ${frac.toFixed(2)} [Vis: ${vis}%]`;
}

function triggerMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-canvas';
    Object.assign(canvas.style, { position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:99999, opacity:0.9, background:'black', pointerEvents:'auto', cursor:'pointer' });
    document.body.appendChild(canvas);
    inputLine.blur();

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const drops = Array(Math.floor(canvas.width / 16)).fill(1);
    
    const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0'; ctx.font = '16px monospace';
        for (let i = 0; i < drops.length; i++) {
            ctx.fillText('FPSZERO10XYZ'.charAt(Math.floor(Math.random()*12)), i*16, drops[i]*16);
            if (drops[i]*16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    };
    matrixInterval = setInterval(draw, 30);
    
    const stopMatrix = (e) => {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        clearInterval(matrixInterval); matrixInterval = null;
        if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
        document.removeEventListener('keydown', stopMatrix);
        inputLine.focus();
    };
    setTimeout(() => { canvas.addEventListener('click', stopMatrix); document.addEventListener('keydown', stopMatrix); }, 200);
}

function print(text, type = '') {
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    if (type === 'safe-html') div.innerHTML = text; 
    else if (type === 'command-history') div.innerHTML = escapeHTML(text); 
    else div.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
    output.appendChild(div);
    scrollToBottom();
}

function setupUserEnvironment(name) {
    username = name; sessionStorage.setItem('fps_username', username);
    currentPath = ['home', username];
    
    let sharedData = { projects: {}, content: {} };
    try { sharedData = JSON.parse(localStorage.getItem('fps_data_link')) || {}; } catch(e) {}
    
    const projectsFolder = {};
    if(sharedData.projects) {
        Object.keys(sharedData.projects).forEach(k => {
            const safeName = k.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const projectData = sharedData.projects[k];
            
            const projectContent = {};
            projectContent['brief.txt'] = `PROJECT: ${k.toUpperCase()}\n---\n${projectData.details.description || 'No data.'}`;
            
            if (projectData.details.ctas) {
                projectData.details.ctas.forEach(cta => {
                    const linkName = cta.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.link';
                    projectContent[linkName] = `LINK: ${cta.url}`;
                });
            }
            projectsFolder[safeName] = projectContent;
        });
    }

    try { fileSystem = JSON.parse(localStorage.getItem('fps_filesystem_v2')) || JSON.parse(JSON.stringify(baseSystem)); } catch { fileSystem = JSON.parse(JSON.stringify(baseSystem)); }
    
    if (!fileSystem.home) fileSystem.home = {};
    if (!fileSystem.home[username]) fileSystem.home[username] = {};
    
    fileSystem.home[username]['projects'] = projectsFolder;
    
    if (!fileSystem.home[username]['moon_data']) {
        fileSystem.home[username]['moon_data'] = { 'phase.txt': localStorage.getItem('fps_moon_phase') || 'Unknown' };
    }
    
    saveSystem(); updatePrompt();
}

function handleLogin(name) {
    if (!name) return;
    inputLine.value = ''; inputContainer.classList.add('hidden'); isLoginMode = false; inputLine.classList.remove('password-mode');
    runMatrixWakeUp(name);
}

function handleCommand(cmd) {
    if (!cmd) return;
    print(cmd, 'command-history'); history.push(cmd); historyIndex = history.length;
    const parts = cmd.trim().split(/\s+/);
    if (COMMANDS[parts[0].toLowerCase()]) COMMANDS[parts[0].toLowerCase()](parts.slice(1));
    else print(`${escapeHTML(cmd)}: command not found`, 'error');
    inputLine.value = ''; scrollToBottom();
}

async function runMatrixWakeUp(name) {
    isAnimating = true; output.innerHTML = '';
    await typeWriter(`Booting FPSZERØ...`, 60); await delay(1000); output.innerHTML = '';
    await typeWriter(`Wake up, ${escapeHTML(name)}...`, 80); await delay(1500); output.innerHTML = '';
    
    await typeWriter(`The Matrix has you...`, 80); await delay(1500); output.innerHTML = '';
    await typeWriter(`Follow the white rabbit.`, 80); await delay(1500); output.innerHTML = '';
    
    setupUserEnvironment(name); output.innerHTML = '';
    print(`Identity Verified: [${escapeHTML(name)}]`); print("FPSZERO Environment Loaded.");
    print("Type <span class='link'>'help'</span> to view commands.", 'safe-html');
    inputContainer.classList.remove('hidden'); inputLine.focus(); isAnimating = false;
}

function typeWriter(text, speed) {
    return new Promise(resolve => {
        const div = document.createElement('div'); div.className = 'matrix-text'; output.appendChild(div);
        let i = 0;
        function type() {
            if (i < text.length) { div.textContent += text.charAt(i); playTypeSound(); i++; setTimeout(type, speed); } else resolve();
        }
        type();
    });
}

function playTypeSound() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime); 
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime); 
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05); 
}

function saveSystem() { localStorage.setItem('fps_filesystem_v2', JSON.stringify(fileSystem)); }
function getDir(pathArray) { let c = fileSystem; for (const p of pathArray) { if (c && c[p]) c = c[p]; else return null; } return c; }
function getPathString() { return '/' + currentPath.join('/'); }
function updatePrompt() { prefix.textContent = `${username || 'guest'}@fpszero.com:${getPathString().replace(`/home/${username}`, '~')}$`; }
function scrollToBottom() { window.scrollTo(0, document.body.scrollHeight); }
function autoComplete(input) {
    const parts = input.split(' '); const partial = parts[parts.length - 1]; const dir = getDir(currentPath);
    if (dir) {
        const matches = Object.keys(dir).filter(o => o.startsWith(partial));
        if (matches.length === 1) { parts[parts.length - 1] = matches[0]; inputLine.value = parts.join(' '); }
    }
}

function init() {
    if (!localStorage.getItem('fps_filesystem_v2')) {
        fileSystem = JSON.parse(JSON.stringify(baseSystem));
    } else {
        try { fileSystem = JSON.parse(localStorage.getItem('fps_filesystem_v2')); } catch { fileSystem = JSON.parse(JSON.stringify(baseSystem)); }
    }

    const onClick = () => { if (!isAnimating) inputLine.focus(); };
    const onKeyDown = (e) => {
        const ctx = getAudioContext(); if (ctx.state === 'suspended') ctx.resume();
        if(e.key.length === 1) playTypeSound();
        if (e.key === 'Enter') { isLoginMode ? handleLogin(inputLine.value.trim()) : handleCommand(inputLine.value); }
        else if (!isLoginMode) {
            if (e.key === 'ArrowUp') { e.preventDefault(); if (historyIndex > 0) inputLine.value = history[--historyIndex]; }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIndex < history.length - 1) inputLine.value = history[++historyIndex]; else { historyIndex = history.length; inputLine.value = ''; } }
            else if (e.key === 'Tab') { e.preventDefault(); autoComplete(inputLine.value); }
        }
    };
    document.addEventListener('click', onClick); inputLine.addEventListener('keydown', onKeyDown);
    window.FPS_TERMINAL_CLEANUP = () => { document.removeEventListener('click', onClick); inputLine.removeEventListener('keydown', onKeyDown); if(matrixInterval) clearInterval(matrixInterval); if(audioCtx) audioCtx.close(); };
    
    if (!username) {
        output.innerHTML = ''; print("FPSZERO SECURE GATEWAY v2.1"); print("---------------------------"); print("IDENTITY CONFIRMATION REQUIRED.");
        isLoginMode = true; inputContainer.classList.remove('hidden'); prefix.textContent = "CODENAME: "; inputLine.value = ''; inputLine.classList.add('password-mode'); setTimeout(() => inputLine.focus(), 50);
    } else {
        output.innerHTML = ''; setupUserEnvironment(username); print(`System restored. Welcome back, ${escapeHTML(username)}.`);
        inputContainer.classList.remove('hidden'); inputLine.focus();
    }
}

init();