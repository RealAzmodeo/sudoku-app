import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Eraser, Undo, Pencil, Sparkles } from 'lucide-react-native';
import clsx from 'clsx';
import { useLanguage } from '../utils/i18n';

interface ControlPanelProps {
  onNumberClick: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onHint: () => void;
  isNoteMode: boolean;
  toggleNoteMode: () => void;
  numberCounts: Record<number, number>;
  isDarkMode: boolean; // Explicit prop
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onNumberClick,
  onErase,
  onUndo,
  onHint,
  isNoteMode,
  toggleNoteMode,
  numberCounts,
  isDarkMode,
}) => {
  const { t } = useLanguage();

  return (
    <View className="flex-col gap-4 px-4 pb-4">
      <View className="flex-row justify-between items-center px-2">
        <TouchableOpacity onPress={onUndo} className="items-center justify-center p-2">
          <Undo size={24} color="#64748b" />
          <Text className="text-[10px] uppercase font-bold text-slate-500 mt-1">{t('undo')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onErase} className="items-center justify-center p-2">
          <Eraser size={24} color="#64748b" />
          <Text className="text-[10px] uppercase font-bold text-slate-500 mt-1">{t('erase')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleNoteMode} className="items-center justify-center p-2">
          <View className={clsx("p-1 rounded-lg", isNoteMode ? "bg-blue-100" : "")}>
            <Pencil size={24} color={isNoteMode ? "#2563eb" : "#64748b"} />
          </View>
          <Text className={clsx("text-[10px] uppercase font-bold mt-1", isNoteMode ? "text-blue-600" : "text-slate-500")}>{t('notes')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onHint} className="items-center justify-center p-2">
          <Sparkles size={24} color="#eab308" />
          <Text className="text-[10px] uppercase font-bold text-slate-500 mt-1">{t('hint')}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => onNumberClick(num)}
            className={clsx(
                "w-[30%] aspect-[2/1] rounded-xl items-center justify-center border shadow-sm",
                isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-200"
            )}
          >
            <Text className={clsx("text-2xl font-medium", isDarkMode ? "text-blue-400" : "text-blue-600")}>{num}</Text>
            {numberCounts[num] >= 9 && (
               <View className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};