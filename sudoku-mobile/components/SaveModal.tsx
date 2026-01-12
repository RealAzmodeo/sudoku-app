import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Save, X } from 'lucide-react-native';
import clsx from 'clsx';
import { useLanguage } from '../utils/i18n';

interface SaveModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isDarkMode: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isVisible, onClose, onSave, isDarkMode }) => {
  const [name, setName] = useState('');
  const { t } = useLanguage();

  const handleSave = () => {
    onSave(name);
    setName('');
  };

  const containerClass = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const inputClass = isDarkMode ? 'bg-zinc-950 text-slate-100 border-zinc-700' : 'bg-slate-50 text-slate-900 border-slate-200';

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 items-center justify-center bg-black/50 p-6"
      >
        <View className={clsx("w-full max-w-sm rounded-[2rem] p-6 border shadow-2xl gap-4", containerClass)}>
          
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Save size={24} color="#3b82f6" />
              </View>
              <View>
                <Text className={clsx("text-lg font-black", textClass)}>{t('saveGameTitle')}</Text>
                <Text className="text-[10px] text-slate-500 font-bold uppercase">{t('keepProgress')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View>
            <Text className={clsx("text-xs font-bold mb-2 ml-1", textClass)}>{t('nameSave')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Morning Puzzle"
              placeholderTextColor="#94a3b8"
              className={clsx("w-full px-4 py-3 rounded-xl border font-bold", inputClass)}
              autoFocus
            />
          </View>

          <View className="flex-row gap-3 mt-2">
             <TouchableOpacity onPress={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-zinc-800 rounded-xl items-center">
                <Text className={clsx("font-bold text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>{t('cancel')}</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={handleSave} className="flex-1 py-3 bg-blue-600 rounded-xl items-center shadow-lg shadow-blue-500/30">
                <Text className="font-bold text-sm text-white">{t('saveBtn')}</Text>
             </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};