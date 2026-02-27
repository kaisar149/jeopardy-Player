const gameChannel = new BroadcastChannel('jeopardy_game');

let gameData = null;
let activeClueId = null; 
let currentClueValue = 0; 

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
            pointsDiv.textContent = clue.points;
            
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
    document.getElementById('current-category').textContent = `${gameData.categories[col].name} - ${clue.points}`;
    document.getElementById('mod-prompt-text').textContent = clue.prompt + (clue.url ? ` (${clue.type.toUpperCase()})` : '');
    document.getElementById('mod-response-text').textContent = clue.response;
    
    // NEW: Handle Media on the Moderator Screen
    const mediaContainer = document.getElementById('mod-media-container');
    mediaContainer.innerHTML = ''; // Clear previous media
    
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
        //iframe.frameBorder = "0";
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
            // We do NOT use autoplay here so you have full control over when the audio starts!
            iframe.src = `https://www.youtube.com/embed/${videoId}?controls=1`;
            iframe.width = "100%";
            iframe.height = "200"; // A nice height for the control panel
            //iframe.frameBorder = "0";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.style.borderRadius = "8px";
            
            mediaContainer.appendChild(iframe);
        }
    }
    
    cellElement.classList.add('answered');
    activeClueId = `clue-${col}-${row}`;
    currentClueValue = parseInt(clue.points, 10) || 0;

    // Beam the command to the big screen
    gameChannel.postMessage({ 
        type: 'SHOW_PROMPT', 
        clueId: activeClueId, 
        prompt: clue.prompt,
        mediaType: clue.type || 'text',
        mediaUrl: clue.url || null
    });
}

// Wire up the Control Panel Buttons
document.getElementById('btn-show-prompt').addEventListener('click', () => {
    const promptText = document.getElementById('mod-prompt-text').textContent;
    gameChannel.postMessage({ type: 'SHOW_PROMPT', prompt: promptText });
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

    // NEW: Destroy the Spotify player to stop the music!
    document.getElementById('mod-media-container').innerHTML = '';

    activeClueId = null;
    currentClueValue = 0; // Reset point value
});

// --- NEW SCORE BUTTON LOGIC ---

// Helper function to attach click events to a team's row
function attachTeamListeners(teamDiv) {
    const minusBtn = teamDiv.querySelector('.minus');
    const plusBtn = teamDiv.querySelector('.plus');
    const scoreDisplay = teamDiv.querySelector('.score');
    const nameInput = teamDiv.querySelector('input');

    plusBtn.addEventListener('click', () => {
        // Read the current score directly from the HTML to prevent math errors
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
}

// Attach listeners to the 3 teams already hardcoded in the HTML
document.querySelectorAll('.team').forEach(attachTeamListeners);

// Handle the "Add New Team" button
document.getElementById('btn-add-team').addEventListener('click', () => {
    const teamContainer = document.getElementById('team-scores');
    const teamCount = document.querySelectorAll('.team').length + 1; // Figure out what number this team is
    
    // Create the HTML for the new team row
    const newTeam = document.createElement('div');
    newTeam.className = 'team';
    newTeam.innerHTML = `
        <input type="text" value="Team ${teamCount}">
        <div class="score-controls">
            <button class="minus">-</button>
            <span class="score">0</span>
            <button class="plus">+</button>
        </div>
    `;
    
    // Insert it right above the "Add New Team" button
    teamContainer.insertBefore(newTeam, document.getElementById('btn-add-team'));
    
    // Attach the math logic to this new row
    attachTeamListeners(newTeam);
    
    // Beam the updated list to the big screen!
    broadcastScores(); 
});

// Function to read all scores and beam them to the player window
function broadcastScores() {
    const teams = Array.from(document.querySelectorAll('.team')).map(teamDiv => ({
        name: teamDiv.querySelector('input').value,
        score: parseInt(teamDiv.querySelector('.score').textContent, 10) || 0
    }));
    
    gameChannel.postMessage({ type: 'UPDATE_SCORES', teams: teams });
}

// --- RESET GAME LOGIC ---
document.getElementById('btn-reset-game').addEventListener('click', () => {
    // 1. Confirm with the moderator to prevent accidental clicks
    if (!confirm("Are you sure you want to reset the game? This will clear all scores and board progress.")) {
        return; 
    }

    // 2. Clear the 'answered' state from the moderator's mini-board
    document.querySelectorAll('.cell.points').forEach(cell => {
        cell.classList.remove('answered');
    });

    // 3. Reset all team scores back to 0
    document.querySelectorAll('.team').forEach(teamDiv => {
        teamDiv.querySelector('.score').textContent = '0';
    });

    // 4. Reset the Active Question Control Panel
    document.getElementById('current-category').textContent = 'Category - Point Value';
    document.getElementById('mod-prompt-text').textContent = 'Select a question from the board on the left.';
    document.getElementById('mod-response-text').textContent = '...';

    // NEW: Destroy the Spotify player to stop the music!
    document.getElementById('mod-media-container').innerHTML = '';

    activeClueId = null;
    currentClueValue = 0;

    // 5. Broadcast the reset command and the new zeroed scores to the Player screen
    gameChannel.postMessage({ type: 'RESET_GAME' });
    broadcastScores(); 
});