const gameChannel = new BroadcastChannel('jeopardy_game');

gameChannel.postMessage({ type: 'PLAYER_READY' });

gameChannel.onmessage = (event) => {
    const message = event.data;

    if (message.type === 'LOAD_GAME') {
        buildPlayerBoard(message.data);
    } 
    // NEW: Handle the Daily Double splash screen
    else if (message.type === 'SHOW_DAILY_DOUBLE') {
        if (message.clueId) {
             const gridCell = document.getElementById(message.clueId);
             if (gridCell) gridCell.classList.add('answered');
        }
        
        const overlay = document.getElementById('active-clue-overlay');
        const textContainer = document.getElementById('clue-text');
        
        const existingMedia = document.getElementById('media-container');
        if (existingMedia) existingMedia.remove();

        // Display the Daily Double Graphic
        textContainer.innerHTML = "<div style='font-size: 8vw; color: var(--neon-yellow); text-transform: uppercase; font-weight: 900; letter-spacing: 5px; text-shadow: 0 0 30px rgba(255, 204, 0, 0.8), 5px 5px 10px rgba(0,0,0,1);'>Daily Double</div>";

        overlay.classList.add('show-overlay');
    }
    else if (message.type === 'SHOW_PROMPT') {
        if (message.clueId) {
             const gridCell = document.getElementById(message.clueId);
             if (gridCell) gridCell.classList.add('answered');
        }
        
        const overlay = document.getElementById('active-clue-overlay');
        const textContainer = document.getElementById('clue-text');
        
        const existingMedia = document.getElementById('media-container');
        if (existingMedia) existingMedia.remove();

        if (message.mediaType === 'image' && message.mediaUrl) {
            const img = document.createElement('img');
            img.src = message.mediaUrl;
            img.className = 'clue-image';
            img.id = 'media-container';
            overlay.insertBefore(img, textContainer);
            textContainer.textContent = message.prompt;
        } 
        else if (message.mediaType === 'youtube' || message.mediaType === 'spotify') {
            textContainer.innerHTML = "🎧 <em>Listening to Audio Clue...</em><br><br>" + message.prompt;
        }
        else if (message.type === 'RESET_GAME') {
            document.querySelectorAll('.cell.points').forEach(cell => {
                cell.classList.remove('answered');
            });
            
            document.getElementById('active-clue-overlay').classList.remove('show-overlay');
            
            const existingMedia = document.getElementById('media-container');
            if (existingMedia) existingMedia.remove();
        }
        else {
            textContainer.innerHTML = message.prompt.replace(/\n/g, '<br>'); 
        }

        overlay.classList.add('show-overlay');
    }
    else if (message.type === 'SHOW_ANSWER') {
        document.getElementById('clue-text').textContent = message.answer;
    } 
    else if (message.type === 'CLOSE_CLUE') {
        const overlay = document.getElementById('active-clue-overlay');
        overlay.classList.remove('show-overlay');
        
        const existingMedia = document.getElementById('media-container');
        if (existingMedia) existingMedia.remove();
    }
    else if (message.type === 'UPDATE_SCORES') {
        const scoreBoard = document.getElementById('score-board');
        
        while (scoreBoard.children.length < message.teams.length) {
            const newIndex = scoreBoard.children.length;
            const newTeamDiv = document.createElement('div');
            newTeamDiv.className = 'player-team';
            newTeamDiv.id = `display-team-${newIndex}`;
            newTeamDiv.innerHTML = `
                <div class="team-name">Team ${newIndex + 1}</div>
                <div class="team-score">0</div>
            `;
            scoreBoard.appendChild(newTeamDiv);
        }

        message.teams.forEach((team, index) => {
            const teamDiv = document.getElementById(`display-team-${index}`);
            if (teamDiv) {
                teamDiv.querySelector('.team-name').textContent = team.name;
                teamDiv.querySelector('.team-score').textContent = team.score;
            }
        });
    }
};

function buildPlayerBoard(data) {
    const board = document.getElementById('game-board');
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
            pointsDiv.id = `clue-${col}-${row}`; 
            pointsDiv.textContent = clue.points;
            board.appendChild(pointsDiv);
        }
    }
}