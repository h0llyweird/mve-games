import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Lightbulb, CheckCircle2, Star, Zap, Eye } from 'lucide-react';
import { Difficulty } from '../../types';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'memory', score: number) => void;
}

const THEMES = {
  numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'],
  letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
  animals: ['🐶', '🐱', '🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐹', '🦊', '🐸', '🦉', '🐙', '🐝', '🦋', '🐛', '🦖', '🦕'],
  fruits: ['🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🥑', '🥥', '🥦', '🌽', '🍕', '🍰'],
  tech: ['💻', '📱', '🕹️', '💾', '💿', '🔌', '📡', '🛰️', '💡', '🔋', '⚙️', '🛡️', '🔑', '🚀', '🛸', '🤖', '👾', '🕹️']
};

export default function MemoryMatchGame({ onBack, playAudio, updateXp, recordGamePlayed }: MemoryMatchGameProps) {
  const [theme, setTheme] = useState<keyof typeof THEMES>('animals');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<Card[]>([]);
  const [turns, setTurns] = useState<number>(0);
  const [matches, setMatches] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [hints, setHints] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const [activeSelections, setActiveSelections] = useState<number[]>([]); // indexes of 2 flipped cards
  const [lockBoard, setLockBoard] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && !isCompleted) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isCompleted]);

  const startNewGame = () => {
    playAudio('click');
    setTurns(0);
    setMatches(0);
    setScore(0);
    setTime(0);
    setHints(3);
    setIsCompleted(false);
    setActiveSelections([]);
    setLockBoard(false);

    // Grid sizes: easy = 4x4 (16 cards = 8 pairs), medium = 4x6 (24 cards = 12 pairs), hard = 6x6 (36 cards = 18 pairs)
    let pairsCount = 8;
    if (difficulty === 'medium') pairsCount = 12;
    if (difficulty === 'hard') pairsCount = 18;

    const themeValues = THEMES[theme].slice(0, pairsCount);
    
    // Create pairs
    const deckValues = [...themeValues, ...themeValues];
    
    // Shuffle
    for (let i = deckValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckValues[i], deckValues[j]] = [deckValues[j], deckValues[i]];
    }

    const initialCards: Card[] = deckValues.map((val, idx) => ({
      id: idx,
      value: val,
      isFlipped: false,
      isMatched: false
    }));

    setCards(initialCards);
    setIsPlaying(true);
  };

  const handleCardClick = (idx: number) => {
    if (!isPlaying || isCompleted || lockBoard || cards[idx].isFlipped || cards[idx].isMatched) return;

    playAudio('flip');
    const updatedCards = [...cards];
    updatedCards[idx].isFlipped = true;
    setCards(updatedCards);

    const newSelections = [...activeSelections, idx];
    setActiveSelections(newSelections);

    if (newSelections.length === 2) {
      setLockBoard(true);
      setTurns(t => t + 1);

      const firstIdx = newSelections[0];
      const secondIdx = newSelections[1];

      if (cards[firstIdx].value === cards[secondIdx].value) {
        // Pairs MATCHED success!
        setTimeout(() => {
          playAudio('success');
          updatedCards[firstIdx].isMatched = true;
          updatedCards[secondIdx].isMatched = true;
          setCards(updatedCards);
          setMatches(m => m + 1);
          setScore(s => s + 50);

          setActiveSelections([]);
          setLockBoard(false);

          // Check Win Condition
          const totalPairsCount = cards.length / 2;
          if (matches + 1 === totalPairsCount) {
            setIsCompleted(true);
            playAudio('victory');
            const bonusScore = score + 50 + Math.max(10, 300 - turns * 5 - Math.floor(time / 2));
            updateXp(bonusScore);
            recordGamePlayed('memory', bonusScore);
          }
        }, 500);
      } else {
        // MATCH FAIL
        setTimeout(() => {
          playAudio('error');
          updatedCards[firstIdx].isFlipped = false;
          updatedCards[secondIdx].isFlipped = false;
          setCards(updatedCards);

          setActiveSelections([]);
          setLockBoard(false);
        }, 1100);
      }
    }
  };

  const handleHint = () => {
    if (hints <= 0 || lockBoard || !isPlaying || isCompleted) return;
    
    // Locate unmatched pairs
    const unmatched = cards.filter(c => !c.isMatched && !c.isFlipped);
    if (unmatched.length === 0) return;

    playAudio('success');
    setHints(h => h - 1);
    setLockBoard(true);

    // Briefly flip open all cards for 1 second
    const savedStates = cards.map(c => ({ ...c }));
    const hintFlipped = cards.map(c => ({ ...c, isFlipped: true }));
    setCards(hintFlipped);

    setTimeout(() => {
      setCards(savedStates);
      setLockBoard(false);
    }, 1200);
  };

  const getFormatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getGridColsClass = () => {
    if (difficulty === 'easy') return 'grid-cols-4';
    if (difficulty === 'medium') return 'grid-cols-4 sm:grid-cols-6';
    return 'grid-cols-6';
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-2 md:p-6 text-white min-h-[95vh]">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 bg-slate-950/40 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="hidden sm:inline">PORTALS</span>
          </button>
          
          <div>
            <h1 className="text-xl md:text-2xl font-serif italic text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <span>Memory Match</span>
            </h1>
            <p className="text-xs text-slate-400">Match pairs of cards by remembering their positions</p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4 text-xs md:text-sm bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 font-mono">
            <div className="text-slate-400">
              TIME: <span className="text-white font-bold">{getFormatTime(time)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-400">
              MATCHES: <span className="text-cyan-400 font-bold">{matches}/{cards.length / 2}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-300">
              TURNS: <span className="text-slate-400 font-bold">{turns}</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          /* Selection Configuration Lobby */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-10"
          >
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl text-center flex flex-col gap-6">
              <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#6b21ff] flex items-center justify-center text-white shadow-lg shadow-[#6b21ff]/20">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Game Settings</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">Choose a theme and difficulty level</p>
              </div>

              {/* Theme selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-left text-slate-400 pl-1 uppercase font-bold tracking-wider">VISUAL THEMES</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map((tName) => (
                    <button
                      key={tName}
                      onClick={() => setTheme(tName)}
                      className={`py-3 px-1 rounded-xl text-xs font-black uppercase transition-all duration-200 border cursor-pointer ${
                        theme === tName
                          ? 'bg-[#6b21ff] border-[#6b21ff] text-white font-black shadow-lg scale-[1.02]'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                      }`}
                    >
                      {tName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulties */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-left text-slate-400 pl-1 uppercase font-bold tracking-wider">DIFFICULTY PRESET</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => {
                    const lab = diff === 'easy' ? '4x4' : diff === 'medium' ? '4x6' : '6x6';
                    return (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={`py-3 px-2 rounded-xl text-xs font-black transition-all duration-200 border cursor-pointer ${
                          difficulty === diff
                            ? 'bg-[#6b21ff] border-[#6b21ff] text-white font-black shadow-lg scale-[1.02]'
                            : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                        }`}
                      >
                        <span className="block font-black">{diff.toUpperCase()}</span>
                        <span className="block text-[10px] opacity-60 font-semibold">{lab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,78,0,0.25)] active:scale-[0.98] transition-transform duration-100 cursor-pointer text-sm uppercase tracking-wider"
              >
                 START GAME
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Interactive Memory Match Gameplay Board */
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Grid Workspace */}
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="p-4 bg-slate-950/80 rounded-3xl border-2 border-slate-700/60 shadow-2xl relative w-full max-w-lg select-none">
                <div className={`grid gap-3 p-1 ${getGridColsClass()}`}>
                  {cards.map((card, idx) => {
                    const isFlipped = card.isFlipped || card.isMatched;
                    return (
                      <div
                        key={card.id}
                        onClick={() => handleCardClick(idx)}
                        className="aspect-square relative cursor-pointer group pers-1000"
                      >
                        <div 
                          className={`w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d relative ${
                            isFlipped ? 'rotate-y-180' : ''
                          }`}
                        >
                          {/* Face Back (gorgeous space geometric) */}
                          <div className="absolute inset-0 backface-hidden bg-[#120824] border border-white/15 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-[1.03] transition-transform">
                            {/* Circuit nodes details inside */}
                            <div className="w-5 h-5 rounded-full border-2 border-cyan-500/20 bg-cyan-500/5 animate-pulse" />
                          </div>

                          {/* Face Open (vector characters emojis) */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 border-2 border-cyan-500/40 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-3xl md:text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                              {card.value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Checklist stats controllers Side Pad */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-4 text-center">
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase text-left">ACTIONS</span>
                <button
                  onClick={handleHint}
                  disabled={hints <= 0}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-xl font-black text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" /> REVEAL ({hints})
                </button>
              </div>

              {/* Extra settings links */}
              <div className="flex gap-3">
                <button
                  onClick={startNewGame}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-white/5 hover:border-white/10 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> NEW GAME
                </button>

                <button
                  onClick={() => setIsPlaying(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-white/5 hover:border-white/10 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-white"
                >
                  DIFFICULTY
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Congratualtions Overlay modal */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#020205] rounded-[32px] p-8 border border-white/10 shadow-2xl text-center flex flex-col gap-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-[#6b21ff]/10 border border-[#6b21ff]/30 flex items-center justify-center text-[#6b21ff]">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-3xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>All Matched!</h2>
                <p className="text-slate-400 text-xs uppercase tracking-wider mt-1.5">All pairs found successfully!</p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl font-mono text-left">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">TOTAL TIME</span>
                  <div className="text-base font-black text-white">{getFormatTime(time)}</div>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">FLIP TURNS</span>
                  <div className="text-base font-black text-white">{turns}</div>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">ACCURACY</span>
                  <div className="text-base font-black text-cyan-400">
                    {turns > 0 ? Math.round(((cards.length / 2) / turns) * 100) : 100}%
                  </div>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-black py-4 rounded-xl active:scale-[0.98] transition-transform duration-150 cursor-pointer text-sm uppercase tracking-wider"
              >
                PLAY AGAIN
              </button>

              <button
                onClick={onBack}
                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-black text-slate-400 hover:text-white transition-all cursor-pointer text-xs"
              >
                BACK TO ARCADE MAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
