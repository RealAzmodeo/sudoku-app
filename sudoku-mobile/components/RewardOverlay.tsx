import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSequence, 
  withTiming, 
  withSpring,
  runOnJS,
  FadeOut
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface RewardProps {
  type: string; // 'row', 'col', 'box'
  startPos: { x: number, y: number };
  onComplete: () => void;
}

const EMOJIS = {
  row: '🚀', // Rocket for lines
  col: '🚀',
  box: '⭐', // Star for areas
};

const FlyingEmoji = ({ type, startPos, onComplete }: RewardProps) => {
  const translateX = useSharedValue(startPos.x);
  const translateY = useSharedValue(startPos.y);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // 1. Pop up
    scale.value = withSpring(2.5);
    
    // 2. Fly up and random side
    const randomX = (Math.random() - 0.5) * 200;
    
    translateY.value = withSequence(
        withTiming(startPos.y - 100, { duration: 600 }), // Float up slowly
        withTiming(startPos.y - 600, { duration: 800 })  // Shoot away
    );
    
    translateX.value = withTiming(startPos.x + randomX, { duration: 1400 });

    // 3. Fade out
    opacity.value = withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0, { duration: 600 }, (finished) => {
            if(finished) runOnJS(onComplete)();
        })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
    position: 'absolute',
    top: 0,
    left: 0,
  }));

  return (
    <Animated.Text style={[style, { fontSize: 30 }]}>
      {EMOJIS[type as keyof typeof EMOJIS] || '🎉'}
    </Animated.Text>
  );
};

interface RewardOverlayProps {
  rewards: { id: string, type: string, startPos: {x:number, y:number} }[];
  onRemove: (id: string) => void;
}

export const RewardOverlay: React.FC<RewardOverlayProps> = ({ rewards, onRemove }) => {
  if (rewards.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rewards.map(r => (
        <FlyingEmoji 
          key={r.id} 
          type={r.type} 
          startPos={r.startPos} 
          onComplete={() => onRemove(r.id)} 
        />
      ))}
    </View>
  );
};
