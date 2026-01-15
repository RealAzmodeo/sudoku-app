import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GridCell } from './GridCell';
import { SudokuGrid, GameState } from '../types';
import { getAllConflicts } from '../utils/sudokuLogic';

const { width } = Dimensions.get('window');

// Fixed dimensions for zero-layout-shift
const PADDING = 16;
const BOARD_WIDTH = width - (PADDING * 2);
const BLOCK_GAP = 6;
const CELL_GAP = 2;
const BLOCK_WIDTH = (BOARD_WIDTH - (2 * BLOCK_GAP)) / 3;
const CELL_SIZE = (BLOCK_WIDTH - (2 * CELL_GAP)) / 3;

interface SudokuBoardProps {
  grid: SudokuGrid;
  selectedCell: [number, number] | null;
  isGameFinished: boolean;
  isWon: boolean;
  isDarkMode: boolean;
  settings: { autoCheck: boolean };
  onCellClick: (r: number, c: number) => void;
}

export const SudokuBoard = React.memo(({
  grid,
  selectedCell,
  isGameFinished,
  isWon,
  isDarkMode,
  settings,
  onCellClick
}: SudokuBoardProps) => {

  // 1. Calculate conflicts ONCE per grid update
  const conflictMap = React.useMemo(() => {
    if (!settings.autoCheck || isGameFinished) return null;
    return getAllConflicts(grid);
  }, [grid, settings.autoCheck, isGameFinished]);

  // 2. Memoize the 9 blocks to prevent re-rendering ALL blocks if only one cell changes?
  // Actually, React.memo on GridCell handles the leaf node optimization.
  // We just need to map efficiently.

  // Pre-calculate block structure (static)
  const blocks = React.useMemo(() => {
    const _blocks = [];
    for (let b = 0; b < 9; b++) {
        const blockRow = Math.floor(b / 3);
        const blockCol = b % 3;
        const cellsIndices = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                cellsIndices.push({ r: blockRow * 3 + i, c: blockCol * 3 + j });
            }
        }
        _blocks.push(cellsIndices);
    }
    return _blocks;
  }, []);

  return (
    <View style={[styles.container, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}>
      <View style={[
          styles.boardLayer,
          isGameFinished && (isWon ? styles.borderWon : styles.borderLost)
      ]}>
        {blocks.map((block, bIndex) => (
            <View key={bIndex} style={[
                styles.block,
                { 
                    width: BLOCK_WIDTH, 
                    height: BLOCK_WIDTH,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                }
            ]}>
                {block.map(({ r, c }) => {
                    const cell = grid[r][c];
                    const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
                    
                    // Pre-calculate highlights to pass primitive booleans to Cell
                    // This avoids logic inside the Cell component
                    const isHighlighted = !!(selectedCell && (
                        selectedCell[0] === r || 
                        selectedCell[1] === c || 
                        (Math.floor(r / 3) === Math.floor(selectedCell[0] / 3) && Math.floor(c / 3) === Math.floor(selectedCell[1] / 3))
                    ));
                    
                    const isSameNumber = !!(selectedCell && 
                        grid[selectedCell[0]][selectedCell[1]].value === cell.value && 
                        cell.value !== null
                    );

                    const isConflict = !!(conflictMap && conflictMap[r][c]);

                    return (
                        <GridCell 
                            key={`${r}-${c}`}
                            cell={cell} 
                            row={r} 
                            col={c} 
                            isSelected={isSelected}
                            isHighlighted={!isSelected && isHighlighted} // Optimization: Don't highlight if selected
                            isSameNumber={!isSelected && isSameNumber}   // Optimization: Don't highlight same number if selected
                            isConflict={isConflict}
                            onClick={() => onCellClick(r, c)}
                            isDarkMode={isDarkMode}
                            animationsEnabled={false} // Force off for performance
                            style={{ width: CELL_SIZE - 1.5, height: CELL_SIZE - 1.5 }}
                        />
                    );
                })}
            </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  boardLayer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent', // Default no border
    borderRadius: 12,
  },
  borderWon: {
    borderColor: '#10b981',
  },
  borderLost: {
    borderColor: '#ef4444',
    opacity: 0.6,
  },
  block: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    borderRadius: 8,
    padding: 2,
  }
});
