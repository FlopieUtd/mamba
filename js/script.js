const mamba_game = (function () {
	const canvas = document.querySelector('.canvas');
	const ctx = canvas.getContext('2d');
	const canvasWidth = 1248;
	const canvasHeight = 704;
	const frameLength = 100; 										// Sets speed of the game 
	const blockSize = 32;
	const widthInBlocks = canvasWidth / blockSize;
	const heightInBlocks = canvasHeight / blockSize;
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	const scoreElement = document.getElementById('score');
	const foodPointsElement = document.getElementById('foodPoints');
	const turboFoodPointsElement = document.getElementById('turboFoodPoints');

	let pause = false;
	let drawOps = 0;

	const bodySVG = new Image();
	bodySVG.src = "images/body.svg";

	const foodSVG = new Image();
	foodSVG.src = "images/food.svg";

	const turboFoodSVG = new Image();
	turboFoodSVG.src = "images/turboFood.svg";	

	const headSVG = new Image();
	headSVG.src = "images/head.svg";	

	function init () {
		bindEvents();												// Draw the mamba
		mamba.setWallThreshold();
		gameLoop();													// Start the game loop
		logDrawOps();
	}

	function logDrawOps () {
		console.log(drawOps);
		drawOps = 0;
		setTimeout(logDrawOps, 1000);
	}

	function gameLoop () {
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);				// Clear the canvas
		mamba.advance(food);										// Make the mamba advance one block in the chosen direction
		draw();														// Draw the mamba
		score.displayScore();	
		if (mamba.checkCollision()) {
			mamba.retreat();
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);
			draw();
			gameOver();
			return
		}
		if (pause == true) {
			return
		}
		setTimeout(gameLoop, frameLength);							// Repeat after frameLength milliseconds
	}

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

	function draw () {
		wall.updateWallPositions();
		mamba.draw(ctx);											// Draw the mamba
		food.draw(ctx);												// Draw the food
		turboFood.draw(ctx);										// Draw the turbo food
		wall.draw(ctx);												// Draw the walls										
	}

	function gameOver () {
		console.log('Game over!')
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
				}, 50)
			}
			if (key == 80) {
				if (pause == false) {
					pause = true;
				} else {
					pause = false;
					gameLoop();
				}
			}
		});
	}

	const mamba = (function () {
		let previousPositionArray;									// Array with the coordinates the mamba occupied in the previous frame
		let positionArray = [];										// Array with the current coordinates the mamba occupies
		positionArray.push([10, 10]);
		positionArray.push([9, 10]);
		positionArray.push([8, 10]);
		positionArray.push([7, 10]);
		positionArray.push([6, 10]);
		positionArray.push([5, 10]);
		let direction = 'right';									// The direction in which the mamba will advance
		let nextDirection = direction;
		let wallThreshold;
		function setWallThreshold () {
			wallThreshold = random(18, 36);
		}

		function setDirection (newDirection) {						// Prevents the mamba from turning into itself
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

		function advance (food) {										// Makes the mamba occupy a new block in the chosen direction, removes the last block
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
			positionArray.unshift(nextPosition);					// Add the new mamba head
			positionArray.pop();									// Remove the previous mamba tail

			function isEating () {
				let foodPositions = food.getPositions();
				let turboFoodPositions = turboFood.getPositions();

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
						wall.decrementLifeSpan(0.5);
						wall.removeWall();
					}
				});
			}

			function grow (array) {
				let tail = array.slice(-1).pop();
				array.push(tail);
			}

			if (positionArray.length >= wallThreshold) {
				newWallArray = positionArray.splice(6);
				newWallArray.forEach(function (item) {
					item.push(random(5, 200));
				})
				wall.addWall(newWallArray);
				wallThreshold++;
				score.incrementMultiplier();
			}
			isEating();
		}

		function draw (ctx) {										// Draw the mamba
			ctx.save();
			let body = positionArray.slice(1, positionArray.length);
			body.forEach(function (pos) {
				ctx.drawImage(bodySVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
				drawOps++;
			});
			let head = positionArray[0];
			ctx.drawImage(headSVG, head[0] * blockSize, head[1] * blockSize, blockSize, blockSize);
			ctx.restore();
		} 

		function checkCollision () {
			let borderCollision = false;
			let mambaCollision = false;
			let wallCollision = false;
			let wallPositions = wall.getWallPositions();
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
			positionArray = previousPositionArray					// Set the mamba back one frame
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

		let amount = 5;
		let foodPositions = [];
		let removeCounter = 30;

		for (i = 0; i < amount; i++) {
			let coordinate = getRandomPosition();
			if (!checkCoordinateInArray(coordinate, mamba.positionArray)) {
				foodPositions.push(coordinate);
			} else {
				i--
			}
		}

		function decrementRemoveCounter () {
			removeCounter--;
			if (removeCounter <= 0) {
				foodAmount = foodPositions.length;
				index = random(0, foodAmount);
				foodPositions.splice(index, 1);
				removeCounter = 25;
			}
		}

		function draw(ctx) {
			ctx.save();
			foodPositions.forEach(function (pos) {
				ctx.drawImage(foodSVG, pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
				drawOps++;
			});
			ctx.restore();
		}

		function getRandomPosition () {
			let x = random(1, widthInBlocks - 1);
			let y = random(1, heightInBlocks - 1);
			return [x, y];
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
			let randomPosition = getRandomPosition();
			let mambaPositions = mamba.positionArray;
			let wallPositions = wall.getWallPositions();
			let turboFoodPositions = turboFood.getPositions();
			if (
				!checkCoordinateInArray(randomPosition, mambaPositions) && 
				!checkCoordinateInArray(randomPosition, wallPositions) &&
				!checkCoordinateInArray(randomPosition, foodPositions) &&
				!checkCoordinateInArray(randomPosition, turboFoodPositions)
				) {
				foodPositions.push(randomPosition);
			} else {
				addFood();
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

		let walls = [];												// Contains arrays of three values: x-coordinate, y-coordinate and lifespan
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

		function getWallPositions () {
			return wallPositions;
		}

		function draw(ctx) {
			ctx.save();
			ctx.fillStyle = 'lightCoral';
			walls.forEach(function (singleWall) {
				singleWall.forEach(function (pos) {
					ctx.fillRect(pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
					drawOps++;
				});
			});
			ctx.restore();
		}

		return {
			addWall: addWall,
			updateWallPositions: updateWallPositions,
			decrementLifeSpan: decrementLifeSpan,
			getWallPositions: getWallPositions,
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
				drawOps++;
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

	const score = (function () {

		let score = 0;
		let multiplier = 1;

		function increaseScore (value) {
			score += (value * multiplier);
		}

		function displayScore () {
			scoreElement.innerHTML = score;
			foodPointsElement.innerHTML = multiplier;
			turboFoodPointsElement.innerHTML = 10 * multiplier;
		}

		function incrementMultiplier () {
			multiplier++;
		}

		return  {
			increaseScore: increaseScore,
			displayScore: displayScore,
			incrementMultiplier: incrementMultiplier
		}

	})();

	return {
		init: init
	}

})();

mamba_game.init();