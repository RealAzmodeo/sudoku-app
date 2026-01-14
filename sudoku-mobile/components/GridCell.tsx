import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Cell } from '../types';
import { twMerge } from 'tailwind-merge';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withSequence,
  withTiming,
  ZoomIn,
  FadeIn
} from 'react-native-reanimated';

interface GridCellProps {
  cell: Cell;
  row: number;
  col: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isSameNumber: boolean;
  isConflict: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  style?: any; // Allow passing custom styles (margins) from parent
  animationsEnabled: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const GridCellComponent: React.FC<GridCellProps> = ({
  cell,
  row,
  col,
  isSelected,
  isHighlighted,
  isSameNumber,
  isConflict,
  onClick,
  isDarkMode,
  style,
  animationsEnabled
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Trigger animation on selection or value change
  useEffect(() => {
    if (!animationsEnabled) {
      scale.value = 1;
      return;
    }

    if (isSelected) {
      scale.value = withSpring(1.15, { damping: 10, stiffness: 150 });
    } else {
      scale.value = withSpring(1, { damping: 15 });
    }
  }, [isSelected, animationsEnabled]);

  // Pop effect when value changes
  useEffect(() => {
    if (!animationsEnabled) return;
    if (cell.isInitial) return; // Disable pop effect for initial numbers
    
    if (cell.value) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(isSelected ? 1.15 : 1)
      );
    }
  }, [cell.value, animationsEnabled, cell.isInitial]);

  // Shake effect on conflict
  useEffect(() => {
    if (!animationsEnabled) {
      rotation.value = 0;
      return;
    }

    if (isConflict) {
      rotation.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isConflict, animationsEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ] as any,
    opacity: opacity.value,
    zIndex: isSelected ? 50 : 1 // Ensure selected cell is always on top
  }));

  // --- MODERN STYLE LOGIC ---
  // No more borders. We rely on the parent to provide gaps/margins.
  // We use rounded corners and shadows for a "floating tile" look.

  let bgClass = isDarkMode ? 'bg-zinc-800' : 'bg-white';
  let shadowClass = isDarkMode ? 'shadow-none' : 'shadow-sm'; // Softer shadow
  let borderClass = isDarkMode ? 'border border-zinc-700' : 'border border-slate-200';

  if (isSelected) {
    bgClass = 'bg-blue-500';
    shadowClass = 'shadow-md shadow-blue-500/50'; // Glowy shadow
    borderClass = 'border-blue-400';
  } else if (isConflict) {
    bgClass = isDarkMode ? 'bg-red-900/40' : 'bg-red-100';
    borderClass = 'border-red-400';
  } else if (isSameNumber) {
    bgClass = isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100';
    borderClass = 'border-blue-300';
  } else if (isHighlighted) {
    // FIXED: Stronger contrast for highlights
    bgClass = isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'; 
    borderClass = isDarkMode ? 'border-zinc-600' : 'border-slate-300';
  }

  // --- TEXT COLOR LOGIC ---
  let textClass = isDarkMode ? 'text-slate-200' : 'text-slate-700';

  if (isSelected) {
    textClass = 'text-white font-black';
  } else if (cell.isHinted) {
    textClass = isDarkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold';
  } else if (cell.isInitial) {
    textClass = isDarkMode ? 'text-white font-black' : 'text-slate-950 font-black';
  } else if (!cell.isValid) {
    textClass = 'text-red-500 font-bold';
  } else {
    // User entered number
    textClass = isDarkMode ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold';
  }

  return (
    <AnimatedTouchableOpacity
      onPress={onClick}
      style={[style, animatedStyle]}
      className={twMerge(
        `flex-none items-center justify-center rounded-md ${shadowClass} ${borderClass}`,
        bgClass
      )}
      activeOpacity={0.8}
      // FIXED: Only animate entrance if NOT initial cell (and animations enabled)
      entering={animationsEnabled && !cell.isInitial ? FadeIn.duration(200) : undefined} 
    >
      {cell.value ? (
        <Text 
          className={twMerge("text-2xl", textClass)}
          style={{ includeFontPadding: false, textAlignVertical: 'center' }}
        >
          {cell.value}
        </Text>
      ) : (
        // Notes rendering
        cell.notes.length > 0 && (
            <View className="flex-row flex-wrap justify-center items-center w-full h-full p-0.5">
                {cell.notes.map(note => (
                    <Text key={note} className={twMerge("text-[8px] w-1/3 text-center leading-none font-bold", isSelected ? "text-blue-100" : (isDarkMode ? "text-zinc-500" : "text-slate-400"))}>
                        {note}
                    </Text>
                ))}
            </View>
        )
      )}
    </AnimatedTouchableOpacity>
  );
};

export const GridCell = React.memo(GridCellComponent, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isSameNumber === next.isSameNumber &&
    prev.isConflict === next.isConflict &&
    prev.isDarkMode === next.isDarkMode &&
    prev.animationsEnabled === next.animationsEnabled &&
    prev.cell.value === next.cell.value &&
    prev.cell.isValid === next.cell.isValid &&
    prev.cell.isInitial === next.cell.isInitial &&
    prev.cell.isHinted === next.cell.isHinted &&
    // Simple array length check for notes is usually enough for performance, 
    // but strict equality is safer. Notes are small arrays.
    prev.cell.notes.length === next.cell.notes.length &&
    prev.cell.notes.every((val, index) => val === next.cell.notes[index])
  );
});
