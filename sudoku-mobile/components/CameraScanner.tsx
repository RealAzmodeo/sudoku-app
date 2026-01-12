import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanSudokuFromImage } from '../services/ocrService';
import { useLanguage } from '../utils/i18n';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import clsx from 'clsx';

interface CameraScannerProps {
  onClose: () => void;
  onScanComplete: (grid: number[][]) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onClose, onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useLanguage();

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      // The image is already cropped by the native editor, so we just scan it
      const grid = await scanSudokuFromImage(uri);
      
      // Basic validation: Did we find at least a few numbers?
      const numbersFound = grid?.flat().filter(n => n !== 0).length || 0;

      if (grid && numbersFound >= 3) { // Threshold to consider it a success
        onScanComplete(grid);
      } else {
        Alert.alert(
          "No numbers found", 
          "Could not detect a Sudoku grid. Make sure to crop exactly around the puzzle border.",
          [{ text: "Try Again", onPress: () => setIsProcessing(false) }]
        );
      }
    } catch (e) {
      console.error("Scan failed", e);
      Alert.alert("Error", "Failed to process image.");
      setIsProcessing(false);
    }
  };

  const handleCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // CRITICAL: This enables the native crop tool
        quality: 1,
      });

      if (!result.canceled) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not launch camera.");
    }
  };

  const handleGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Gallery access is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // CRITICAL: This enables the native crop tool
        quality: 1,
      });

      if (!result.canceled) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  if (isProcessing) {
    return (
      <View className="flex-1 bg-black/90 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white font-bold mt-4 text-lg">Analyzing Grid...</Text>
        <Text className="text-slate-400 text-sm mt-2">Reading numbers...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl items-center space-y-8">
        
        <View className="items-center space-y-2">
            <View className="w-16 h-16 bg-blue-500/20 rounded-3xl items-center justify-center mb-2">
                <Camera size={32} color="#3b82f6" />
            </View>
            <Text className="text-2xl font-black text-white text-center">Scan Puzzle</Text>
            <Text className="text-slate-400 text-center text-sm px-4">
                Choose a source and <Text className="text-blue-400 font-bold">crop the image</Text> tightly around the grid borders.
            </Text>
        </View>

        <View className="w-full gap-4">
            <TouchableOpacity 
                onPress={handleCamera} 
                className="w-full py-4 bg-blue-600 rounded-2xl flex-row items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
            >
                <Camera size={20} color="white" />
                <Text className="text-white font-black text-base">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={handleGallery} 
                className="w-full py-4 bg-slate-800 border border-slate-700 rounded-2xl flex-row items-center justify-center gap-3"
            >
                <ImageIcon size={20} color="#94a3b8" />
                <Text className="text-slate-300 font-bold text-base">From Gallery</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onClose} className="mt-4">
            <Text className="text-slate-500 font-bold">Cancel</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};