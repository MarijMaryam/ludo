document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('ludoCanvas');
    const ctx = canvas.getContext('2d');
    const rollDiceBtn = document.getElementById('rollDiceBtn');
    const startGameBtn = document.getElementById('startGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const statusDisplay = document.getElementById('statusDisplay');

    // Set canvas size (will be responsive via CSS)
    // For drawing purposes, we'll use a fixed internal resolution and scale it with CSS
    const boardSize = 600; // Internal resolution for drawing
    canvas.width = boardSize;
    canvas.height = boardSize;
    const cellSize = boardSize / 15; // Each cell is 1/15th of the board size

    // Game state variables
    let players = [];
    let currentPlayerIndex = 0;
    let diceResult = 0;
    let gameStarted = false;
    let consecutiveSixes = 0;

    // Define player colors
    const playerColors = {
        Red: '#FF0000',
        Green: '#008000',
        Yellow: '#FFFF00',
        Blue: '#0000FF'
    };

    // Define board paths and safe zones
    // Each coordinate is a [row, col] on a 15x15 grid
    const paths = {
        // Main path around the board (clockwise)
        main: [
            [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // Red start to middle
            [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // Top-left corner
            [0, 7], // Top middle
            [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // Top-right corner
            [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // Blue start to middle
            [7, 14], // Right middle
            [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // Yellow start to middle
            [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // Bottom-right corner
            [14, 7], // Bottom middle
            [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // Bottom-left corner
            [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // Green start to middle
            [7, 0] // Left middle
        ],
        // Home paths for each player (leading to the center)
        homeRed: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
        homeGreen: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
        homeYellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
        homeBlue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]]
    };

    // Safe zones (starred squares) and player start positions on main path
    const safeZones = {
        Red: [paths.main[0], paths.main[8], paths.main[13], paths.main[21], paths.main[26], paths.main[34]], // Red's start, plus other stars
        Green: [paths.main[13], paths.main[21], paths.main[26], paths.main[34], paths.main[42], paths.main[5]], // Green's start, plus other stars
        Yellow: [paths.main[26], paths.main[34], paths.main[42], paths.main[5], paths.main[0], paths.main[18]], // Yellow's start, plus other stars
        Blue: [paths.main[39], paths.main[42], paths.main[5], paths.main[0], paths.main[13], paths.main[31]] // Blue's start, plus other stars
    };

    const playerStartPositions = {
        Red: paths.main[0],
        Green: paths.main[13],
        Yellow: paths.main[26],
        Blue: paths.main[39]
    };

    // Base positions for pieces (relative to their base area)
    const basePositions = {
        Red: [[1, 1], [1, 4], [4, 1], [4, 4]],
        Green: [[10, 1], [10, 4], [13, 1], [13, 4]],
        Yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
        Blue: [[1, 10], [1, 13], [4, 10], [4, 13]]
    };

    // --- Game Initialization and Drawing ---

    function getCellCoords(row, col) {
        return { x: col * cellSize, y: row * cellSize };
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the main grid lines
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 15; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, boardSize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(boardSize, i * cellSize);
            ctx.stroke();
        }

        // Draw player bases
        drawPlayerBases();

        // Draw main path cells
        paths.main.forEach((pos, index) => {
            const { x, y } = getCellCoords(pos[0], pos[1]);
            ctx.fillStyle = '#e0e0e0'; // Path color
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(x, y, cellSize, cellSize);

            // Highlight safe zones with a star
            const isSafe = Object.values(safeZones).some(zone => zone.some(safePos => safePos[0] === pos[0] && safePos[1] === pos[1]));
            if (isSafe) {
                drawStar(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 5, 0.5);
            }
        });

        // Draw home paths and home triangle
        drawHomePaths();
        drawHomeTriangle();
    }

    function drawPlayerBases() {
        const baseColors = { Red: 'rgba(255, 0, 0, 0.2)', Green: 'rgba(0, 128, 0, 0.2)', Yellow: 'rgba(255, 255, 0, 0.2)', Blue: 'rgba(0, 0, 255, 0.2)' };
        const baseBorderColors = { Red: 'red', Green: 'green', Yellow: 'yellow', Blue: 'blue' };

        // Red Base (Top-Left)
        ctx.fillStyle = baseColors.Red;
        ctx.fillRect(0, 0, cellSize * 6, cellSize * 6);
        ctx.strokeStyle = baseBorderColors.Red;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, cellSize * 6, cellSize * 6);

        // Green Base (Bottom-Left)
        ctx.fillStyle = baseColors.Green;
        ctx.fillRect(0, cellSize * 9, cellSize * 6, cellSize * 6);
        ctx.strokeStyle = baseBorderColors.Green;
        ctx.strokeRect(0, cellSize * 9, cellSize * 6, cellSize * 6);

        // Yellow Base (Bottom-Right)
        ctx.fillStyle = baseColors.Yellow;
        ctx.fillRect(cellSize * 9, cellSize * 9, cellSize * 6, cellSize * 6);
        ctx.strokeStyle = baseBorderColors.Yellow;
        ctx.strokeRect(cellSize * 9, cellSize * 9, cellSize * 6, cellSize * 6);

        // Blue Base (Top-Right)
        ctx.fillStyle = baseColors.Blue;
        ctx.fillRect(cellSize * 9, 0, cellSize * 6, cellSize * 6);
        ctx.strokeStyle = baseBorderColors.Blue;
        ctx.strokeRect(cellSize * 9, 0, cellSize * 6, cellSize * 6);
    }

    function drawHomePaths() {
        const homePathColors = { Red: 'rgba(255, 0, 0, 0.1)', Green: 'rgba(0, 128, 0, 0.1)', Yellow: 'rgba(255, 255, 0, 0.1)', Blue: 'rgba(0, 0, 255, 0.1)' };

        // Red home path
        paths.homeRed.forEach(pos => {
            const { x, y } = getCellCoords(pos[0], pos[1]);
            ctx.fillStyle = homePathColors.Red;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = 'red';
            ctx.strokeRect(x, y, cellSize, cellSize);
        });

        // Green home path
        paths.homeGreen.forEach(pos => {
            const { x, y } = getCellCoords(pos[0], pos[1]);
            ctx.fillStyle = homePathColors.Green;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = 'green';
            ctx.strokeRect(x, y, cellSize, cellSize);
        });

        // Yellow home path
        paths.homeYellow.forEach(pos => {
            const { x, y } = getCellCoords(pos[0], pos[1]);
            ctx.fillStyle = homePathColors.Yellow;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = 'yellow';
            ctx.strokeRect(x, y, cellSize, cellSize);
        });

        // Blue home path
        paths.homeBlue.forEach(pos => {
            const { x, y } = getCellCoords(pos[0], pos[1]);
            ctx.fillStyle = homePathColors.Blue;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = 'blue';
            ctx.strokeRect(x, y, cellSize, cellSize);
        });
    }

    function drawHomeTriangle() {
        const center = boardSize / 2;
        const halfHomeSize = cellSize * 2.5;

        ctx.beginPath();
        ctx.moveTo(center, center - halfHomeSize); // Top point
        ctx.lineTo(center + halfHomeSize, center); // Right point
        ctx.lineTo(center, center + halfHomeSize); // Bottom point
        ctx.lineTo(center - halfHomeSize, center); // Left point
        ctx.closePath();
        ctx.fillStyle = '#888'; // Home center color
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawStar(cx, cy, outerRadius, points, innerRadiusRatio) {
        const innerRadius = outerRadius * innerRadiusRatio;
        let rot = Math.PI / 2 * 3; // Start from top
        let x = cx;
        let y = cy;
        const step = Math.PI / points;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < points; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.closePath();
        ctx.fillStyle = 'gold';
        ctx.strokeStyle = 'darkgoldenrod';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }

    function drawPieces(highlightedMoves = []) {
        players.forEach(player => {
            player.pieces.forEach(piece => {
                let posCoords;
                if (piece.isHome) {
                    // Pieces that reached home are drawn in the center
                    posCoords = { x: boardSize / 2, y: boardSize / 2 };
                } else if (piece.inBase) {
                    posCoords = getCellCoords(basePositions[player.color][piece.id][0], basePositions[player.color][piece.id][1]);
                } else { // Piece is on the main path or home path
                    // Ensure currentPos is a valid array before accessing its elements
                    if (Array.isArray(piece.currentPos) && piece.currentPos.length === 2) {
                        posCoords = getCellCoords(piece.currentPos[0], piece.currentPos[1]);
                    } else {
                        // Fallback or error handling if currentPos is not as expected
                        console.error("Invalid piece.currentPos for piece:", piece);
                        return; // Skip drawing this piece to avoid further errors
                    }
                }

                const isHighlighted = highlightedMoves.some(move => move.piece === piece);
                drawPiece(posCoords.x + cellSize / 2, posCoords.y + cellSize / 2, player.color, isHighlighted);
            });
        });
    }

    function drawPiece(x, y, color, isHighlighted = false) {
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = playerColors[color];
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isHighlighted) {
            ctx.strokeStyle = 'cyan'; // Highlight color
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    function updateStatus(message) {
        statusDisplay.textContent = message;
    }

    // Helper functions for piece movement
    function getPathIndex(coords) {
        for (let i = 0; i < paths.main.length; i++) {
            if (paths.main[i][0] === coords[0] && paths.main[i][1] === coords[1]) {
                return i;
            }
        }
        return -1; // Not found on main path
    }

    function getHomePathIndex(playerColor, coords) {
        const homePath = paths[`home${playerColor}`];
        for (let i = 0; i < homePath.length; i++) {
            if (homePath[i][0] === coords[0] && homePath[i][1] === coords[1]) {
                return i;
            }
        }
        return -1; // Not found on home path
    }

    function getPossibleMoves(player, diceRoll) {
        const possibleMoves = [];

        player.pieces.forEach(piece => {
            if (piece.isHome) {
                return; // Piece is already home, cannot move
            }

            if (piece.inBase) {
                if (diceRoll === 6) {
                    // Piece can move out of base
                    possibleMoves.push({ piece: piece, newPos: player.startPos, type: 'outOfBase' });
                }
            } else if (piece.inHomePath) {
                const currentHomeIndex = getHomePathIndex(player.color, piece.currentPos);
                const newHomeIndex = currentHomeIndex + diceRoll;
                if (newHomeIndex < player.homePath.length) {
                    // Move within home path
                    possibleMoves.push({ piece: piece, newPos: player.homePath[newHomeIndex], type: 'inHomePath' });
                } else if (newHomeIndex === player.homePath.length) {
                    // Move to home triangle
                    possibleMoves.push({ piece: piece, newPos: 'homeTriangle', type: 'toHome' });
                }
            } else { // On main path
                const currentPathIndex = getPathIndex(piece.currentPos);
                let newPathIndex = currentPathIndex + diceRoll;

                // Check if entering home path
                const playerMainPathStart = getPathIndex(player.startPos);
                // Adjust playerHomeEntranceIndex to be the cell *before* the home path entry
                let playerHomeEntranceIndex;
                if (player.color === 'Red') playerHomeEntranceIndex = getPathIndex([6, 5]); // Cell before Red's home path
                else if (player.color === 'Green') playerHomeEntranceIndex = getPathIndex([8, 6]); // Cell before Green's home path
                else if (player.color === 'Yellow') playerHomeEntranceIndex = getPathIndex([8, 9]); // Cell before Yellow's home path
                else if (player.color === 'Blue') playerHomeEntranceIndex = getPathIndex([6, 9]); // Cell before Blue's home path


                // Handle wrapping around the board for newPathIndex
                let potentialNewPathIndex = currentPathIndex + diceRoll;
                let actualNewPathIndex = potentialNewPathIndex;

                if (currentPathIndex <= playerHomeEntranceIndex && potentialNewPathIndex > playerHomeEntranceIndex) {
                    // Entering home path
                    const stepsIntoHome = potentialNewPathIndex - playerHomeEntranceIndex;
                    if (stepsIntoHome <= player.homePath.length) {
                        possibleMoves.push({ piece: piece, newPos: player.homePath[stepsIntoHome - 1], type: 'toHomePath' });
                    } else {
                        // Overshot home, invalid move
                    }
                } else {
                    // Moving on main path or already passed home path entry
                    actualNewPathIndex = actualNewPathIndex % paths.main.length;
                    possibleMoves.push({ piece: piece, newPos: paths.main[actualNewPathIndex], type: 'onMainPath' });
                }
            }
        });
        return possibleMoves;
    }

    // --- Game Logic ---

    let currentPossibleMoves = []; // Store possible moves after dice roll

    function rollDice() {
        if (!gameStarted) {
            updateStatus("Please start the game first!");
            return;
        }

        diceResult = Math.floor(Math.random() * 6) + 1;
        updateStatus(`Player ${players[currentPlayerIndex].name} rolled a ${diceResult}`);

        if (diceResult === 6) {
            consecutiveSixes++;
            if (consecutiveSixes === 3) {
                updateStatus(`Player ${players[currentPlayerIndex].name} rolled three 6s! Turn skipped.`);
                consecutiveSixes = 0;
                currentPossibleMoves = []; // Clear moves
                nextTurn();
                return;
            }
        } else {
            consecutiveSixes = 0;
        }

        const currentPlayer = players[currentPlayerIndex];
        currentPossibleMoves = getPossibleMoves(currentPlayer, diceResult);

        if (currentPossibleMoves.length === 0) {
            updateStatus(`Player ${currentPlayer.name} has no valid moves. Passing turn.`);
            setTimeout(nextTurn, 1500);
        } else {
            updateStatus(`Player ${currentPlayer.name} rolled a ${diceResult}. Select a piece to move.`);
            drawBoard(); // Redraw board to clear previous highlights
            drawPieces(currentPossibleMoves); // Draw pieces with highlights
        }
    }

    function movePiece(piece, newPos, moveType) {
        const currentPlayer = players[currentPlayerIndex];

        if (moveType === 'outOfBase') {
            piece.inBase = false;
            piece.currentPos = newPos;
        } else if (moveType === 'toHomePath') {
            piece.inHomePath = true;
            piece.currentPos = newPos;
        } else if (moveType === 'inHomePath') {
            piece.currentPos = newPos;
        } else if (moveType === 'toHome') {
            piece.isHome = true;
            piece.inHomePath = false;
            piece.currentPos = null; // Piece is in the home triangle, no specific cell
        } else { // onMainPath
            piece.currentPos = newPos;

            // Check for captures
            players.forEach(otherPlayer => {
                if (otherPlayer !== currentPlayer) {
                    otherPlayer.pieces.forEach(otherPiece => {
                        if (!otherPiece.inBase && !otherPiece.inHomePath && !otherPiece.isHome &&
                            otherPiece.currentPos[0] === piece.currentPos[0] &&
                            otherPiece.currentPos[1] === piece.currentPos[1]) {
                            // Capture! Send otherPiece back to base
                            updateStatus(`${currentPlayer.name} captured ${otherPlayer.name}'s piece!`);
                            otherPiece.inBase = true;
                            otherPiece.currentPos = basePositions[otherPiece.color][otherPiece.id];
                        }
                    });
                }
            });
        }

        drawBoard();
        drawPieces();

        // Check for win condition
        if (currentPlayer.pieces.every(p => p.isHome)) {
            updateStatus(`${currentPlayer.name} wins the game!`);
            gameStarted = false;
            rollDiceBtn.disabled = true;
            return;
        }

        if (diceResult !== 6) {
            nextTurn();
        } else {
            updateStatus(`${currentPlayer.name} rolled a 6! Roll again.`);
        }
        currentPossibleMoves = []; // Clear moves after a piece is moved
    }

    function nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        updateStatus(`It's Player ${players[currentPlayerIndex].name}'s turn.`);
        drawBoard(); // Redraw to clear any highlights
        drawPieces(); // Redraw pieces in their current positions
    }

    function startGame() {
        const numPlayers = 4; // Default to 4 for testing
        players = [];
        const colors = ['Red', 'Green', 'Yellow', 'Blue'];

        for (let i = 0; i < numPlayers; i++) {
            const playerColor = colors[i];
            const playerPieces = [];
            for (let j = 0; j < 4; j++) {
                playerPieces.push({
                    id: j,
                    color: playerColor,
                    currentPos: basePositions[playerColor][j], // Initial position in base
                    inBase: true,
                    inHomePath: false,
                    isHome: false
                });
            }

            players.push({
                name: `Player ${playerColor}`,
                color: playerColor,
                pieces: playerPieces,
                startPos: playerStartPositions[playerColor],
                homePath: paths[`home${playerColor}`],
                basePos: basePositions[playerColor]
            });
        }
        currentPlayerIndex = 0;
        consecutiveSixes = 0;
        gameStarted = true;
        rollDiceBtn.disabled = false;
        updateStatus(`Game started! It's Player ${players[currentPlayerIndex].name}'s turn.`);
        drawBoard(); // Redraw with initial state
        drawPieces(); // Draw pieces in their starting bases
    }

    function resetGame() {
        gameStarted = false;
        players = [];
        currentPlayerIndex = 0;
        diceResult = 0;
        consecutiveSixes = 0;
        rollDiceBtn.disabled = false;
        updateStatus("Game reset. Click 'Start Game' to play again.");
        drawBoard(); // Clear board
    }

    // --- Event Listeners ---
    rollDiceBtn.addEventListener('click', rollDice);
    startGameBtn.addEventListener('click', startGame);
    resetGameBtn.addEventListener('click', resetGame);

    canvas.addEventListener('click', (event) => {
        if (!gameStarted || currentPossibleMoves.length === 0) {
            return; // Only allow clicks if game started and moves are possible
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Check if a clicked piece is one of the highlighted possible moves
        const clickedMove = currentPossibleMoves.find(move => {
            let pieceCoords;
            if (move.piece.inBase) {
                pieceCoords = getCellCoords(basePositions[move.piece.color][move.piece.id][0], basePositions[move.piece.color][move.piece.id][1]);
            } else {
                pieceCoords = getCellCoords(move.piece.currentPos[0], move.piece.currentPos[1]);
            }

            const pieceCenterX = pieceCoords.x + cellSize / 2;
            const pieceCenterY = pieceCoords.y + cellSize / 2;
            const pieceRadius = cellSize * 0.4;

            // Simple distance check for click on piece
            const distance = Math.sqrt(Math.pow(mouseX - pieceCenterX, 2) + Math.pow(mouseY - pieceCenterY, 2));
            return distance <= pieceRadius;
        });

        if (clickedMove) {
            movePiece(clickedMove.piece, clickedMove.newPos, clickedMove.type);
        } else {
            updateStatus("Invalid move. Please select a highlighted piece.");
        }
    });

    // Initial draw
    drawBoard();
    updateStatus("Welcome to Ludo Royale! Click 'Start Game' to begin.");
});
