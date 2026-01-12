import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Trash2, Calendar, Clock, ChevronRight } from 'lucide-react-native';
import clsx from 'clsx';
import { SavedGame } from '../utils/storage';
import { useLanguage } from '../utils/i18n';

interface SavedGamesListProps {
  games: SavedGame[];
  onLoad: (game: SavedGame) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
  onClose: () => void;
}

export const SavedGamesList: React.FC<SavedGamesListProps> = ({ games, onLoad, onDelete, isDarkMode, onClose }) => {
  const { t } = useLanguage();
  const containerClass = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const cardClass = isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-100';

  const confirmDelete = (id: string) => {
    Alert.alert(
      t('deleteTitle'),
      t('deleteMsg'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('delete'), style: "destructive", onPress: () => onDelete(id) }
      ]
    );
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'EASY': return t('easy');
      case 'MEDIUM': return t('medium');
      case 'HARD': return t('hard');
      case 'EXPERT': return t('expert');
      case 'EXTREME': return t('extreme');
      default: return diff;
    }
  };

  return (
    <View className="flex-1 w-full">
      <View className="flex-row items-center justify-between mb-4">
        <Text className={clsx("text-xl font-black", textClass)}>{t('yourSaves')}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-blue-500 font-bold">{t('close')}</Text>
        </TouchableOpacity>
      </View>
      
      {games.length === 0 ? (
        <View className="flex-1 items-center justify-center py-10 opacity-50">
           <View className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full items-center justify-center mb-4">
             <Calendar size={24} color="#94a3b8" />
           </View>
           <Text className={clsx("font-bold", textClass)}>{t('noSaves')}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          {games.map((game) => (
            <TouchableOpacity 
              key={game.id} 
              onPress={() => onLoad(game)}
              className={clsx("p-4 rounded-2xl border flex-row items-center justify-between", cardClass)}
            >
               <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                     <Text className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                        {getDifficultyLabel(game.difficulty || "MEDIUM")}
                     </Text>
                     <Text className="text-[10px] font-bold text-slate-400">
                        {new Date(game.date).toLocaleDateString()}
                     </Text>
                  </View>
                  <Text className={clsx("text-base font-bold mb-1", textClass)} numberOfLines={1}>{game.name}</Text>
                  <View className="flex-row items-center gap-3">
                     <View className="flex-row items-center gap-1">
                        <Clock size={10} color="#94a3b8" />
                        <Text className="text-[10px] text-slate-500 font-medium">
                           {Math.floor(game.gameState.timer / 60).toString().padStart(2, '0')}:{(game.gameState.timer % 60).toString().padStart(2, '0')}
                        </Text>
                     </View>
                     <Text className="text-[10px] text-slate-500 font-medium">
                        {t('mistakes')}: {game.gameState.mistakes}/{game.gameState.maxMistakes}
                     </Text>
                  </View>
               </View>

               <View className="flex-row items-center gap-2">
                 <TouchableOpacity onPress={() => confirmDelete(game.id)} className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl">
                   <Trash2 size={16} color="#ef4444" />
                 </TouchableOpacity>
                 <View className="p-2.5 bg-slate-200 dark:bg-zinc-700 rounded-xl">
                   <ChevronRight size={16} color={isDarkMode ? "#e4e4e7" : "#475569"} />
                 </View>
               </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};