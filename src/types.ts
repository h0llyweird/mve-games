export type GameType = 'dashboard' | 'sudoku' | 'solitaire' | 'chess' | 'wordsearch' | 'memory' | 'snake' | 'breakout' | 'pong' | 'tetris';

export type GameCategory = 'all' | 'puzzle' | 'card' | 'strategy' | 'word' | 'arcade';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PlayerStats {
  gamesPlayed: { [key in Exclude<GameType, 'dashboard'>]: number };
  highScores: { [key in Exclude<GameType, 'dashboard'>]: number };
  totalPlayTime: number; // in seconds
  xp: number;
  level: number;
  name: string;
  avatar: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
  xpReward: number;
}
