import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../utils/api';
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
      // Send image to Gemini API
      const result = await api.scanSudokuImage(uri);
      
      if (result && result.grid) {
        onScanComplete(result.grid);
      } else {
        Alert.alert(
          "Scan Failed", 
          "Could not detect a Sudoku grid. Make sure the image is clear and cropped.",
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
        allowsEditing: true, 
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
        allowsEditing: true,
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
        <Text className="text-slate-400 text-sm mt-2">Gemini is looking at your Sudoku</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-between p-6">
        
        {/* Header */}
        <View className="items-center mt-10 space-y-4">
            <View className="w-20 h-20 bg-blue-500/20 rounded-full items-center justify-center mb-2 shadow-lg shadow-blue-500/10">
                <Camera size={40} color="#60a5fa" />
            </View>
            <Text className="text-3xl font-black text-white text-center tracking-tight">Scan Puzzle</Text>
            <Text className="text-slate-400 text-center text-base px-4 leading-6">
                Take a photo or upload an image.{"\n"}
                <Text className="text-blue-400 font-bold">Crop tightly</Text> around the grid.
            </Text>
        </View>

        {/* Main Actions */}
        <View className="w-full gap-4 mb-10">
            <TouchableOpacity 
                onPress={handleCamera} 
                className="w-full py-5 bg-blue-600 active:bg-blue-500 rounded-3xl flex-row items-center justify-center gap-3 shadow-xl shadow-blue-900/50"
            >
                <Camera size={24} color="white" strokeWidth={2.5} />
                <Text className="text-white font-black text-lg">Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={handleGallery} 
                className="w-full py-5 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-3xl flex-row items-center justify-center gap-3"
            >
                <ImageIcon size={24} color="#94a3b8" />
                <Text className="text-slate-200 font-bold text-lg">From Gallery</Text>
            </TouchableOpacity>
        </View>

        {/* Footer Action */}
        <TouchableOpacity 
            onPress={onClose} 
            className="w-full py-4 border border-slate-800 rounded-2xl items-center flex-row justify-center gap-2 mb-2"
        >
            <X size={18} color="#64748b" />
            <Text className="text-slate-500 font-bold text-base">Cancel</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};