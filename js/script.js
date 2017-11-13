const mamba_game = (function () {

	// Canvas

	const canvas = document.querySelector('.canvas');
	const ctx = canvas.getContext('2d');
	const blockSize = 32;
	const canvasWidth = 1248;
	const canvasHeight = 704;	
	const widthInBlocks = canvasWidth / blockSize;
	const heightInBlocks = canvasHeight / blockSize;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	// Canvas elements

	const bodySVG = new Image(32, 32);
	bodySVG.src = "images/body.svg";
	const foodSVG = new Image(32, 32);
	foodSVG.src = "images/food.svg";
	const turboFoodSVG = new Image(32, 32);
	turboFoodSVG.src = "images/turbo-food.svg";	
	const headSVG = new Image(32, 32);
	headSVG.src = "images/head.svg";
	const whiteBodySVG = new Image(32, 32);
	whiteBodySVG.src = "images/white-body.svg";
	const whiteHeadSVG = new Image(32, 32);
	whiteHeadSVG.src = "images/white-head.svg";	

	// Menu elements					
	
	const scoreElement = document.getElementById('score');
	const foodPointsElement = document.getElementById('foodPoints');
	const turboFoodPointsElement = document.getElementById('turboFoodPoints');

	// Game settings

	const frameLength = 100; 	
	let currentFrame = 0;
	let pause = false;
	let isGameOver = false;
	let foodCallsLeft = 4;
	let goldCallsLeft = 12;

	// Highscores

	let highscores = [];
	let highscoreDatabase = firebase.database().ref().child('highscores');
	highscoreDatabase.on('value', function (snap) {
		highscores = snap.val();
	});	

	// Start game

	function init () {
		bindEvents();						
		mamba.setWallThreshold();
		gameLoop();			
	}

	function gameLoop () {
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);		
		currentFrame++;
		mamba.advance(food);										
		draw();										
		score.displayScore();	
		if (mamba.checkCollision()) {
			let positionArray = mamba.retreat();
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);
			draw();
			gameOver(positionArray);
			return
		}
		if (pause == true) {
			return
		}
		setTimeout(gameLoop, frameLength);		
	}

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

	function draw () {
		wall.updateWallPositions();
		mamba.draw(ctx);							
		food.draw(ctx);								
		turboFood.draw(ctx);							
		wall.draw(ctx);	
		gold.draw(ctx);																			
	}

	function sort (array) {
		sortedArray = array.sort(function (a, b) {
			return a[1] - b[1];
		})
	}

	function gameOver (positionArray) {
		mamba.retreat();
		let body = positionArray.slice(1, positionArray.length);
		let head = positionArray[0];
		let times = 3;
		const endScore = score.getScore();
		isGameOver = true;

		function isHighscore () {
			const lowestHighscore = highscores.slice(-1)[0];
			if (highscores.length < 40 && endScore > 0 || endScore > lowestHighscore) {
				return true;
			} else {
				return false;
			}
		}

		function addHighscore (userName, userScore) {
			highscores.push({
				name: userName,
				score: userScore
			})
		}

		function sort (array) {
			sortedArray = array.sort(function (a, b) {
				return b.score - a.score;
			})
			return sortedArray;
		}

		function writeHighscores (highscoreArray) {
			highscoreArray.forEach(function (highscore, index) {
				firebase.database().ref().child('highscores').child(index).set({
				    name: highscore.name,
				    score: highscore.score,
				});
			})
		}

		function showHighscores (highscoresArray) {
			const highscoresContainer = document.querySelector('.highscores');
			const highscoreElements = document.querySelectorAll('.highscore');	
			highscoresContainer.style.display = "block";	
			highscoresArray.forEach(function (highscore, index) {
				const highscoreName = highscore.name;
				const highscoreScore = highscore.score;
				let element = highscoreElements[index];
				const elementName = element.querySelector('.highscore-name');
				const elementScore = element.querySelector('.highscore-score');
				elementName.innerHTML = highscoreName;
				elementScore.innerHTML = highscoreScore;
			})

			document.addEventListener('keydown', function (e) {
				if (e.which == 13) {
					location.reload();
				}
			})		
		}

		function showHighscoreSubmit (score) {
			const highscoreSubmit = document.querySelector('.highscore-submit-wrapper');
			const highscoreForm = document.querySelector('.highscore-submit');
			const highscoreInput = document.querySelector('.highscore-input');
			highscoreSubmit.style.display = "inline-block";
			highscoreInput.focus();
			highscoreForm.addEventListener('submit', handleSubmit);
			function handleSubmit (e) {
				e.preventDefault();
				const name = document.querySelector('.highscore-input').value;
				addHighscore(name, endScore);
				highscores = sort(highscores);
				writeHighscores(highscores);
				showHighscores(highscores);
				highscoreForm.removeEventListener('submit', handleSubmit);
			}
		}

		function drawBackground (ctx, color) {
			ctx.save();
				ctx.fillStyle = color;
				positionArray.forEach(function (pos) {
					ctx.fillRect(pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
				});
			ctx.restore();			
		}

		function drawGameOver () {
			if (times > 0) {
				drawBackground(ctx, 'blue');
				drawBody(ctx);
				drawHead(ctx);
				setTimeout(function () {
					drawBackground(ctx, 'black');
					mamba.draw(ctx);
					times--;
					setTimeout(function () {
						drawGameOver();
					}, 225);
				}, 225);			
			}
		}

		function drawBody (ctx) {
			body.forEach(function (pos) {
				ctx.drawImage(whiteBodySVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
			});			
		}

		function drawHead (ctx) {
			ctx.drawImage(whiteHeadSVG, head[0] * blockSize, head[1] * blockSize, blockSize, blockSize);			
		}

		drawGameOver();
		if (isHighscore()) {
			setTimeout(showHighscoreSubmit, 1500);
		} else {
			setTimeout(function () {
				showHighscores(highscores);
			}, 1500);
		}
	}

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
				}, 75)
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

	const mamba = (function () {
		let previousPositionArray;							
		let positionArray = [];									
		positionArray.push([12, 10]);
		positionArray.push([11, 10]);
		positionArray.push([10, 10]);
		positionArray.push([9, 10]);
		positionArray.push([8, 10]);
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

		function advance (food) {							
			let nextPosition = positionArray[0].slice();
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
			previousPositionArray = positionArray.slice();
			positionArray.unshift(nextPosition);				
			positionArray.pop();						

			function isEating () {
				let foodPositions = food.getPositions();
				let turboFoodPositions = turboFood.getPositions();
				let goldPosition = gold.getPosition();

				foodPositions.forEach(function(position) {
					if (equalCoordinates(positionArray[0], position)) {
						grow(positionArray);
						food.removeFood(positionArray[0]);
						food.addFood();
						score.increaseScore(1);
						wall.decrementLifeSpan(1);
						wall.removeWall();
						food.decrementRemoveCounter();
					}
				});

				turboFoodPositions.forEach(function(position) {
					if (equalCoordinates(positionArray[0], position)) {
						grow(positionArray);
						turboFood.removeTurboFood(positionArray[0]);
						food.addFood();
						score.increaseScore(10);
						wall.decrementLifeSpan(0.10);
						wall.removeWall();
					}
				});

				if (goldPosition) {
					gold.checkDecay();
					if (equalCoordinates(positionArray[0], goldPosition)) {
						grow(positionArray);
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

			if (positionArray.length >= wallThreshold) {
				newWallArray = positionArray.splice(6);
				newWallArray.forEach(function (item) {
					item.push(random(1, 250));
				})
				gold.setLifeSpan();
				gold.startGoldDecay();
				wall.addWall(newWallArray);
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

		function draw (ctx) {	
			ctx.save();
			let body = positionArray.slice(1, positionArray.length);
			body.forEach(function (pos) {
				ctx.drawImage(bodySVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
			});
			let head = positionArray[0];
			ctx.drawImage(headSVG, head[0] * blockSize, head[1] * blockSize, blockSize, blockSize);
			ctx.restore();
		} 

		function checkCollision () {
			let borderCollision = false;
			let mambaCollision = false;
			let wallCollision = false;
			let wallPositions = wall.getPositions();
			let head = positionArray[0];
			let rest = positionArray.slice(1);
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
			positionArray = previousPositionArray;	
			return previousPositionArray;
		}

		return {
			draw: draw,
			advance: advance,
			setDirection: setDirection,
			checkCollision: checkCollision,
			retreat: retreat,
			positionArray: positionArray,
			setWallThreshold: setWallThreshold
		}
	})();

	const food = (function(){

		let amount = random(5, 12);
		let foodPositions = [];
		let removeCounter = 60;
		let removeIn = random(30, 60);

		function setRemoveIn (removeCounter) {
			removeIn = random(removeCounter / 2, removeCounter);
		}

		for (i = 0; i < amount; i++) {
			let coordinate = getRandomPosition();
			if (!checkCoordinateInArray(coordinate, mamba.positionArray)) {
				foodPositions.push(coordinate);
			} else {
				i--
			}
		}

		function decrementRemoveCounter () {
			removeIn--;
			if (removeIn <= 0) {
				foodAmount = foodPositions.length;
				index = random(0, foodAmount);
				foodPositions.splice(index, 1);
				if (removeCounter > 6) {
					removeCounter--;
				}
				setRemoveIn(removeCounter);
			}
		}

		function draw(ctx) {
			ctx.save();
			foodPositions.forEach(function (pos) {
				ctx.drawImage(foodSVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
			});
			ctx.restore();
		}

		function setNewPosition (mambaArray) {
			let newPosition = getRandomPosition();
			if (checkCoordinateInArray(newPosition, mambaArray)) {
				return setNewPosition(mambaArray);
			} else {
				position = newPosition;
			}
		}

		function removeFood (coordinate) {
			foodPositions.forEach(function (foodPosition, index) {
				if ((foodPosition[0] == coordinate[0]) && (foodPosition[1] == coordinate[1])) {
					foodPositions.splice(index, 1);
				}
			})
		}

		function addFood () {
			foodCallsLeft--;
			let randomPosition = getRandomPosition();
			let mambaPositions = mamba.positionArray;
			let wallPositions = wall.getPositions();
			let turboFoodPositions = turboFood.getPositions();
			if (foodPositions.length < 30) {	// Never have more than 30 food blocks
				if (
					!checkCoordinateInArray(randomPosition, mambaPositions) && 
					!checkCoordinateInArray(randomPosition, wallPositions) &&
					!checkCoordinateInArray(randomPosition, foodPositions) &&
					!checkCoordinateInArray(randomPosition, turboFoodPositions)
					) {
					foodPositions.push(randomPosition);
				} else {
					if (foodCallsLeft > 0) {
						addFood();
					} else {
						foodCallsLeft = 10;
					}
				}				
			}
		}

		function getPositions () {
			return foodPositions;
		}

		return {
			draw: draw,
			setNewPosition: setNewPosition,
			getPositions: getPositions,
			removeFood: removeFood,
			addFood: addFood,
			decrementRemoveCounter: decrementRemoveCounter
		};
	})();

	const wall = (function () {

		let walls = [];			
		let wallPositions = [];

		function updateWallPositions () {
			wallPositions = [];
			walls.forEach(function (array) {
				array.forEach(function (coord) {
					wallPositions.push(coord);
				})
			})			
		}

		function decrementLifeSpan (value) {
			walls.forEach(function (array) {
				array.forEach(function (item) {
					lifeSpan = item[2];
					lifeSpan -= value;
					item.pop();
					item.push(lifeSpan);
				});
			});
		}

		function removeWall () {
			walls.forEach(function (array) {
				array.forEach(function (item, index) {
					lifeSpan = item[2];
					if (lifeSpan <= 0) {
						const turboFoodCoordinate = [];
						turboFoodCoordinate.push(item[0], item[1]);
						array.splice(index, 1);
						turboFood.addTurboFood(turboFoodCoordinate);
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

		function draw(ctx) {
			ctx.save();
			ctx.fillStyle = '#dd7368';
			walls.forEach(function (singleWall) {
				singleWall.forEach(function (pos) {
					ctx.fillRect(pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
				});
			});
			ctx.restore();
		}

		return {
			addWall: addWall,
			updateWallPositions: updateWallPositions,
			decrementLifeSpan: decrementLifeSpan,
			getPositions: getPositions,
			removeWall: removeWall,
			draw: draw,
			walls: walls
		}
	})();

	const turboFood = (function () {

		let turboFoodPositions = [];

		function addTurboFood (coordinate) {
			turboFoodPositions.push(coordinate);
		}

		function draw(ctx) {
			ctx.save();
			turboFoodPositions.forEach(function (pos) {
				ctx.drawImage(turboFoodSVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
			});
			ctx.restore();
		}

		function removeTurboFood (coordinate) {
			turboFoodPositions.forEach(function (foodPosition, index) {
				if ((foodPosition[0] == coordinate[0]) && (foodPosition[1] == coordinate[1])) {
					turboFoodPositions.splice(index, 1);
				}
			})
		}

		function getPositions () {
			return turboFoodPositions;
		}

		return {
			addTurboFood: addTurboFood,
			getPositions: getPositions,
			removeTurboFood: removeTurboFood,
			draw: draw
		}
	})();

	const gold = (function () {

		let goldPosition;
		let goldLifeSpan;
		let endFrame;

		function addGold () {
			goldCallsLeft--;
			let randomPosition = getRandomPosition();
			let mambaPositions = mamba.positionArray;
			let wallPositions = wall.getPositions();
			let foodPositions = food.getPositions();
			let turboFoodPositions = turboFood.getPositions();
			if (
				!checkCoordinateInArray(randomPosition, mambaPositions) && 
				!checkCoordinateInArray(randomPosition, wallPositions) &&
				!checkCoordinateInArray(randomPosition, foodPositions) &&
				!checkCoordinateInArray(randomPosition, turboFoodPositions) &&
				!checkCoordinateInArray(randomPosition, foodPositions)
				) {
				goldPosition = randomPosition;
				draw(ctx, goldPosition);
				goldLifeSpan = random(3, 8) * 10;
			} else {
				if (goldCallsLeft > 0) {
					addGold();
				} else {
					goldCallsLeft = 20;
				}
			}
		}

		function draw (ctx) {
			if (goldPosition) {
				ctx.save();
				ctx.fillStyle = 'lime';
				ctx.fillRect(goldPosition[0] * blockSize, goldPosition[1] * blockSize, blockSize, blockSize);
				ctx.restore();
			}
		}

		function getPosition () {
			return goldPosition;
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

		return {
			getPosition: getPosition,
			addGold: addGold,
			draw: draw,
			removeGold: removeGold,
			startGoldDecay: startGoldDecay,
			setLifeSpan: setLifeSpan,
			checkDecay: checkDecay,
			endFrame: endFrame
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
			foodPointsElement.innerHTML = multiplier;
			turboFoodPointsElement.innerHTML = 10 * multiplier;
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

	return {
		init: init
	}

})();

mamba_game.init();