const gameChannel = new BroadcastChannel('jeopardy_game');

// Let the moderator window know the player screen is open
gameChannel.postMessage({ type: 'PLAYER_READY' });

gameChannel.onmessage = (event) => {
    const message = event.data;

    if (message.type === 'LOAD_GAME') {
        buildPlayerBoard(message.data);
    } 
    else if (message.type === 'SHOW_PROMPT') {
        if (message.clueId) {
             const gridCell = document.getElementById(message.clueId);
             if (gridCell) gridCell.classList.add('answered');
        }
        
        const overlay = document.getElementById('active-clue-overlay');
        const textContainer = document.getElementById('clue-text');
        
        // Clear any old media
        const existingMedia = document.getElementById('media-container');
        if (existingMedia) existingMedia.remove();

        // 1. Handle Images
        if (message.mediaType === 'image' && message.mediaUrl) {
            const img = document.createElement('img');
            img.src = message.mediaUrl;
            img.className = 'clue-image';
            img.id = 'media-container';
            overlay.insertBefore(img, textContainer);
            textContainer.textContent = message.prompt;
        } 
        
        // 2. Handle YouTube Audio (Hidden Iframe)
        else if (message.mediaType === 'youtube' && message.mediaUrl) {
            // Extract the video ID safely
            let videoId = "";
            if (message.mediaUrl.includes("v=")) {
                videoId = message.mediaUrl.split('v=')[1].split('&')[0];
            } else if (message.mediaUrl.includes("youtu.be/")) {
                videoId = message.mediaUrl.split('youtu.be/')[1].split('?')[0];
            }
            
            // Generate a random start time between 15 and 45 seconds
            const randomStart = Math.floor(Math.random() * 30) + 15;
            
            const iframe = document.createElement('iframe');
            iframe.id = 'media-container';
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${randomStart}&controls=0&enablejsapi=1`;
            
            // THE FIX: Browsers suspend 0px iframes. Use 1px, make it transparent, and hide it off-screen.
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.opacity = '0.01';
            iframe.style.position = 'absolute';
            iframe.style.top = '-9999px'; 
            iframe.style.left = '-9999px';
            iframe.style.border = 'none';
            
            // THE FIX: Explicitly grant the autoplay permission attribute to this specific iframe
            iframe.setAttribute('allow', 'autoplay');
            
            overlay.appendChild(iframe);
            textContainer.innerHTML = "🎧 <em>Listening to Audio Clue...</em><br>" + message.prompt;
        }

        // 3. Handle Spotify Audio (Host controls it via the Moderator Screen!)
        else if (message.mediaType === 'spotify') {
            textContainer.innerHTML = "🎧 <em>Listening to Audio Clue...</em><br><br>" + message.prompt;
        }
        
        // Command 6: Reset the board
        else if (message.type === 'RESET_GAME') {
            // Remove the 'answered' class from every point cell to make them visible again
            document.querySelectorAll('.cell.points').forEach(cell => {
                cell.classList.remove('answered');
            });
            
            // Force the overlay to close just in case a question was left open
            document.getElementById('active-clue-overlay').classList.remove('show-overlay');
            
            // Destroy any media currently playing
            const existingMedia = document.getElementById('media-container');
            if (existingMedia) existingMedia.remove();
        }
        
        // 3. Handle Standard Text
        else {
            textContainer.innerHTML = message.prompt.replace(/\n/g, '<br>'); // Supports new lines
        }

        overlay.classList.add('show-overlay');
    }
    else if (message.type === 'SHOW_ANSWER') {
        document.getElementById('clue-text').textContent = message.answer;
    } 
   // Destroy the iframe to stop the audio when we close the clue
    else if (message.type === 'CLOSE_CLUE') {
        const overlay = document.getElementById('active-clue-overlay');
        overlay.classList.remove('show-overlay');
        
        const existingMedia = document.getElementById('media-container');
        if (existingMedia) existingMedia.remove();
    }
    else if (message.type === 'UPDATE_SCORES') {
        const scoreBoard = document.getElementById('score-board');
        
        // Check if we need to create new team blocks on the big screen
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

        // Now update the text and numbers for all teams
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