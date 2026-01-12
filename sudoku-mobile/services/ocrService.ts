import TextRecognition, { TextRecognitionResult, TextElement } from '@react-native-ml-kit/text-recognition';

/**
 * Scans a CROPPED image of a Sudoku grid using Granular Element detection.
 */
export const scanSudokuFromImage = async (imageUri: string): Promise<number[][] | null> => {
  try {
    const result: TextRecognitionResult = await TextRecognition.recognize(imageUri);
    // console.log("OCR Raw Text:", result.text); // Debug
    return mapTextToGrid(result);
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
};

/**
 * Maps OCR elements to a 9x9 grid using relative clustering.
 */
const mapTextToGrid = (result: TextRecognitionResult): number[][] => {
  // 1. Flatten everything to simple "Elements" (individual symbols/words)
  // This fixes the bug where "1 2 3" was read as "123" and discarded.
  const elements: TextElement[] = [];
  
  result.blocks.forEach(block => {
    block.lines.forEach(line => {
      line.elements.forEach(element => {
        elements.push(element);
      });
    });
  });

  // 2. Filter for valid digits only (1-9)
  const numberElements = elements.map(e => {
    const clean = e.text.replace(/[^0-9]/g, '');
    const val = parseInt(clean, 10);
    return { element: e, val };
  }).filter(item => !isNaN(item.val) && item.val >= 1 && item.val <= 9);

  if (numberElements.length === 0) return [];

  // 3. Dynamic Bounding Box
  // Instead of using image width, we look at where the numbers actually ARE.
  // This handles imperfect crops (too much white space on left/right).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  numberElements.forEach(({ element }) => {
    const f = element.frame;
    if (f) {
      if (f.left < minX) minX = f.left;
      if (f.top < minY) minY = f.top;
      if (f.left + f.width > maxX) maxX = f.left + f.width;
      if (f.top + f.height > maxY) maxY = f.top + f.height;
    }
  });

  // Add a small buffer to the bounds (approx half a cell size) to handle edge numbers
  // This assumes the numbers are roughly centered in their cells.
  // We approximate cell size based on the spread.
  const spreadWidth = maxX - minX;
  const spreadHeight = maxY - minY;
  
  // Safety check
  if (spreadWidth <= 0 || spreadHeight <= 0) return [];

  // Heuristic: The spread of numbers covers roughly from the center of Col 0 to center of Col 8.
  // That is 8 cell-widths distance.
  const estimatedCellWidth = spreadWidth / 8;
  const estimatedCellHeight = spreadHeight / 8;

  // Re-adjust origin (0,0) to be roughly the top-left corner of the grid, not the center of the first number.
  const gridOriginX = minX - (estimatedCellWidth / 2);
  const gridOriginY = minY - (estimatedCellHeight / 2);

  // 4. Initialize Grid
  const grid: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));

  // 5. Map numbers to cells
  numberElements.forEach(({ element, val }) => {
    const f = element.frame;
    if (!f) return;

    const centerX = f.left + (f.width / 2);
    const centerY = f.top + (f.height / 2);

    const relativeX = centerX - gridOriginX;
    const relativeY = centerY - gridOriginY;

    // Use round instead of floor to snap to the nearest cell center
    const col = Math.floor(relativeX / estimatedCellWidth);
    const row = Math.floor(relativeY / estimatedCellHeight);

    // Strict validation but allow slight tolerance
    // Sometimes index might be -1 or 9 due to estimation, we clamp or ignore
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      grid[row][col] = val;
    }
  });

  return grid;
};
