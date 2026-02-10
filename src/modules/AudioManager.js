export class AudioManager {
    constructor(tracks) {
        this.tracks = tracks || [];
        this.currentIndex = 0;
        this.audio = null;
        this.isPlaying = false;
        
        this.ui = {
            container: null,
            trackInfo: null,
            playBtn: null,
            visualizer: null,
            slider: null
        };
        
        if (this.tracks.length > 0) {
            this.loadTrack(0);
        }
    }
    createUI() {
        const container = document.getElementById('audio-player');
        if (!container) return;

        container.innerHTML = `
            <div class="radio-case">
                <div class="antenna-base"></div>
                <div class="radio-antenna"></div>
                
                <div class="speaker-grille">
                    <div class="radio-label">FPS-COMM</div>
                </div>

                <div class="retro-display">
                    <div class="track-info">INITIALIZING...</div>
                    <div class="visualizer-container">
                        <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
                        <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
                        <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
                        <div class="eq-bar"></div>
                    </div>
                </div>

                <div class="controls-row">
                    <button class="retro-btn" id="btn-prev">|&lt;</button>
                    <button class="retro-btn play-btn" id="btn-play">▶</button>
                    <button class="retro-btn" id="btn-next">&gt;|</button>
                    <input type="range" class="retro-slider" min="0" max="1" step="0.1" value="0.5">
                </div>
            </div>
        `;

        this.ui.container = container;
        this.ui.trackInfo = container.querySelector('.track-info');
        this.ui.visualizer = container.querySelector('.visualizer-container');
        this.ui.playBtn = container.querySelector('#btn-play');
        this.ui.slider = container.querySelector('.retro-slider');
        container.querySelector('#btn-prev').addEventListener('click', () => this.previousTrack());
        container.querySelector('#btn-next').addEventListener('click', () => this.nextTrack());
        this.ui.playBtn.addEventListener('click', () => this.togglePlay());
        
        this.ui.slider.addEventListener('input', (e) => {
            this.setVolume(parseFloat(e.target.value));
        });

        this.updateUI();
    }

    updateUI() {
        if (!this.ui.trackInfo) return; 

        if (this.currentTrack) {
            this.ui.trackInfo.textContent = this.currentTrack.title;
        }

        if (this.isPlaying) {
            this.ui.visualizer.classList.add('active');
            this.ui.playBtn.classList.add('active');
            this.ui.playBtn.textContent = '||';
        } else {
            this.ui.visualizer.classList.remove('active');
            this.ui.playBtn.classList.remove('active');
            this.ui.playBtn.textContent = '▶';
        }
    }

    loadTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        
        this.currentIndex = index;
        this.currentTrack = this.tracks[index];
        
        if (this.currentTrack.src) {
            this.audio = new Audio(this.currentTrack.src);
            this.audio.loop = false;
            this.audio.volume = this.ui.slider ? parseFloat(this.ui.slider.value) : 0.5;
            
            this.audio.addEventListener('ended', () => this.nextTrack());
        } else {
            this.audio = null;
        }
        
        this.updateUI();
    }

    togglePlay() {
        if (!this.audio) return;
        
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        } else {
            this.audio.play().catch(e => console.warn("Audio play blocked (user gesture needed):", e));
            this.isPlaying = true;
        }
        this.updateUI();
    }

    play() {
        if (this.audio && !this.isPlaying) {
            this.audio.play().catch(e => console.warn("Audio play blocked:", e));
            this.isPlaying = true;
            this.updateUI();
        }
    }

    pause() {
        if (this.audio && this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            this.updateUI();
        }
    }

    nextTrack() {
        this.pause();
        const nextIndex = (this.currentIndex + 1) % this.tracks.length;
        this.loadTrack(nextIndex);
        this.play();
    }

    previousTrack() {
        this.pause();
        const prevIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
        this.loadTrack(prevIndex);
        this.play();
    }

    setVolume(value) {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, value));
        }
    }
}