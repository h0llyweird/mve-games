import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameType, PlayerStats, Achievement } from './types';
import { useSound } from './hooks/useSound';
import ArcadeDashboard from './components/ArcadeDashboard';
import SudokuGame from './components/games/SudokuGame';
import SolitaireGame from './components/games/SolitaireGame';
import ChessGame from './components/games/ChessGame';
import WordSearchGame from './components/games/WordSearchGame';
import MemoryMatchGame from './components/games/MemoryMatchGame';
import SnakeGame from './components/games/SnakeGame';
import BreakoutGame from './components/games/BreakoutGame';
import PongGame from './components/games/PongGame';
import TetrisGame from './components/games/TetrisGame';


const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_play', title: 'Arcade Rookie', description: 'Deconstruct a game portal on M.V. Electronix for the first time.', unlocked: false, icon: '🚀', xpReward: 100 },
  { id: 'sudoku_champ', title: 'Sudoku Scholar', description: 'Solve a full logic Sudoku Master grid.', unlocked: false, icon: '🧩', xpReward: 150 },
  { id: 'solitaire_win', title: 'Klondike Master', description: 'Organize all foundation cards on Solitaire Master piles.', unlocked: false, icon: '🃏', xpReward: 200 },
  { id: 'chess_conqueror', title: 'Checkmate Tactician', description: 'Complete a Tactical Chess simulation battle against the AI.', unlocked: false, icon: '👑', xpReward: 250 },
  { id: 'wordsearch_pro', title: 'Data Crawler', description: 'Extract all strings on Word Search Pro directories.', unlocked: false, icon: '🔍', xpReward: 150 },
  { id: 'memory_genius', title: 'Synaptic Linker', description: 'Perfect matching pair retains on Memory Match grid.', unlocked: false, icon: '🧠', xpReward: 100 },
  { id: 'snake_master', title: 'Serpent Speed', description: 'Reach score 500 in Snake survival mode.', unlocked: false, icon: '🐍', xpReward: 200 },
  { id: 'breakout_pro', title: 'Brick Breaker', description: 'Clear all bricks in Breakout without losing a life.', unlocked: false, icon: '🏀', xpReward: 250 },
  { id: 'pong_champ', title: 'Table Tennis Pro', description: 'Win a Pong match against AI on Hard difficulty.', unlocked: false, icon: '🏓', xpReward: 300 },
  { id: 'tetris_master', title: 'Block Stacker', description: 'Survive for 5 minutes in Tetris endless mode.', unlocked: false, icon: '🧱', xpReward: 350 },
  { id: 'level_architect', title: 'Level Architect', description: 'Reach profile level 5 across system arcade portals.', unlocked: false, icon: '🏆', xpReward: 500 }
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<GameType>('dashboard');
  const sound = useSound();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('arcade_dark_mode');
    return saved === null ? true : saved === 'true';
  });

  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('arcade_player_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing stats, resetting', e);
      }
    }
    return {
      gamesPlayed: { sudoku: 0, solitaire: 0, chess: 0, wordsearch: 0, memory: 0, snake: 0, breakout: 0, pong: 0, tetris: 0 },
      highScores: { sudoku: 0, solitaire: 0, chess: 0, wordsearch: 0, memory: 0, snake: 0, breakout: 0, pong: 0, tetris: 0 },
      totalPlayTime: 0,
      xp: 0,
      level: 1,
      name: localStorage.getItem('arcade_player_name') || 'GUEST PLAYER',
      avatar: '👑'
    };
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('arcade_player_achievements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Achievement[];
        // Merge missing ones if any
        return INITIAL_ACHIEVEMENTS.map(initial => {
          const match = parsed.find(p => p.id === initial.id);
          return match ? { ...initial, unlocked: match.unlocked, unlockedAt: match.unlockedAt } : initial;
        });
      } catch (e) {
        console.warn('Failed parsing achievements, resetting', e);
      }
    }
    return INITIAL_ACHIEVEMENTS;
  });

  const [unlockedBanner, setUnlockedBanner] = useState<Achievement | null>(null);

  // Auto-sync stats and achievements to localStorage
  useEffect(() => {
    localStorage.setItem('arcade_player_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('arcade_player_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('arcade_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Overall play duration tracker ticker
  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;

  useEffect(() => {
    const interval = setInterval(() => {
      // Advance play time of systemic operations
      setStats(prev => {
        const nextTime = prev.totalPlayTime + 1;
        // Verify Level architect milestone checks
        let nextLevel = prev.level;
        if (prev.xp > nextLevel * 1000) {
          nextLevel = Math.floor(prev.xp / 1000) + 1;
          setTimeout(() => {
            sound.play('levelUp');
          }, 100);
        }
        return {
          ...prev,
          totalPlayTime: nextTime,
          level: nextLevel
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateXp = (amount: number) => {
    setStats(prev => {
      const nextXp = prev.xp + amount;
      const nextLevel = Math.floor(nextXp / 1000) + 1;
      
      if (nextLevel > prev.level) {
        setTimeout(() => {
          sound.play('levelUp');
          triggerAchievement('level_architect');
        }, 120);
      }
      return {
        ...prev,
        xp: nextXp,
        level: nextLevel
      };
    });
  };

  const handleRecordGamePlayed = (gameType: Exclude<GameType, 'dashboard'>, score: number) => {
    setStats(prev => {
      const currentPlays = prev.gamesPlayed[gameType] || 0;
      const currentHighScore = prev.highScores[gameType] || 0;
      
      const updatedPlays = { ...prev.gamesPlayed, [gameType]: currentPlays + 1 };
      const updatedHighs = { ...prev.highScores, [gameType]: Math.max(currentHighScore, score) };

      // evaluate achievement metrics targets
      setTimeout(() => {
        // rookie badge unlocks on any gameplay
        triggerAchievement('first_play');

        if (gameType === 'sudoku') triggerAchievement('sudoku_champ');
        if (gameType === 'solitaire') triggerAchievement('solitaire_win');
        if (gameType === 'chess') triggerAchievement('chess_conqueror');
        if (gameType === 'wordsearch') triggerAchievement('wordsearch_pro');
        if (gameType === 'memory') triggerAchievement('memory_genius');
        if (gameType === 'snake') triggerAchievement('snake_master');
        if (gameType === 'breakout') triggerAchievement('breakout_pro');
        if (gameType === 'pong') triggerAchievement('pong_champ');
        if (gameType === 'tetris') triggerAchievement('tetris_master');
      }, 200);

      return {
        ...prev,
        gamesPlayed: updatedPlays,
        highScores: updatedHighs
      };
    });
  };

  const triggerAchievement = (id: string) => {
    setAchievements(prev => {
      const match = prev.find(a => a.id === id);
      if (match && !match.unlocked) {
        // Unlock unlocked banner layout
        const next = prev.map(a => a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a);
        setUnlockedBanner({ ...match, unlocked: true });
        handleUpdateXp(match.xpReward);
        
        setTimeout(() => {
          setUnlockedBanner(null);
        }, 4500);

        return next;
      }
      return prev;
    });
  };

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#020205] text-white' : 'bg-[#f4f4f6] text-slate-900'}`}>
      {/* Immersive UI Background Glow Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {!darkMode && <div className="absolute top-[-10%] left-[-5%] w-[70%] h-[70%] rounded-full blur-[120px] transition-all duration-500 bg-[#00f5ff]/5" />}
        {!darkMode && <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full blur-[120px] transition-all duration-500 bg-[#6b21ff]/5" />}
      </div>
      
      {/* Visual active screen port renderers */}
      <div className="relative z-10">
        {activeScreen === 'dashboard' && (
          <ArcadeDashboard 
            stats={stats}
            achievements={achievements}
            onSelectGame={setActiveScreen}
            soundEnabled={sound.soundEnabled}
            onToggleSound={sound.toggleSound}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            playAudio={sound.play}
          />
        )}

        {activeGameRender(activeScreen, {
          onBack: () => { sound.play('click'); setActiveScreen('dashboard'); },
          playAudio: sound.play,
          updateXp: handleUpdateXp,
          recordGamePlayed: handleRecordGamePlayed
        })}
      </div>

      {/* Absolute Unlocked Banner Overlay Banner */}
      <AnimatePresence>
        {unlockedBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#020205] border border-white/10 p-4 rounded-2xl shadow-2xl w-full max-w-sm flex items-center gap-4 text-white"
          >
            <div className="text-3xl bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 select-none">
              {unlockedBanner.icon}
            </div>
            
            <div className="flex-1 text-left">
              <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase block animate-pulse">ACHIEVEMENT UNLOCKED</span>
              <h4 className="text-xs font-black text-white">{unlockedBanner.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{unlockedBanner.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper switch renders
function activeGameRender(scr: GameType, props: any) {
  switch (scr) {
    case 'sudoku': 
      return <SudokuGame {...props} />;
    case 'solitaire': 
      return <SolitaireGame {...props} />;
    case 'chess': 
      return <ChessGame {...props} />;
    case 'wordsearch': 
      return <WordSearchGame {...props} />;
    case 'memory': 
      return <MemoryMatchGame {...props} />;
    case 'snake': 
      return <SnakeGame {...props} />;
    case 'breakout': 
      return <BreakoutGame {...props} />;
    case 'pong': 
      return <PongGame {...props} />;
    case 'tetris': 
      return <TetrisGame {...props} />;
    default: 
      return null;
  }
}


