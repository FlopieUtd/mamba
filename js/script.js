const mamba_game = (function () {
	const canvas = document.querySelector('.canvas');
	const ctx = canvas.getContext('2d');
	const canvasWidth = 1248;
	const canvasHeight = 768;
	const frameLength = 100; 										// Sets speed of the game 
	const blockSize = 32;
	const widthInBlocks = canvasWidth / blockSize;
	const heightInBlocks = canvasHeight / blockSize;
	[canvas.width, canvas.height] = [canvasWidth, canvasHeight];
	function init () {
		document.querySelector('body').appendChild(canvas);
		bindEvents();												// Draw the mamba
		mamba.setWallThreshold();
		gameLoop();													// Start the game loop
	}

	function gameLoop () {
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);				// Clear the canvas
		mamba.advance(food);										// Make the mamba advance one block in the chosen direction
		draw();														// Draw the mamba
		score.displayScore();	
		if (mamba.checkCollision()) {
			mamba.retreat();
			mamba.draw(ctx);
			gameOver();
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
		drawBorder();												// Draw the border of the canvas
	}

	function gameOver () {
		console.log('Game over!')
	}

	function drawBorder () {								
		ctx.save();
		ctx.strokeStyle = 'blue';
		ctx.lineWidth = blockSize;
		ctx.lineCap = 'square';
		const offset = ctx.lineWidth / 2;
		const corners = [
			[offset, offset],
			[canvasWidth - offset, offset],
			[canvasWidth - offset, canvasHeight - offset],
			[offset, canvasHeight - offset]
		];
		ctx.beginPath();
		ctx.moveTo(corners[3][0], corners[3][1]);
		corners.forEach(function(corner) {
			ctx.lineTo(corner[0], corner[1]);
		});
		ctx.stroke();
		ctx.restore();
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
			}
		});
	}

	const mamba = (function () {
		let previousPositionArray;									// Array with the coordinates the mamba occupied in the previous frame
		let positionArray = [];										// Array with the current coordinates the mamba occupies
		positionArray.push([7, 2]);
		positionArray.push([6, 2]);
		positionArray.push([5, 2]);
		positionArray.push([4, 2]);
		positionArray.push([3, 2]);
		positionArray.push([2, 2]);
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
						wall.decrementLifeSpan();
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
					item.push(random(10, 100));
				})
				wall.addWall(newWallArray);
				wallThreshold++;
				score.incrementMultiplier();
			}

			isEating();
		}

		function drawSection (ctx, position) {
			let x = blockSize * position[0];
			let y = blockSize * position[1];
			ctx.fillRect(x, y, blockSize, blockSize);
		}

		function draw (ctx) {										// Draw the mamba
			ctx.save();
			ctx.fillStyle = 'yellow';
			positionArray.forEach(function (pos) {
				drawSection(ctx, pos);
			});
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
			const minX = 1;
			const minY = 1;
			const maxX = widthInBlocks - 1;
			const maxY = heightInBlocks - 1;
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
		let removeCounter = 25;

		for (i = 0; i < amount; i++) {
			let coordinate = getRandomPosition();
			if (!checkCoordinateInArray(coordinate, mamba.positionArray)) {
				foodPositions.push(coordinate);
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
			console.log(removeCounter);
		}

		function draw(ctx) {
			ctx.save();
			ctx.fillStyle = 'cyan';
			foodPositions.forEach(function (pos) {
				ctx.fillRect(pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
			});
			ctx.restore();
		}

		function getRandomPosition () {
			let x = random(1, widthInBlocks -2);
			let y = random(1, heightInBlocks -2);
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
			if (
				!checkCoordinateInArray(randomPosition, mambaPositions) && 
				!checkCoordinateInArray(randomPosition, wallPositions) &&
				!checkCoordinateInArray(randomPosition, foodPositions)
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

		function decrementLifeSpan () {
			walls.forEach(function (array) {
				array.forEach(function (item) {
					lifeSpan = item[2];
					lifeSpan--;
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
			ctx.fillStyle = 'lime';
			turboFoodPositions.forEach(function (pos) {
				ctx.fillRect(pos[0] * blockSize, pos[1] * blockSize, blockSize, blockSize);
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
			const scoreElement = document.getElementById('score');
			scoreElement.innerHTML = score;
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