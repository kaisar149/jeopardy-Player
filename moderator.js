const gameChannel = new BroadcastChannel('jeopardy_game');

let gameData = null;
let activeClueId = null; 
let currentClueValue = 0; 
let dailyDoubleId = null; // Tracks the Daily Double location

document.getElementById('game-file').addEventListener('change', handleFileUpload);

gameChannel.onmessage = (event) => {
    if (event.data.type === 'PLAYER_READY' && gameData) {
        gameChannel.postMessage({ type: 'LOAD_GAME', data: gameData });
        setTimeout(broadcastScores, 500);
    }
};

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            gameData = JSON.parse(e.target.result);
            buildModeratorBoard(gameData);
            gameChannel.postMessage({ type: 'LOAD_GAME', data: gameData });
            setTimeout(broadcastScores, 500); 
        } catch (error) {
            alert("Error parsing JSON file. Please ensure it's valid.");
        }
    };
    reader.readAsText(file);
}

function buildModeratorBoard(data) {
    const board = document.getElementById('mini-board');
    board.innerHTML = ''; 

    // Randomly select the Daily Double location
    const randomCol = Math.floor(Math.random() * data.categories.length);
    const randomRow = Math.floor(Math.random() * 5);
    dailyDoubleId = `clue-${randomCol}-${randomRow}`;

    data.categories.forEach(category => {
        const catDiv = document.createElement('div');
        catDiv.className = 'cell category';
        catDiv.textContent = category.name;
        board.appendChild(catDiv);
    });

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < data.categories.length; col++) {
            const clue = data.categories[col].clues[row];
            const pointsDiv = document.createElement('div');
            pointsDiv.className = 'cell points';
            pointsDiv.id = `mod-clue-${col}-${row}`;
            
            // Mark it clearly for the moderator
            if (`clue-${col}-${row}` === dailyDoubleId) {
                pointsDiv.classList.add('daily-double-mod');
                pointsDiv.innerHTML = `${clue.points}<br><span style="font-size: 0.7rem; color: var(--neon-yellow);">(DD)</span>`;
            } else {
                pointsDiv.textContent = clue.points;
            }
            
            pointsDiv.addEventListener('click', () => {
                if (!pointsDiv.classList.contains('answered')) {
                    handleClueClick(col, row, clue, pointsDiv);
                }
            });
            board.appendChild(pointsDiv);
        }
    }
}

function handleClueClick(col, row, clue, cellElement) {
    const isDailyDouble = (`clue-${col}-${row}` === dailyDoubleId);
    const categoryTitle = document.getElementById('current-category');

    // Dynamic Title & Wager Input Logic
    if (isDailyDouble) {
        categoryTitle.innerHTML = `
            ${gameData.categories[col].name} - 🚨 [DAILY DOUBLE] 🚨
            <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 0.9rem; color: var(--neon-yellow); text-transform: uppercase; font-weight: bold;">Enter Wager:</label>
                <input type="number" id="wager-input" placeholder="0" style="padding: 6px; font-size: 1rem; font-family: 'Inter', sans-serif; background: #1a1a1a; color: white; border: 1px solid var(--neon-yellow); border-radius: 4px; width: 120px;">
            </div>
        `;

        currentClueValue = 0;

        document.getElementById('wager-input').addEventListener('input', (e) => {
            currentClueValue = parseInt(e.target.value, 10) || 0;
        });

    } else {
        categoryTitle.textContent = `${gameData.categories[col].name} - ${clue.points}`;
        currentClueValue = parseInt(clue.points, 10) || 0;
    }

    document.getElementById('mod-prompt-text').textContent = clue.prompt + (clue.url ? ` (${clue.type.toUpperCase()})` : '');
    document.getElementById('mod-response-text').textContent = clue.response;
    
    const mediaContainer = document.getElementById('mod-media-container');
    mediaContainer.innerHTML = ''; 
    
    // --- SPOTIFY LOGIC ---
    if (clue.type === 'spotify' && clue.url) {
        let trackId = "";
        if (clue.url.includes("track/")) {
            trackId = clue.url.split('track/')[1].split('?')[0];
        }
        const iframe = document.createElement('iframe');
        iframe.src = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
        iframe.width = "100%";
        iframe.height = "152";
        iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        iframe.style.borderRadius = "12px";
        mediaContainer.appendChild(iframe);
    }
    // --- YOUTUBE LOGIC ---
    else if (clue.type === 'youtube' && clue.url) {
        let videoId = "";
        if (clue.url.includes("v=")) {
            videoId = clue.url.split('v=')[1].split('&')[0];
        } else if (clue.url.includes("youtu.be/")) {
            videoId = clue.url.split('youtu.be/')[1].split('?')[0];
        }
        if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?controls=1`;
            iframe.width = "100%";
            iframe.height = "200"; 
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.style.borderRadius = "8px";
            mediaContainer.appendChild(iframe);
        }
    }
    
    cellElement.classList.add('answered');
    activeClueId = `clue-${col}-${row}`;

    if (isDailyDouble) {
        gameChannel.postMessage({ 
            type: 'SHOW_DAILY_DOUBLE', 
            clueId: activeClueId 
        });
    } else {
        gameChannel.postMessage({ 
            type: 'SHOW_PROMPT', 
            clueId: activeClueId, 
            prompt: clue.prompt,
            mediaType: clue.type || 'text',
            mediaUrl: clue.url || null
        });
    }
}

document.getElementById('btn-show-prompt').addEventListener('click', () => {
    if (!activeClueId) return;
        
    const [_, col, row] = activeClueId.split('-');
    const clue = gameData.categories[col].clues[row];

    gameChannel.postMessage({ 
        type: 'SHOW_PROMPT', 
        prompt: clue.prompt,
        mediaType: clue.type || 'text',
        mediaUrl: clue.url || null
    });
});

document.getElementById('btn-show-answer').addEventListener('click', () => {
    const responseText = document.getElementById('mod-response-text').textContent;
    gameChannel.postMessage({ type: 'SHOW_ANSWER', answer: responseText });
});

document.getElementById('btn-close-clue').addEventListener('click', () => {
    gameChannel.postMessage({ type: 'CLOSE_CLUE' });
    
    document.getElementById('current-category').textContent = 'Category - Point Value';
    document.getElementById('mod-prompt-text').textContent = 'Select a question from the board on the left.';
    document.getElementById('mod-response-text').textContent = '...';
    document.getElementById('mod-media-container').innerHTML = '';

    activeClueId = null;
    currentClueValue = 0; 
});

function attachTeamListeners(teamDiv) {
    const minusBtn = teamDiv.querySelector('.minus');
    const plusBtn = teamDiv.querySelector('.plus');
    const scoreDisplay = teamDiv.querySelector('.score');
    const nameInput = teamDiv.querySelector('input');
    const removeBtn = teamDiv.querySelector('.remove-team'); 

    plusBtn.addEventListener('click', () => {
        let score = parseInt(scoreDisplay.textContent, 10) || 0;
        score += currentClueValue;
        scoreDisplay.textContent = score;
        broadcastScores();
    });

    minusBtn.addEventListener('click', () => {
        let score = parseInt(scoreDisplay.textContent, 10) || 0;
        score -= currentClueValue;
        scoreDisplay.textContent = score;
        broadcastScores();
    });
    
    nameInput.addEventListener('input', () => broadcastScores());

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if (confirm(`Remove ${nameInput.value}?`)) {
                teamDiv.remove(); 
                broadcastScores(); 
            }
        });
    }
}

document.querySelectorAll('.team').forEach(attachTeamListeners);

// Handle the "Add New Team" button (Unified logic to prevent duplicates)
document.getElementById('btn-add-team').addEventListener('click', () => {
    const teamContainer = document.getElementById('team-scores');
    const teamCount = document.querySelectorAll('.team').length + 1; 
    
    const newTeam = document.createElement('div');
    newTeam.className = 'team';
    
    newTeam.innerHTML = `
        <input type="text" value="Team ${teamCount}">
        <div class="score-controls">
            <button class="minus">-</button>
            <span class="score">0</span>
            <button class="plus">+</button>
            <button class="remove-team" title="Remove Team">✖</button>
        </div>
    `;
    
    teamContainer.insertBefore(newTeam, document.getElementById('btn-add-team'));
    attachTeamListeners(newTeam);
    broadcastScores(); 
});

function broadcastScores() {
    const teams = Array.from(document.querySelectorAll('.team')).map(teamDiv => ({
        name: teamDiv.querySelector('input').value,
        score: parseInt(teamDiv.querySelector('.score').textContent, 10) || 0
    }));
    
    gameChannel.postMessage({ type: 'UPDATE_SCORES', teams: teams });
}

document.getElementById('btn-reset-game').addEventListener('click', () => {
    if (!confirm("Are you sure you want to reset the game? This will clear all scores and board progress.")) {
        return; 
    }

    document.querySelectorAll('.cell.points').forEach(cell => {
        cell.classList.remove('answered');
    });

    document.querySelectorAll('.team').forEach(teamDiv => {
        teamDiv.querySelector('.score').textContent = '0';
    });

    document.getElementById('current-category').textContent = 'Category - Point Value';
    document.getElementById('mod-prompt-text').textContent = 'Select a question from the board on the left.';
    document.getElementById('mod-response-text').textContent = '...';
    document.getElementById('mod-media-container').innerHTML = '';

    activeClueId = null;
    currentClueValue = 0;

    gameChannel.postMessage({ type: 'RESET_GAME' });
    broadcastScores(); 
});

// --- FINAL JEOPARDY LOGIC ---
document.getElementById('btn-fj-category').addEventListener('click', () => {
    const cat = document.getElementById('fj-category').value || 'Final Jeopardy';
    gameChannel.postMessage({ type: 'SHOW_FJ_CATEGORY', category: cat });
});

document.getElementById('btn-fj-prompt').addEventListener('click', () => {
    const prompt = document.getElementById('fj-prompt').value || '...';
    gameChannel.postMessage({ type: 'SHOW_FJ_PROMPT', prompt: prompt });
});

document.getElementById('btn-fj-answer').addEventListener('click', () => {
    const answer = document.getElementById('fj-answer').value || '...';
    gameChannel.postMessage({ type: 'SHOW_FJ_ANSWER', answer: answer });
});

document.getElementById('fj-wager-input').addEventListener('input', (e) => {
    currentClueValue = parseInt(e.target.value, 10) || 0;
});