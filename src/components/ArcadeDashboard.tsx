import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Gamepad2, Cpu, Sparkles, ChevronRight, Edit3,
  Search, Clock, Award, Volume2, VolumeX, Moon, Sun
} from 'lucide-react';
import { GameType, GameCategory, PlayerStats, Achievement } from '../types';

interface ArcadeDashboardProps {
  stats: PlayerStats;
  achievements: Achievement[];
  onSelectGame: (game: GameType) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  playAudio: (type: 'click') => void;
}

const CATEGORY_COLORS: Record<GameCategory, { badge: string; dot: string; text: string }> = {
  puzzle: {
    badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    dot: 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]',
    text: 'text-violet-400'
  },
  card: {
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    text: 'text-emerald-400'
  },
  strategy: {
    badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    text: 'text-amber-400'
  },
  word: {
    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    text: 'text-rose-400'
  },
  arcade: {
    badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]',
    text: 'text-cyan-400'
  },
  all: {
    badge: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    dot: 'bg-slate-400',
    text: 'text-slate-400'
  }
};

const ARCADE_GAMES = [
  {
    id: 'sudoku' as GameType,
    title: 'SUDOKU MASTER',
    category: 'puzzle' as GameCategory,
    description: 'Classic number logic puzzle. Fill the 9x9 grid so each row, column, and box contains the digits 1-9.',
    features: ['Number keypad input', 'Pencil mark notes', 'Mistakes tracker'],
    accent: 'from-violet-500 to-fuchsia-600',
    shadowColor: 'rgba(138, 43, 226, 0.4)',
    icon: '🧩',
  },
  {
    id: 'solitaire' as GameType,
    title: 'SOLITAIRE MASTER',
    category: 'card' as GameCategory,
    description: 'Standard Klondike deck sorting game. Organize all cards sequentially by same suit.',
    features: ['Double card rotations', 'Unlimited Undo actions', 'Symmetrical stack heights'],
    accent: 'from-emerald-500 to-teal-600',
    shadowColor: 'rgba(50, 205, 50, 0.4)',
    icon: '🃏',
  },
  {
    id: 'chess' as GameType,
    title: 'CHESS CHALLENGE',
    category: 'strategy' as GameCategory,
    description: 'Play standard Chess against a self-contained AI opponent with customizable difficulties.',
    features: ['Multiple AI parameters', 'Algebraic move records', 'Valid placements mapping'],
    accent: 'from-amber-500 to-orange-600',
    shadowColor: 'rgba(255, 140, 0, 0.4)',
    icon: '👑',
  },
  {
    id: 'wordsearch' as GameType,
    title: 'WORD SEARCH PRO',
    category: 'word' as GameCategory,
    description: 'Find hidden words in letter grids using click-and-drag selection.',
    features: ['Multiple dictionaries', 'Drag to select', 'Time bonus multipliers'],
    accent: 'from-rose-500 to-pink-600',
    shadowColor: 'rgba(244, 63, 94, 0.4)',
    icon: '🔍',
  },
  {
    id: 'memory' as GameType,
    title: 'MEMORY MATCH',
    category: 'puzzle' as GameCategory,
    description: 'Match pairs of cards by remembering their positions. Train your memory with custom themes.',
    features: ['Smooth 3D card flips', 'Multiple themes', 'Accuracy tracking'],
    accent: 'from-cyan-500 to-sky-600',
    shadowColor: 'rgba(6, 182, 212, 0.4)',
    icon: '🧠',
  },
  {
    id: 'snake' as GameType,
    title: 'SNAKE RUSH',
    category: 'arcade' as GameCategory,
    description: 'Classic snake game. Eat food, grow longer, avoid walls and yourself. How long can you survive?',
    features: ['Smooth movement', 'Score tracking', 'Increasing speed'],
    accent: 'from-green-500 to-emerald-600',
    shadowColor: 'rgba(34, 197, 94, 0.4)',
    icon: '🐍',
  },
  {
    id: 'breakout' as GameType,
    title: 'BREAKOUT',
    category: 'arcade' as GameCategory,
    description: 'Classic brick breaker. Bounce the ball to break all bricks. Use the paddle to keep the ball in play.',
    features: ['Multiple levels', 'Power-ups', 'Lives system'],
    accent: 'from-blue-500 to-indigo-600',
    shadowColor: 'rgba(59, 130, 246, 0.4)',
    icon: '🏀',
  },
  {
    id: 'pong' as GameType,
    title: 'PONG CLASSIC',
    category: 'arcade' as GameCategory,
    description: 'The classic table tennis game. Play against AI opponent. First to win reaches victory!',
    features: ['AI opponent', 'Speed variations', 'Score tracking'],
    accent: 'from-rose-500 to-red-600',
    shadowColor: 'rgba(244, 63, 94, 0.4)',
    icon: '🏓',
  },
  {
    id: 'tetris' as GameType,
    title: 'TETRIS BLOCKS',
    category: 'arcade' as GameCategory,
    description: 'Stack falling blocks to clear lines. Survive as long as possible in this timeless puzzle classic.',
    features: ['Classic gameplay', 'Line clearing', 'Endless mode'],
    accent: 'from-purple-500 to-violet-600',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
    icon: '🧱',
  }
];

export default function ArcadeDashboard({
  stats,
  achievements,
  onSelectGame,
  soundEnabled,
  onToggleSound,
  darkMode,
  onToggleDarkMode,
  playAudio
}: ArcadeDashboardProps) {
  const [filter, setFilter] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingName, setEditingName] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>(stats.name || 'GUEST PLAYER');

  const filteredGames = ARCADE_GAMES.filter(game => {
    const matchesCategory = filter === 'all' || game.category === filter;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const xpPercent = (stats.xp % 1000) / 10; // 1000 XP needed to level up

  const handleSaveName = () => {
    playAudio('click');
    setEditingName(false);
    localStorage.setItem('arcade_player_name', profileName);
    stats.name = profileName;
  };

  const getFormatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className={`w-full max-w-7xl mx-auto flex flex-col gap-8 p-4 md:p-8 min-h-screen transition-colors duration-300 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Upper Terminal Controls Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-5 rounded-[28px] border backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-black/40 border-white/5 shadow-2xl' : 'bg-white/60 border-black/5 shadow-md'}`}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#4B5563] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#4B5563]/25 select-none animate-pulse">
            <Cpu className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              SOLARIS<span className="text-[#4B5563] font-light ml-1">PORTAL</span>
            </h1>
            <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${darkMode ? 'text-white/40' : 'text-black/40'}`}>System Console • M.V. ELECTRONIX</p>
          </div>
        </div>

        {/* Global Toolbar Options */}
        <div className="flex items-center gap-3">
          {/* Sound toggle button */}
          <button 
            onClick={onToggleSound}
            className={`p-3 rounded-xl active:scale-95 transition-all text-slate-400 hover:text-white cursor-pointer border ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-black/5 hover:bg-black/10 border-black/10'}`}
            title="Toggle Audio synthesis"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#4B5563]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Dark Mode toggle button */}
          <button 
            onClick={onToggleDarkMode}
            className={`p-3 rounded-xl active:scale-95 transition-all text-slate-400 hover:text-white cursor-pointer border ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-black/5 hover:bg-black/10 border-black/10'}`}
            title="Toggle color theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
          </button>

          <div className={`hidden sm:flex flex-col items-end px-3 py-1 border rounded-xl select-none ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
            <span className={`text-[8px] uppercase tracking-widest ${darkMode ? 'text-white/30' : 'text-black/40'}`}>STATUS</span>
            <span className={`text-[10px] font-mono leading-none ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Games Grid */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Greeting Banner */}
          <div className={`relative overflow-hidden rounded-[32px] border p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-white/70 border-black/10 text-slate-800'}`}>
            {/* Background elements */}
            {!darkMode && <div className="absolute top-0 right-0 w-64 h-64 bg-[#4B5563]/5 rounded-full blur-[100px] pointer-events-none" />}
            {!darkMode && <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6b21ff]/5 rounded-full blur-[140px] pointer-events-none" />}

            <div className="text-left flex flex-col gap-4 relative z-10 w-full font-sans">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black tracking-[0.25em] rounded-full flex items-center gap-1 uppercase shadow-[0_0_12px_rgba(245,158,11,0.1)]">
                  <Sparkles className="w-3 h-3 text-amber-500" /> GAMES ARCADE
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2 w-full max-w-sm">
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      maxLength={18}
                      className="flex-1 bg-black/40 border border-[#4B5563]/40 text-sm font-bold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-[#4B5563]"
                    />
                    <button 
                      onClick={handleSaveName}
                      className="px-4 py-2 bg-[#4B5563] text-black font-black text-xs rounded-xl hover:bg-[#4B5563]/90 transition-colors cursor-pointer"
                    >
                      SAVE
                    </button>
                  </div>
                ) : (
                    <h2 className="text-3xl md:text-4.5xl font-serif italic tracking-tight leading-none text-left flex items-center gap-3" style={{ fontFamily: 'var(--font-serif)' }}>
                    Welcome, <span className="text-[#4B5563] not-italic font-sans font-black tracking-normal uppercase text-2xl md:text-3xl ml-1">{profileName}</span>
                    <button 
                      onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </h2>
                )}
              </div>
              <p className={`text-xs md:text-sm leading-relaxed max-w-xl ${darkMode ? 'text-white/50' : 'text-slate-600'}`}>
                Choose from a collection of classic games. Solve puzzles, test your memory, and challenge the AI in a modern arcade experience.
              </p>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className={`border rounded-[24px] p-4 flex flex-wrap gap-4 items-center justify-between transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-black/10'}`}>
            <div className="flex items-center gap-2 overflow-x-auto pr-2 scrollbar-none">
              {(['all', 'puzzle', 'card', 'strategy', 'word', 'arcade'] as GameCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { playAudio('click'); setFilter(cat); }}
                  className={`px-4 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    filter === cat
                      ? 'bg-[#4B5563] text-black shadow-[0_0_15px_rgba(75,85,99,0.3)] scale-[1.02]'
                      : `border ${darkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-black/5 border-transparent text-slate-600 hover:bg-black/10 hover:text-black'}`
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-48 mt-2 sm:mt-0">
              <input 
                type="text" 
                placeholder="Search portals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 pl-9 text-xs font-semibold focus:outline-none transition-all duration-300 ${darkMode ? 'bg-black/40 border-white/10 focus:border-[#4B5563] text-slate-200' : 'bg-white/80 border-black/10 focus:border-indigo-500 text-slate-800'}`}
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Games Cards Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGames.map((game) => {
              const catTheme = CATEGORY_COLORS[game.category as GameCategory] || CATEGORY_COLORS.all;
              return (
                <motion.div
                  key={game.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className={`rounded-[32px] border p-6 flex flex-col justify-between gap-6 relative overflow-hidden group shadow-xl backdrop-blur-2xl transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-white/60 border-black/10 text-slate-800'}`}
                  style={{
                    boxShadow: darkMode ? 'none' : '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Background ambient glow matching category theme color */}
                  {!darkMode && <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-300 bg-current ${catTheme.text}`} />}

                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none">
                        {game.icon}
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-1 text-[9px] font-bold tracking-[0.15em] rounded-lg select-none uppercase border ${catTheme.badge}`}>
                          {game.category}
                        </span>
                      </div>
                    </div>

                    <h3 className={`text-lg font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{game.title}</h3>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-white/60' : 'text-slate-600'}`}>{game.description}</p>

                    <div className="mt-4 flex flex-col gap-1.5 border-t border-white/5 pt-4">
                      {game.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${catTheme.dot}`} />
                          <span className={darkMode ? 'text-white/50' : 'text-slate-600'}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="text-xs font-mono">
                      <span className="text-slate-500 block text-[9px] font-bold tracking-wider">LIFETIME SCORE</span>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.highScores[game.id as Exclude<GameType, 'dashboard'>] || 0} PTS</span>
                    </div>

                    <button
                      onClick={() => { playAudio('click'); onSelectGame(game.id); }}
                      className="py-2 px-6 rounded-2xl bg-[#4B5563] hover:bg-[#5D6874] text-white font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(75,85,99,0.25)] active:scale-[0.97] transition-all"
                    >
                      <span>LAUNCH PORTAL</span>
                      <ChevronRight className="w-4 h-4 text-white stroke-[3]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Achievements and Profile Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Player stats level-bar context */}
          <div className={`rounded-[32px] border p-6 backdrop-blur-2xl relative overflow-hidden shadow-2xl flex flex-col gap-6 transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-black/10'}`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#4B5563] font-bold border-b border-white/5 pb-2">Active Level Metrics</div>
            
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full bg-[#4B5563] p-[2px] flex items-center justify-center relative shadow-lg shadow-[#4B5563]/25">
                <div className={`w-full h-full rounded-full flex items-center justify-center ${darkMode ? 'bg-[#020205]' : 'bg-white'}`}>
                  <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.level}</span>
                </div>
              </div>

              <div className="flex-1 text-left flex flex-col">
                <span className={`text-[9px] uppercase tracking-widest leading-none mb-1 ${darkMode ? 'text-white/40' : 'text-slate-500'}`}>COGNITIVE LEVEL</span>
                <span className={`text-sm font-black uppercase ${darkMode ? 'text-white' : 'text-slate-900'}`}>LEVEL {stats.level}</span>
                <span className="text-[10px] text-amber-500 font-mono mt-1">{stats.xp} XP COMPILING</span>
              </div>
            </div>

            {/* Level percentage visual completion */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>PROCESSING POWER</span>
                <span>{xpPercent}%</span>
              </div>
              <div className="h-[2px] w-full bg-white/5 rounded-full">
                <div 
                  className="h-full bg-amber-500 shadow-[0_0_10px_#eab308] rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Profile Overview Stats */}
          <div className={`rounded-[32px] border p-6 backdrop-blur-2xl relative overflow-hidden shadow-2xl flex flex-col gap-6 transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-black/10'}`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#4B5563] font-bold border-b border-white/5 pb-2">Lifetime Metrics</div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl text-left flex flex-col gap-1 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <span className="text-[9px] text-slate-500 font-bold tracking-wider">TOTAL DURATION</span>
                <div className="text-xs sm:text-sm font-black font-mono text-[#4B5563] flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-[#4B5563]" />
                  <span>{getFormatTime(stats.totalPlayTime)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl text-left flex flex-col gap-1 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <span className="text-[9px] text-slate-500 font-bold tracking-wider">PORTAL ENGAGEMENTS</span>
                <div className="text-base font-black font-mono text-[#6b21ff] flex items-center gap-1.5 mt-1">
                  <Gamepad2 className="w-4 h-4 text-[#6b21ff]" />
                  <span>{Object.values(stats.gamesPlayed).reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Shelf Grid */}
          <div className={`rounded-[32px] border p-6 backdrop-blur-2xl relative overflow-hidden shadow-2xl flex flex-col gap-6 transition-all duration-300 ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-black/10'}`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#4B5563] font-bold">PORTAL TROPHIES ({achievements.filter(a => a.unlocked).length}/{achievements.length})</div>
              <Award className="w-4 h-4 text-amber-500" />
            </div>

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`p-3 rounded-2xl border transition-all duration-300 flex items-start gap-4 text-left ${
                    ach.unlocked 
                      ? 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                      : 'bg-white/5 border-transparent opacity-40'
                  }`}
                >
                  <div className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none">
                    {ach.icon}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 font-sans">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black ${ach.unlocked ? 'text-amber-500' : 'text-slate-400'}`}>
                        {ach.title}
                      </span>
                      {ach.unlocked && <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-black">+{ach.xpReward} XP</span>}
                    </div>
                    <span className={`text-[10px] leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{ach.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
