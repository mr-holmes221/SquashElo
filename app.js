// Player class
class Player {
    constructor(name, eloRating = 1200, isActive = true) {
        this.name = name;
        this.eloRating = eloRating;
        this.isActive = isActive;
    }
}

// Match class
class Match {
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.winner = null;
        this.completed = false;
        this.timestamp = Date.now(); // Track match completion time
    }

    setWinner(winner) {
        this.winner = winner;
        this.completed = true;
        this.updateElo();
    }

    updateElo() {
        const K = 32; // K-factor
        const expected1 = 1 / (1 + Math.pow(10, (this.player2.eloRating - this.player1.eloRating) / 400));
        const expected2 = 1 / (1 + Math.pow(10, (this.player1.eloRating - this.player2.eloRating) / 400));
        const score1 = (this.winner === this.player1) ? 1 : 0;
        const score2 = (this.winner === this.player2) ? 1 : 0;

        this.player1.eloRating += K * (score1 - expected1);
        this.player2.eloRating += K * (score2 - expected2);
    }
}

// Global variables
let players = [];
let matches = [];
let matchHistory = [];

// Load data from localStorage on page load
window.onload = function() {
    loadData();
    displayPlayers();
    displayMatches();
    displayOldMatches();
    updateRankingTable();
    displayMatchHistory();
    updateCountdownTimer();
    setInterval(updateCountdownTimer, 1000); // Update the countdown every second
};

// Add player
function addPlayer() {
    const playerName = document.getElementById('playerName').value.trim();
    if (playerName && !players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        const newPlayer = new Player(playerName);
        players.push(newPlayer);
        saveData();
        displayPlayers();
        updateRankingTable();
        document.getElementById('playerName').value = '';
    } else {
        alert("Player name is empty or already exists!");
    }
}

// Remove player
function removePlayer(playerName) {
    if (!confirm(`Are you sure you want to remove ${playerName}? This will also remove any ongoing matches involving this player.`)) {
        return;
    }

    players = players.filter(player => player.name !== playerName);

    // Remove any ongoing matches involving this player
    const removedMatches = matches.filter(match => 
        match.player1.name === playerName || match.player2.name === playerName
    );

    matches = matches.filter(match => 
        match.player1.name !== playerName && match.player2.name !== playerName
    );

    saveData();
    displayPlayers();
    displayMatches();
    updateRankingTable();
}

// Toggle player active status
function togglePlayerStatus(playerName) {
    const player = players.find(p => p.name === playerName);
    if (player) {
        player.isActive = !player.isActive;
        saveData();
        displayPlayers();
        updateRankingTable();
    }
}

// Display players with Remove and Inactive buttons
function displayPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    players.forEach((player) => {
        const li = document.createElement('li');
        li.textContent = `${player.name}`; // Removed Elo rating from display
        li.classList.add(player.isActive ? 'active-player' : 'inactive-player');

        // Create Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('remove-btn');
        removeBtn.onclick = () => removePlayer(player.name);
        li.appendChild(removeBtn);

        // Create Toggle Active button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = player.isActive ? 'Set Inactive' : 'Set Active';
        toggleBtn.classList.add('inactive-btn');
        toggleBtn.onclick = () => togglePlayerStatus(player.name);
        li.appendChild(toggleBtn);

        playerList.appendChild(li);
    });
}

// Create or refresh matches
function createMatches() {
    const newMatches = [];
    const activePlayers = players.filter(player => player.isActive);
    const shuffledPlayers = [...activePlayers].sort((a, b) => a.eloRating - b.eloRating);

    for (let i = 0; i < shuffledPlayers.length; i += 2) {
        if (i + 1 < shuffledPlayers.length) {
            const existingMatch = matches.find(m => !m.completed && 
                (m.player1 === shuffledPlayers[i] || m.player2 === shuffledPlayers[i + 1]));
            
            if (!existingMatch) {
                newMatches.push(new Match(shuffledPlayers[i], shuffledPlayers[i + 1]));
            }
        }
    }

    matches = [...newMatches, ...matches];
    saveData();
    displayMatches();
}

// Display current matches
function displayMatches() {
    const matchList = document.getElementById('matchList');
    matchList.innerHTML = '';

    matches.forEach((match, index) => {
        if (!match.completed) {
            const li = document.createElement('li');
            li.textContent = `${match.player1.name} vs ${match.player2.name}`;
            
            // Add winner button
            const p1Button = document.createElement('button');
            p1Button.textContent = `${match.player1.name} Wins`;
            p1Button.onclick = () => completeMatch(index, match.player1);
            li.appendChild(p1Button);

            const p2Button = document.createElement('button');
            p2Button.textContent = `${match.player2.name} Wins`;
            p2Button.onclick = () => completeMatch(index, match.player2);
            li.appendChild(p2Button);

            matchList.appendChild(li);
        }
    });
}

// Complete a match and update Elo ratings
function completeMatch(matchIndex, winner) {
    const match = matches[matchIndex];
    match.setWinner(winner);

    // Remove completed match from current matches list
    matches = matches.filter((_, index) => index !== matchIndex);

    // Add completed match to history
    matchHistory.push(match);

    saveData();
    displayMatches();
    displayOldMatches();
    updateRankingTable();
    displayMatchHistory();
}

// Display old matches
function displayOldMatches() {
    const oldMatchList = document.getElementById('oldMatchList');
    oldMatchList.innerHTML = '';

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    matchHistory = matchHistory.filter(match => now - match.timestamp < oneDay);

    matchHistory.slice(-5).forEach((match) => {
        const li = document.createElement('li');
        li.textContent = `${match.player1.name} vs ${match.player2.name} - Winner: ${match.winner.name}`;
        li.classList.add('completed-match');
        oldMatchList.appendChild(li);
    });
}

// Update countdown timer for old match removal
function updateCountdownTimer() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const removalCountdown = document.getElementById('removalCountdown');

    // Calculate time remaining until oldest match is removed
    const oldestMatch = matchHistory.reduce((oldest, match) => 
        !oldest || match.timestamp < oldest.timestamp ? match : oldest, null);
    
    if (oldestMatch) {
        const timeLeft = oneDay - (now - oldestMatch.timestamp);
        removalCountdown.textContent = Math.max(0, Math.floor(timeLeft / (60 * 1000))); // Display in minutes
    } else {
        removalCountdown.textContent = '0';
    }
}

// Display ranking table
function updateRankingTable() {
    const rankingTableBody = document.querySelector('#rankingTable tbody');
    rankingTableBody.innerHTML = '';

    players.sort((a, b) => b.eloRating - a.eloRating).forEach(player => {
        const row = rankingTableBody.insertRow();
        row.insertCell(0).textContent = player.name;
        row.insertCell(1).textContent = player.eloRating.toFixed(2);
        row.insertCell(2).textContent = player.isActive ? 'Active' : 'Inactive';

        const actionCell = row.insertCell(3);
        
        // Remove button with margin-right for spacing
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('remove-btn');
        actionCell.appendChild(removeBtn);

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = player.isActive ? 'Set Inactive' : 'Set Active';
        toggleBtn.classList.add('inactive-btn');
        actionCell.appendChild(toggleBtn);

        // Attach events
        removeBtn.onclick = () => removePlayer(player.name);
        toggleBtn.onclick = () => togglePlayerStatus(player.name);
    });
}

// Display match history
function displayMatchHistory() {
    const matchHistoryList = document.getElementById('matchHistory');
    matchHistoryList.innerHTML = '';

    matchHistory.forEach(match => {
        const li = document.createElement('li');
        li.textContent = `${match.player1.name} vs ${match.player2.name} - Winner: ${match.winner.name}`;
        matchHistoryList.appendChild(li);
    });
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('matches', JSON.stringify(matches));
    localStorage.setItem('matchHistory', JSON.stringify(matchHistory));
}

// Load data from localStorage
function loadData() {
    players = JSON.parse(localStorage.getItem('players')) || [];
    matches = JSON.parse(localStorage.getItem('matches')) || [];
    matchHistory = JSON.parse(localStorage.getItem('matchHistory')) || [];
}

// Initiate reset process
function initiateReset() {
    document.getElementById('resetConfirmation').style.display = 'block';
    document.getElementById('resetButton').style.display = 'none';
}

// Confirm reset and clear all data
function confirmReset() {
    players = [];
    matches = [];
    matchHistory = [];
    saveData();
    displayPlayers();
    displayMatches();
    displayOldMatches();
    updateRankingTable();
    displayMatchHistory();
    cancelReset();
}

// Cancel reset process
function cancelReset() {
    document.getElementById('resetConfirmation').style.display = 'none';
    document.getElementById('resetButton').style.display = 'block';
}
// Display players with Remove and Inactive buttons, sorted by active and inactive
function displayPlayers() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    // Sort players: active first, inactive later
    const sortedPlayers = players.slice().sort((a, b) => b.isActive - a.isActive);

    sortedPlayers.forEach((player) => {
        const li = document.createElement('li');
        li.textContent = `${player.name}`; // Removed Elo rating from display
        li.classList.add(player.isActive ? 'active-player' : 'inactive-player');

        // Create Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('remove-btn');
        removeBtn.onclick = () => removePlayer(player.name);
        li.appendChild(removeBtn);

        // Create Toggle Active button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = player.isActive ? 'Set Inactive' : 'Set Active';
        toggleBtn.classList.add('inactive-btn');
        toggleBtn.onclick = () => togglePlayerStatus(player.name);
        li.appendChild(toggleBtn);

        playerList.appendChild(li);
    });
}
