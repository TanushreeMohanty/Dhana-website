import confetti from 'canvas-confetti';

// Global App State
const state = {
  soundEnabled: true,
  teammateHp: 15,
  isReviving: false,
  reviveProgress: 0,
  reviveInterval: null,
  isRevived: false,
  cart: [],
};

// ==========================================
// AUDIO SYNTHESIZER & SOUND FX
// ==========================================
class SoundFx {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playClick() {
    if (!state.soundEnabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playRevivePulse() {
    if (!state.soundEnabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playFanfare() {
    if (!state.soundEnabled) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.4);
    });
  }
}

const sfx = new SoundFx();

// ==========================================
// BACKGROUND PARTICLES CANVAS
// ==========================================
function initBackgroundCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2.5 + 0.5,
    speedX: (Math.random() - 0.5) * 0.4,
    speedY: -Math.random() * 0.5 - 0.2,
    alpha: Math.random() * 0.7 + 0.3,
    color: Math.random() > 0.5 ? '#ffab00' : '#f1c40f',
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.x < 0 || p.x > width) {
        p.x = Math.random() * width;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// ==========================================
// PAGE NAVIGATION CONTROLLER
// ==========================================
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pageSections = document.querySelectorAll('.page-section');

  function switchPage(targetPageId) {
    sfx.playClick();

    navBtns.forEach((btn) => {
      if (btn.dataset.page === targetPageId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    pageSections.forEach((section) => {
      if (section.id === targetPageId) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchPage(btn.dataset.page);
    });
  });

  // Next / Prev button triggers
  document.querySelectorAll('.btn-next-page').forEach((btn) => {
    btn.addEventListener('click', () => switchPage(btn.dataset.next));
  });

  document.querySelectorAll('.btn-prev-page').forEach((btn) => {
    btn.addEventListener('click', () => switchPage(btn.dataset.prev));
  });
}

// ==========================================
// BGMI TEAMMATE REVIVE MECHANIC
// ==========================================
function initReviveMechanic() {
  const reviveBtn = document.getElementById('reviveBtn');
  const ringProgress = document.getElementById('ringProgress');
  const teammateHpBar = document.getElementById('teammateHpBar');
  const teammateHpText = document.getElementById('teammateHpText');
  const reviveStatus = document.getElementById('reviveStatus');

  const circumference = 2 * Math.PI * 45; // 282.74

  function updateProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    ringProgress.style.strokeDashoffset = offset;
  }

  function startReviving() {
    if (state.isRevived) return;
    state.isReviving = true;
    reviveStatus.innerText = 'Reviving Teammate... 💖 (Keep Holding!)';

    state.reviveInterval = setInterval(() => {
      state.reviveProgress += 4;
      updateProgress(state.reviveProgress);
      sfx.playRevivePulse();

      // Update HP Bar smoothly
      const currentHp = Math.min(100, 15 + Math.floor((state.reviveProgress / 100) * 85));
      teammateHpBar.style.width = `${currentHp}%`;
      teammateHpText.innerText = `HP: ${currentHp}% (Reviving...)`;

      if (state.reviveProgress >= 100) {
        completeRevive();
      }
    }, 100);
  }

  function stopReviving() {
    if (state.isRevived) return;
    state.isReviving = false;
    clearInterval(state.reviveInterval);

    if (state.reviveProgress < 100) {
      state.reviveProgress = 0;
      updateProgress(0);
      teammateHpBar.style.width = `15%`;
      teammateHpText.innerText = `HP: 15% (KNOCKED DOWN!)`;
      reviveStatus.innerText = 'Hold button down to revive 💖';
    }
  }

  function completeRevive() {
    clearInterval(state.reviveInterval);
    state.isReviving = false;
    state.isRevived = true;
    teammateHpBar.style.width = `100%`;
    teammateHpText.innerText = `HP: 100% (TEAMMATE REVIVED! 💕)`;
    teammateHpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';

    reviveBtn.classList.add('revived');
    reviveBtn.querySelector('.revive-btn-text').innerText = 'REVIVED!';
    reviveBtn.querySelector('.revive-sub').innerText = 'Thank you squad leader!';
    reviveStatus.innerText = '🎉 TEAMMATE REVIVED! Thank you my hero Dhana!';

    sfx.playFanfare();
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  }

  // Mouse & Touch events
  reviveBtn.addEventListener('mousedown', startReviving);
  reviveBtn.addEventListener('mouseup', stopReviving);
  reviveBtn.addEventListener('mouseleave', stopReviving);

  reviveBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startReviving();
  });
  reviveBtn.addEventListener('touchend', stopReviving);
}

// ==========================================
// AIRDROP UNBOXING MODAL
// ==========================================
function initAirdropModal() {
  const airdropCrate = document.getElementById('airdropCrate');
  const airdropModal = document.getElementById('airdropModal');
  const closeAirdropModal = document.getElementById('closeAirdropModal');
  const claimAirdropBtn = document.getElementById('claimAirdropBtn');

  airdropCrate.addEventListener('click', () => {
    sfx.playClick();
    airdropModal.classList.add('active');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
  });

  closeAirdropModal.addEventListener('click', () => {
    airdropModal.classList.remove('active');
  });

  claimAirdropBtn.addEventListener('click', () => {
    sfx.playClick();
    airdropModal.classList.remove('active');
  });
}

// ==========================================
// FRIENDS BREAK QUIZ
// ==========================================
function initFriendsQuiz() {
  const quizWrong = document.getElementById('quizWrong');
  const quizRight = document.getElementById('quizRight');
  const quizFeedback = document.getElementById('quizFeedback');

  quizWrong.addEventListener('click', () => {
    sfx.playClick();
    quizFeedback.style.color = '#ff3838';
    quizFeedback.innerText = '❌ Incorrect! Ross & Rachel proved that true love always wins!';
  });

  quizRight.addEventListener('click', () => {
    sfx.playClick();
    quizFeedback.style.color = '#2ecc71';
    quizFeedback.innerText = '✅ CORRECT! You are my Lobster forever & ever Dhana! 🦞❤️';
    sfx.playFanfare();
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  });
}

// ==========================================
// CHICKEN BISTRO ORDER BUILDER & TICKET PASS
// ==========================================
function initBistroMenu() {
  const addBtns = document.querySelectorAll('.btn-add-item');
  const dateItemsList = document.getElementById('dateItemsList');
  const btnGenerateTicket = document.getElementById('btnGenerateTicket');
  const ticketModal = document.getElementById('ticketModal');
  const closeTicketModal = document.getElementById('closeTicketModal');
  const ticketOrderedItems = document.getElementById('ticketOrderedItems');

  function renderCart() {
    dateItemsList.innerHTML = '';

    if (state.cart.length === 0) {
      dateItemsList.innerHTML = '<li class="empty-msg">No items added yet. Click \'ADD TO DATE\' on your favorite dishes!</li>';
      btnGenerateTicket.disabled = true;
      return;
    }

    btnGenerateTicket.disabled = false;

    state.cart.forEach((item, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>🍗 ${item.name}</span>
        <button style="background:none;border:none;color:#ff3838;cursor:pointer;font-weight:bold" data-index="${index}">&times;</button>
      `;
      dateItemsList.appendChild(li);
    });

    // Remove handlers
    dateItemsList.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        state.cart.splice(idx, 1);
        renderCart();
      });
    });
  }

  addBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      sfx.playClick();
      const card = e.target.closest('.menu-card');
      const name = card.dataset.name;
      state.cart.push({ name });
      renderCart();
    });
  });

  btnGenerateTicket.addEventListener('click', () => {
    sfx.playClick();
    ticketOrderedItems.innerHTML = '';
    state.cart.forEach((item) => {
      const li = document.createElement('li');
      li.innerText = item.name;
      ticketOrderedItems.appendChild(li);
    });

    ticketModal.classList.add('active');
    sfx.playFanfare();
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
  });

  closeTicketModal.addEventListener('click', () => {
    ticketModal.classList.remove('active');
  });
}

// ==========================================
// VICTORY & EVASIVE "NO" BUTTON
// ==========================================
function initVictorySection() {
  const btnForgiveYes = document.getElementById('btnForgiveYes');
  const btnForgiveNo = document.getElementById('btnForgiveNo');
  const victoryModal = document.getElementById('victoryModal');
  const btnVictoryClose = document.getElementById('btnVictoryClose');

  // Playful evasive NO button
  btnForgiveNo.addEventListener('mouseover', () => {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 100;
    btnForgiveNo.style.transform = `translate(${x}px, ${y}px)`;
  });

  btnForgiveNo.addEventListener('click', () => {
    sfx.playClick();
    btnForgiveNo.innerText = 'YES DEFINITELY! ❤️';
    setTimeout(() => {
      btnForgiveYes.click();
    }, 400);
  });

  btnForgiveYes.addEventListener('click', () => {
    sfx.playFanfare();
    victoryModal.classList.add('active');

    // Explosive Confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  });

  btnVictoryClose.addEventListener('click', () => {
    victoryModal.classList.remove('active');
  });
}

// ==========================================
// SOUND TOGGLE CONTROLLER
// ==========================================
function initSoundToggle() {
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = soundToggle.querySelector('.sound-label');

  soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundIcon.innerText = state.soundEnabled ? '🔊' : '🔇';
    soundLabel.innerText = state.soundEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
    if (state.soundEnabled) sfx.playClick();
  });
}

// ==========================================
// INITIALIZE APPLICATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initNavigation();
  initReviveMechanic();
  initAirdropModal();
  initFriendsQuiz();
  initBistroMenu();
  initVictorySection();
  initSoundToggle();
});
