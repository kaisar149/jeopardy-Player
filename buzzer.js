// NEW: Connect to the Python WebSocket Server
const socket = io();

const gameChannel = {
    postMessage: (data) => {
        socket.emit('game_event', data);
    }
};

socket.on('game_event', (data) => {
    if (typeof gameChannel.onmessage === 'function') {
        gameChannel.onmessage({ data: data });
    }
});

// --- EXISTING BUZZER LOGIC ---
let myTeam = "";
let isEnabled = false;

document.getElementById('btn-join').addEventListener('click', () => {
    myTeam = document.getElementById('team-name').value || "Unknown Team";
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('buzzer-screen').classList.remove('hidden');
});

document.getElementById('buzzer-screen').addEventListener('mousedown', buzzIn);
document.getElementById('buzzer-screen').addEventListener('touchstart', buzzIn);

function buzzIn(e) {
    e.preventDefault(); 
    if (isEnabled) {
        isEnabled = false; 
        gameChannel.postMessage({ type: 'BUZZ_IN', team: myTeam });
    }
}

gameChannel.onmessage = (event) => {
    const msg = event.data;
    const bScreen = document.getElementById('buzzer-screen');
    const status = document.getElementById('buzzer-status');

    if (msg.type === 'ENABLE_BUZZERS') {
        isEnabled = true;
        bScreen.className = 'active';
        status.textContent = "BUZZ IN!";
    } 
    else if (msg.type === 'DISABLE_BUZZERS' || msg.type === 'CLOSE_CLUE' || msg.type === 'RESET_GAME') {
        isEnabled = false;
        bScreen.className = 'waiting';
        status.textContent = "WAITING...";
    } 
    else if (msg.type === 'BUZZER_ORDER') {
        const myRank = msg.order.indexOf(myTeam);
        
        if (myRank === 0) {
            bScreen.className = 'first';
            status.textContent = "YOU BUZZED FIRST!";
        } else if (myRank > 0) {
            bScreen.className = 'late';
            status.innerHTML = `LATE<br><span style="font-size: 4vw;">(Rank: ${myRank + 1})</span>`;
        } else {
            isEnabled = false;
            bScreen.className = 'locked';
            status.textContent = "LOCKED OUT";
        }
    }
};