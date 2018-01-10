const mamba_game = (function () {

	// Canvas

	const canvas = document.querySelector('.canvas');
	const ctx = canvas.getContext('2d');
	const blockSize = 32;
	const widthInBlocks = 39;
	const heightInBlocks = 22;
	const canvasWidth = widthInBlocks * blockSize;
	const canvasHeight = heightInBlocks * blockSize;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	// Canvas elements

	const bodySVG = new Image(blockSize, blockSize);
	bodySVG.src = "images/body.svg";
	const bronzeSVG = new Image(blockSize, blockSize);
	bronzeSVG.src = "images/bronze.svg";
	const silverSVG = new Image(blockSize, blockSize);
	silverSVG.src = "images/silver.svg";	
	const headSVG = new Image(blockSize, blockSize);
	headSVG.src = "images/head.svg";
	const whiteBodySVG = new Image(blockSize, blockSize);
	whiteBodySVG.src = "images/body-white.svg";
	const whiteHeadSVG = new Image(blockSize, blockSize);
	whiteHeadSVG.src = "images/head-white.svg";	

	// Menu elements					
	
	const scoreElement = document.getElementById('score');
	const bronzePointsElement = document.getElementById('bronze-points');
	const silverPointsElement = document.getElementById('silver-points');

	// Game settings

	const frameLength = 92; 	
	let currentFrame = 0;
	let pause = false;
	let isGameOver = false;
	let bronzeCallsLeft = 4;
	let goldCallsLeft = 12;	

	// Drawing variables

	let allPreviousPositions = [];

	// Highscores

	let globalHighscores = [];
	let localHighscores = [];
	let globalHighscoreDatabase = firebase.database().ref().child('highscores');
	globalHighscoreDatabase.on('value', function (snap) {
		globalHighscores = snap.val();
		if (globalHighscores.length > 40) {globalHighscores.pop();}
	});	

	// Development 

	let drawOps = 0;
	

	// General functions

	function equalCoordinates (coord1, coord2) {
		return coord1[0] === coord2[0] && coord1[1] === coord2[1];
	}

	function checkCoordinateInArray (coord, array) {
		let isInArray = false;
		array.forEach(function(item) {
			if (equalCoordinates(coord, item)) {
				isInArray = true;
			}
		});
		return isInArray;
	}

	function random (low, high) {
		return Math.floor(Math.random() * (high - low + 1) + low);
	} 

	function getRandomPosition () {
		let x = random(0, widthInBlocks - 1);
		let y = random(0, heightInBlocks - 1);
		return [x, y];
	}

	function sort (array) {
		sortedArray = array.sort(function (a, b) {
			return a.score - b.score;
		})
		return sortedArray;
	}	

	// Bind game controls

	function bindEvents () {
		const directionKeys = {
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down'
		}
		document.addEventListener('keydown', function (e) {
			let key = e.which;
			let direction = directionKeys[key];
			if (direction) {
				mamba.setDirection(direction);
				e.preventDefault();
				setTimeout(function () {
					mamba.setDirection(direction);
					e.preventDefault();
				}, 80)
			}
			if (key == 80) {
				if (pause == false) {
					pause = true;
				} else if (!isGameOver) {
					pause = false;
					gameLoop();
				}
			}
		});
	}

	// Start game

	function init () {
		const screen = document.querySelector('.js-loading-screen');
		fadeOut(screen);
		bindEvents();
		mamba.setWallThreshold();						
		gameLoop();	
		setInterval(function () {
			console.log('drawOps', drawOps);
			drawOps = 0;
		}, 1000)
	}

	function gameLoop () {
		currentFrame++;
		mamba.advance(bronze);
		wall.updateWallPositions();
		draw(ctx, mamba.positions, bronze.positions, silver.positions, gold.getPosition(), wall.getPositions());		
		if (mamba.checkCollision()) {
			let positions = mamba.retreat();
			gameOver(positions, mamba.positions[0]);
			return
		}								
		if (pause == true) {
			return
		}		
		setTimeout(gameLoop, frameLength);					
	}

	const mamba = (function () {
		let previousPositions;							
		let positions = [];									
		positions.push([12, 10, 'mamba']);
		positions.push([11, 10, 'mamba']);
		positions.push([10, 10, 'mamba']);
		positions.push([9, 10, 'mamba']);
		positions.push([8, 10, 'mamba']);
		let direction = 'right';									
		let nextDirection = direction;
		let wallThreshold;

		function setWallThreshold () {
			wallThreshold = random(18, 36);
		}

		function setDirection (newDirection) {					
			let allowedDirections;
			switch (direction) {
				case 'left':
				case 'right':
					allowedDirections = ['up', 'down'];
					break;
				case 'up':
				case 'down':
					allowedDirections = ['left', 'right'];
					break;
				default:
					throw('Invalid direction');
			}
			if (allowedDirections.indexOf(newDirection) > -1) {
				nextDirection = newDirection;
			}
		}

		function advance (bronze) {							
			let nextPosition = positions[0].slice();
			direction = nextDirection;
			switch (direction) {
				case 'left':
					nextPosition[0] -= 1;
					break;
				case 'up':
					nextPosition[1] -= 1;
					break;
				case 'right':
					nextPosition[0] += 1;
					break;
				case 'down':
					nextPosition[1] += 1;
					break;
				default:
					throw('Invalid direction');
			}
			previousPositions = positions.slice();
			positions.unshift(nextPosition);				
			positions.pop();

			function isEating () {
				let bronzePositions = bronze.positions;
				let silverPositions = silver.positions;
				let goldPosition = gold.getPosition();

				bronzePositions.forEach(function(position) {
					if (equalCoordinates(positions[0], position)) {
						grow(positions);
						bronze.removeBronze(positions[0]);
						bronze.addBronze();
						score.increaseScore(1);
						wall.decrementLifeSpan(1);
						wall.removeWall();
						bronze.decrementRemoveCounter();
					}
				});

				silverPositions.forEach(function (position) {
					if (equalCoordinates(positions[0], position)) {
						grow(positions);
						silver.removeSilver(positions[0]);
						bronze.addBronze();
						score.increaseScore(10);
						wall.decrementLifeSpan(0.1);
						wall.removeWall();
					}
				});

				if (goldPosition) {
					gold.checkDecay();
					if (equalCoordinates(positions[0], goldPosition)) {
						grow(positions);
						gold.removeGold();
						const goldWorth = random(1, 10) * 10;
						score.increaseScore(goldWorth);
					}					
				}
			}						

			function grow (array) {
				let tail = array.slice(-1).pop();
				array.push(tail);
			}

			if (positions.length >= wallThreshold) {
				const newWallArray = [];
				const tempArray = positions.splice(6);
				tempArray.forEach(function (position) {
					newWallArray.push([position[0], position[1], 'wall', random(1, 200)]);
				})
				wall.addWall(newWallArray);				
				gold.setLifeSpan();
				gold.startGoldDecay();
				wallThreshold++;
				setTimeout(function () {
					gold.addGold();
				});

				let multiplier = score.getMultiplier();
				if (multiplier < 10) {
					score.incrementMultiplier();
				}
			}
			isEating();
		}

		function checkCollision () {
			let borderCollision = false;
			let mambaCollision = false;
			let wallCollision = false;
			let wallPositions = wall.getPositions();
			let head = positions[0];
			let rest = positions.slice(1);
			let mambaX = head[0];
			let mambaY = head[1];
			const minX = 0;
			const minY = 0;
			const maxX = widthInBlocks;
			const maxY = heightInBlocks;
			const outsideHorizontalBounds = mambaX < minX || mambaX >= maxX;
			const outsideVerticalBounds = mambaY < minY || mambaY >= maxY;
			if (outsideHorizontalBounds || outsideVerticalBounds) {
				borderCollision = true;
			}
			mambaCollision = checkCoordinateInArray(head, rest);
			wallCollision = checkCoordinateInArray(head, wallPositions);
			return borderCollision || mambaCollision || wallCollision;
		}

		function retreat () {
			positions = previousPositions;	
			return previousPositions;
		}

		return {
			advance: advance,
			setDirection: setDirection,
			checkCollision: checkCollision,
			retreat: retreat,
			positions: positions,
			setWallThreshold: setWallThreshold
		}
	})();

	const bronze = (function(){

		let amount = random(5, 12);
		let bronzePositions = [];
		let removeCounter = 60;
		let removeIn = random(40, 80);

		function setRemoveIn (removeCounter) {
			removeIn = random(removeCounter / 2, removeCounter);
		}

		for (i = 0; i < amount; i++) {
			let coordinate = getRandomPosition();
			if (!checkCoordinateInArray(coordinate, mamba.positions)) {
				coordinate.push('bronze');
				bronzePositions.push(coordinate);
			} else {
				i--
			}
		}

		function decrementRemoveCounter () {
			removeIn--;
			if (removeIn <= 0) {
				bronzeAmount = bronzePositions.length;
				index = random(0, bronzeAmount);
				bronzePositions.splice(index, 1);
				if (removeCounter > 6) {
					removeCounter--;
				}
				setRemoveIn(removeCounter);
			}
		}

		function setNewPosition (mambaArray) {
			let newPosition = getRandomPosition();
			if (checkCoordinateInArray(newPosition, mambaArray)) {
				return setNewPosition(mambaArray);
			} else {
				position = newPosition;
			}
		}

		function removeBronze (coordinate) {
			bronzePositions.forEach(function (bronzePosition, index) {
				if ((bronzePosition[0] == coordinate[0]) && (bronzePosition[1] == coordinate[1])) {
					bronzePositions.splice(index, 1);
				}
			})
		}

		function addBronze () {
			bronzeCallsLeft--;
			let randomPosition = getRandomPosition();
			let mambaPositions = mamba.positions;
			let wallPositions = wall.getPositions();
			let silverPositions = silver.positions;
			if (bronzePositions.length < 30) {	// Never have more than 30 bronze blocks
				if (
					!checkCoordinateInArray(randomPosition, mambaPositions) && 
					!checkCoordinateInArray(randomPosition, wallPositions) &&
					!checkCoordinateInArray(randomPosition, bronzePositions) &&
					!checkCoordinateInArray(randomPosition, silverPositions)
					) {
					randomPosition.push('bronze');
					bronzePositions.push(randomPosition);
				} else {
					if (bronzeCallsLeft > 0) {
						addBronze();
					} else {
						bronzeCallsLeft = 10;
					}
				}				
			}
		}

		return {
			setNewPosition: setNewPosition,
			positions: bronzePositions,
			removeBronze: removeBronze,
			addBronze: addBronze,
			decrementRemoveCounter: decrementRemoveCounter
		};
	})();	

	const silver = (function () {

		let silverPositions = [];

		function addSilver (position) {
			silverPositions.push(position);
		}

		function removeSilver (coordinate) {
			silverPositions.forEach(function (position, index) {
				if ((position[0] == coordinate[0]) && (position[1] == coordinate[1])) {
					silverPositions.splice(index, 1);
				}
			})
		}

		return {
			addSilver: addSilver,
			positions: silverPositions,
			removeSilver: removeSilver,
		}
	})();

	const gold = (function () {

		let goldPosition;
		let goldLifeSpan;
		let endFrame;

		function addGold () {
			goldCallsLeft--;
			let randomPosition = getRandomPosition();
			randomPosition.push('gold');
			let mambaPositions = mamba.positions;
			let wallPositions = wall.getPositions();
			let bronzePositions = bronze.positions;
			let silverPositions = silver.positions;
			if (
				!checkCoordinateInArray(randomPosition, mambaPositions) && 
				!checkCoordinateInArray(randomPosition, wallPositions) &&
				!checkCoordinateInArray(randomPosition, bronzePositions) &&
				!checkCoordinateInArray(randomPosition, silverPositions)
				) {
				goldPosition = randomPosition;
				
				LifeSpan = random(3, 8) * 10;
			} else {
				if (goldCallsLeft > 0) {
					addGold();
				} else {
					goldCallsLeft = 20;
				}
			}
		}

		function setLifeSpan () {
			lifeSpan = random(3, 7) * 10; 
		}

		function startGoldDecay (time) {
			let startFrame = currentFrame;
			endFrame = currentFrame + lifeSpan;
		}

		function checkDecay () {
			if (currentFrame >= endFrame) {
				removeGold();
			}
		}

		function removeGold () {
			goldPosition = undefined;
		}

		function getPosition () {
			return goldPosition;
		}

		return {
			getPosition: getPosition,
			addGold: addGold,
			removeGold: removeGold,
			startGoldDecay: startGoldDecay,
			setLifeSpan: setLifeSpan,
			checkDecay: checkDecay,
			endFrame: endFrame
		}
	})();

	const wall = (function () {

		let walls = [];			
		let wallPositions = [];

		function updateWallPositions () {
			wallPositions = [];
			walls.forEach(function (singleWall) {
				singleWall.forEach(function (position) {
					wallPositions.push(position);
				})
			})			
		}

		function decrementLifeSpan (value) {
			walls.forEach(function (array) {
				array.forEach(function (item) {
					lifeSpan = item[3];
					lifeSpan -= value;
					item.pop();
					item.push(lifeSpan);
				});
			});
		}

		function removeWall () {
			walls.forEach(function (array) {
				array.forEach(function (item, index) {
					lifeSpan = item[3];
					if (lifeSpan <= 0) {
						const silverCoordinate = [];
						silverCoordinate.push(item[0], item[1], 'silver');
						array.splice(index, 1);
						silver.addSilver(silverCoordinate);
					}
				})
			});
		}

		function addWall (array) {
			walls.push(array);
		}

		function getPositions () {
			return wallPositions;
		}

		return {
			addWall: addWall,
			updateWallPositions: updateWallPositions,
			decrementLifeSpan: decrementLifeSpan,
			getPositions: getPositions,
			removeWall: removeWall,
			walls: walls
		}
	})();

	const score = (function () {

		let score = 0;
		let multiplier = 1;

		function increaseScore (value) {
			score += (value * multiplier);
		}

		function getMultiplier () {
			return multiplier;
		}

		function displayScore () {
			scoreElement.innerHTML = score;
			bronzePointsElement.innerHTML = multiplier;
			silverPointsElement.innerHTML = 10 * multiplier;
		}

		function incrementMultiplier () {
			multiplier++;
		}

		function getScore () {
			return score;
		}

		return  {
			increaseScore: increaseScore,
			displayScore: displayScore,
			incrementMultiplier: incrementMultiplier,
			getScore: getScore,
			getMultiplier: getMultiplier
		}
	})();

	function draw (ctx, mambaPositions, bronzePositions, silverPositions, goldPosition, wallPositions) {
		
		const allCurrentPositions = [];
		const positionsToClear = [];
		const positionsToDraw = [];

		// Determine the current positions

		mambaPositions.forEach(function (position) {
			allCurrentPositions.push(position);
		});

		bronzePositions.forEach(function (position) {
			allCurrentPositions.push(position);
		});

		silverPositions.forEach(function (position) {
			allCurrentPositions.push(position);
		});

		if (goldPosition) {
			allCurrentPositions.push(goldPosition);
		}

		wallPositions.forEach(function (position) {
			allCurrentPositions.push(position);
		})

		allPreviousPositions.forEach(function (position) {
			if (allCurrentPositions.indexOf(position) == -1) {
				positionsToClear.push(position);
			}
		})

		// Determine the positions to be drawn

		allCurrentPositions.forEach(function (position) {
			if (allPreviousPositions.indexOf(position) == -1) {
				positionsToDraw.push(position);
			}
		})

		// Clear and draw the second mamba position: the start of the body

		positionsToDraw.push(allCurrentPositions[1]);
		positionsToClear.push(allCurrentPositions[1]);

		positionsToClear.forEach(function (position) {
			drawOps++;
			ctx.clearRect(position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);				
		});

		ctx.save();

		let isHead = true;

		positionsToDraw.forEach(function (position) {
			switch(position[2]) {
				case 'mamba':
					{
						drawOps++;
						if (isHead) {
							ctx.drawImage(headSVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
							isHead = false;
						} else {
							ctx.drawImage(bodySVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
						}
					}
					break;
				case 'bronze':
					{
						drawOps++;
						ctx.drawImage(bronzeSVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
					}
					break;
				case 'silver':
					{
						drawOps++;
						ctx.drawImage(silverSVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
					}
					break;
				case 'gold':
					{
						drawOps++;
						ctx.fillStyle = 'lime';
						ctx.fillRect(position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
					}
					break;
				case 'wall':
					{
						drawOps++;
						ctx.fillStyle = '#dd7368';
						ctx.fillRect(position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
					}
					break;
				default:
					{
						console.error('Woopsie daisy!');
					}
			}
		});

		ctx.restore();

		allPreviousPositions = allCurrentPositions.slice();
	}

	function gameOver (positions, collisionPosition) {
		let body = positions.slice(1, positions.length);
		let head = positions[0];
		let times = 3;
		const endScore = score.getScore();
		const storage = window.localStorage;
		let highscoreString = '';
		let processedHighscoreString = '';

		isGameOver = true;

		console.log(endScore);

		function isHighscore (endScore) {
			if (endScore > 0) {
				return true;
			}
		}

		function getLocalHighscores () {
			highscoreString = storage.getItem('highscores');
		}

		function processLocalHighscore (highscoreString, name, score) {

			processedHighscoreString = name + '-' + score + ';';
			/*
			processedHighscoreString = highscoreString;
			processedHighscoreString += name + '-' + score + ';';
			const highscoreStrings = processedHighscoreString.split(';');
			highscoreStrings.forEach(function (string) {
				const stringItems = string.split('-');
				const highscore = {name: stringItems[0], score: stringItems[1]};
				localHighscores.push(highscore);
			});
			console.log('unsorted', localHighscores);
			sort(localHighscores);
			console.log('sorted', localHighscores);
			*/
		}

		function setLocalHighcores () {
			console.log('processedHighscoreString', processedHighscoreString);
			storage.setItem('highscores', processedHighscoreString);
		}


		function showHighscoreSubmit (endScore) {

			const highscoreSubmit = document.querySelector('.highscore-submit');
			const highscoreForm = document.querySelector('.highscore-submit__form');
			const highscoreInput = document.querySelector('.highscore-submit__input');

			function handleSubmit (e) {
				e.preventDefault();
				highscoreForm.removeEventListener('submit', handleSubmit);
				const name = highscoreInput.value;
				getLocalHighscores();
				processLocalHighscore(highscoreString, name, endScore);
				setLocalHighcores(processedHighscoreString);
			}

			highscoreSubmit.style.display = "inline-block";
			highscoreInput.focus();
			highscoreForm.addEventListener('submit', handleSubmit);
		}



		// Draw game over animation

		function drawBackground (ctx, color) {
			ctx.save();
				ctx.fillStyle = color;
				positions.forEach(function (position) {
					drawOps++;
					ctx.fillRect(position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
				});
			ctx.restore();			
		}

		function drawGameOver (collisionPosition) {

			// Draw a wall block in case the collision was with a wall. Otherwise, mambaBody is drawn anyway.

			if (times == 3) {
				drawOps++;
				ctx.fillStyle = '#dd7368';
				ctx.fillRect(collisionPosition[0] * blockSize, collisionPosition[1] * blockSize, blockSize, blockSize);				
			}

			if (times > 0) {
				drawBackground(ctx, 'blue');
				drawBody(ctx, 'white');
				drawHead(ctx, 'white');
				setTimeout(function () {
					drawBackground(ctx, 'black');
					drawBody(ctx, 'yellow');
					drawHead(ctx, 'yellow');
					times--;
					setTimeout(function () {
						drawGameOver(collisionPosition);
					}, 225);
				}, 225);			
			}
		}

		function drawBody (ctx, color) {
			body.forEach(function (position) {
				drawOps++;
				if (color == 'white') {
					drawOps++;
					ctx.drawImage(whiteBodySVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
				} else {
					drawOps++;
					ctx.drawImage(bodySVG, position[0] * blockSize, position[1] * blockSize, blockSize, blockSize);
				}
			});			
		}

		function drawHead (ctx, color) {
			drawOps++;
			if (color == 'white') {
				drawOps++;
				ctx.drawImage(whiteHeadSVG, head[0] * blockSize, head[1] * blockSize, blockSize, blockSize);			
			} else {
				drawOps++;
				ctx.drawImage(headSVG, head[0] * blockSize, head[1] * blockSize, blockSize, blockSize);	
			}
		}		

		mamba.retreat();
		drawGameOver(collisionPosition);

		if (isHighscore(endScore)) {
			showHighscoreSubmit(endScore);
		}

	}

	return {
		init: init
	}

})();


setTimeout(function () {
	mamba_game.init();
},1000);

function fadeOut(element) {
  element.style.opacity = 1;

  let last = +new Date();
  const tick = function() {
    element.style.opacity =+ element.style.opacity - (new Date() - last) / 500;
    last = +new Date();

    if (element.style.opacity > 0) {
      (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
    }
  };
  tick();
}