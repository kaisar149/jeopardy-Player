# jeopardy-Player

A serverless, dual-screen web interface for hosting Jeopardy-style trivia games. The system is split into a Moderator View for the host and a Player View for the audience, synchronized locally using the browser's native `BroadcastChannel` API.

## How It Works

The application requires no backend server or database to run. It operates entirely in the browser using HTML, CSS, and JavaScript.

### 1. Dual-Screen Synchronization
State is shared across browser tabs using a `BroadcastChannel` named `jeopardy_game`. When the moderator performs an action (like selecting a clue or updating a score), a message is broadcasted to the player window to update the UI instantly.

### 2. Moderator View (`moderator.html` & `moderator.js`)
This is the host's control dashboard. 
* **Game Initialization:** The host uploads a `game.json` file, which populates the moderator's mini-board and broadcasts the data to build the player's big screen.
* **Game Flow Control:** The host clicks a point value on the mini-board to open a clue. They can then send the prompt to the big screen, reveal the answer, and close the clue using dedicated action buttons.
* **Media Handling (Audio):** For YouTube and Spotify clues, the media iframe is intentionally rendered on the *Moderator* screen. This gives the host complete control over when the audio starts, pauses, or stops, preventing unexpected autoplay issues on the audience screen.
* **Scorekeeping:** The host can add custom teams, change team names, and adjust scores up or down. The math automatically uses the point value of the currently active question. 
* **Game Reset:** A dedicated reset button clears all board progress and resets scores to zero across both screens.

### 3. Player View (`player.html` & `player.js`)
This is the "Big Screen" designed to be cast or shown on a secondary monitor for the audience.
* **Passive Listening:** The player screen does not require any direct interaction; it simply listens for commands from the moderator channel.
* **Visual Display:** It renders the primary game board grid and updates cell states to "answered" when a clue is selected.
* **Clue Overlay:** When a prompt is triggered, an overlay appears over the board. Standard text questions and image URLs are displayed directly on this overlay. For audio clues (YouTube/Spotify), it displays a "🎧 *Listening to Audio Clue...*" placeholder while the host manages the playback.
* **Live Scoreboard:** Displays real-time team names and scores synced from the moderator's dashboard.

## Usage

1. Open `moderator.html` in a modern web browser.
2. Click **Choose File** and upload a valid `game.json` file.
3. Click the **1. Open Big Screen** button to launch `player.html` in a new tab or window.
4. Drag the Player View to your secondary monitor or projector.
5. Use the Moderator View to drive the game flow, read the correct responses, and manage team scores.
