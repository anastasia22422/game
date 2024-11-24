class Cell {
  constructor(gridElement, x, y) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    gridElement.append(cell);
    this.x = x;
    this.y = y;
  }


  linkTile(tile) {
    tile.setXY(this.x, this.y);
    this.linkedTile = tile;
  }

  unlinkTile() {
  this.linkedTile = null;
}

  isEmpty() {
  return !this.linkedTile;
  }

  linkTileForMerge(tile) {
    tile.setXY(this.x, this.y);
    this.linkedTileForMerge = tile;
  }

  unlinkTileForMerge() {
    this.linkedTileForMerge = null;
  }


  hasTileForMerge() {
    return !!this.linkedTileForMerge;
  }

  canAccept(newTile) {
    return this.isEmpty() || (!this.hasTileForMerge() && this.linkedTile.value === newTile.value);
  }

  mergeTiles() {
    this.linkedTile.setValue(this.linkedTile.value + this.linkedTileForMerge.value);
    this.linkedTileForMerge.removeFromDOM();
    this.unlinkTileForMerge();
  }
}

const GRID_SIZE = 4;
const CELLS_COUNT = GRID_SIZE * GRID_SIZE;

class Grid {
  constructor(gridElement) {
    this.cells = [];
    for (let i = 0; i < CELLS_COUNT; i++) {
      this.cells.push(
        new Cell(gridElement, i % GRID_SIZE, Math.floor(i / GRID_SIZE))
      );
    }

    this.cellsGroupedByColumn = this.groupCellByColumn();
    this.cellsGroupedByReversedColumn = this.cellsGroupedByColumn.map(column => [...column].reverse());
    this.cellsGroupedByRow = this.groupCellByRow();
    this.cellsGroupedByReversedRow = this.cellsGroupedByRow.map(row => [...row].reverse());
  }

getRandomEmptyCell() {
  const emptyCells = this.cells.filter(cell => cell.isEmpty());
  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  return emptyCells[randomIndex];
}
  
groupCellByColumn() {
    return this.cells.reduce((groupedCells, cell) => {
      groupedCells[cell.x] = groupedCells[cell.x] || [];
      groupedCells[cell.x][cell.y] = cell;
      return groupedCells;
    }, [] );
}
  
groupCellByRow() {
    return this.cells.reduce((groupedCells, cell) => {
      groupedCells[cell.y] = groupedCells[cell.y] || [];
      groupedCells[cell.y][cell.x] = cell;
      return groupedCells;
    }, [] );
  }
}

class Tile {
  constructor(gridElement) {
    this.tileElement = document.createElement("div");
    this.tileElement.classList.add("tile");
    this.setValue(Math.random() > 0.5 ? 2 : 4);
    gridElement.append(this.tileElement);
  }

  setXY(x, y) {
    this.x = x;
    this.y = y;
    this.tileElement.style.setProperty("--x", x);
    this.tileElement.style.setProperty("--y", y);
  }
  
  setValue(value) {
    this.value = value;
    this.tileElement.textContent = value;
    const bgLightness = 100 - Math.log2(value) * 9;
    this.tileElement.style.setProperty("--bg-lightness", `${bgLightness}%`);
    this.tileElement.style.setProperty("--text-lightness", `${bgLightness < 50 ? 90 : 10}%`);
  }

  removeFromDOM() {
    this.tileElement.remove();
  }

  waitForTransitionEnd() {
    return new Promise(resolve => {
      this.tileElement.addEventListener("transitionend", resolve, { once: true });
    });
  }

  waitForAnimationEnd() {
    return new Promise(resolve => {
      this.tileElement.addEventListener("animationend", resolve, { once: true });
    });
  }
}

const gameBoard = document.getElementById("game-board");

const grid = new Grid(gameBoard);
grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
setupInputOnce();

function setupInputOnce() {
  window.addEventListener("keydown", handleInput, { once: true });
}

async function handleInput(event) {
  switch (event.key) {
    case "ArrowUp":
      if (!canMoveUp()) {
        setupInputOnce();
        return;
      }
      await moveUp();
      break;
    case "ArrowDown":
      if (!canMoveDown()) {
        setupInputOnce();
        return;
      }
      await moveDown();
      break;
    case "ArrowLeft":
      if (!canMoveLeft()) {
        setupInputOnce();
        return;
      }
      await moveLeft();
      break;
    case "ArrowRight":
      if (!canMoveRight()) {
        setupInputOnce();
        return;
      }
      await moveRight();
      break;
    
    default:
      setupInputOnce();
      return;
  }

  const newTile = new Tile(gameBoard);
  grid.getRandomEmptyCell().linkTile(newTile);

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    await newTile.waitForAnimationEnd();
    alert("Try again!");
    return;
  }
  setupInputOnce();
}

async function moveUp() {
  await slideTiles(grid.cellsGroupedByColumn);
}
async function moveDown() {
  await slideTiles(grid.cellsGroupedByReversedColumn);
}
async function moveLeft() {
  await slideTiles(grid.cellsGroupedByRow);
}
async function moveRight() {
  await slideTiles(grid.cellsGroupedByReversedRow);
}

async function slideTiles(groupedCells) {
  const promises = [];
  groupedCells.forEach(group => slideTilesInGroup(group, promises));

  await Promise.all(promises);
  
  grid.cells.forEach(cell => {
    cell.hasTileForMerge() && cell.mergeTiles();
  } );
}

function slideTilesInGroup(group, promises) {
  for (let i = 1; i < group.length; i++) {
    if (group[i].isEmpty()) {
      continue;
    }
    const cellWithTile = group[i];

    let targetCell;
    let j = i - 1; 
    while (j >= 0 && group[j].canAccept(cellWithTile.linkedTile)) {
      targetCell = group[j];
      j--;
    }

    if (!targetCell) {
      continue;
    }

    promises.push(cellWithTile.linkedTile.waitForTransitionEnd());

    if (targetCell.isEmpty()) {
      targetCell.linkTile(cellWithTile.linkedTile);
    } else {
      targetCell.linkTileForMerge(cellWithTile.linkedTile); 
    }

    cellWithTile.unlinkTile();
  }
}

  function canMoveUp() {
    return canMove(grid.cellsGroupedByColumn);
  }
  function canMoveDown() {
    return canMove(grid.cellsGroupedByReversedColumn);
  }
  function canMoveLeft() {
    return canMove(grid.cellsGroupedByRow);
  }
  function canMoveRight() {
    return canMove(grid.cellsGroupedByReversedRow);
  }

  function canMove(groupedCells) {
    return groupedCells.some(group => canMoveInGroup(group));
  }

function canMoveInGroup(group) {
  return group.some((cell, index) => {
    if (index === 0) {
      return false;}
    if (cell.isEmpty()) {
      return false;
    }
    
    const targetCell = group[index -1];
    return targetCell.canAccept(cell.linkedTile);
  });
  }
