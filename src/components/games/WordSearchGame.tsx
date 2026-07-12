import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Lightbulb, CheckCircle2, Award, Zap, HelpCircle, Compass } from 'lucide-react';
import { Difficulty } from '../../types';

interface Cell {
  r: number;
  c: number;
  char: string;
}

interface PlacedWord {
  word: string;
  startR: number;
  startC: number;
  endR: number;
  endC: number;
  dr: number;
  dc: number;
  found: boolean;
  cells: { r: number; c: number }[];
}

interface WordSearchGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'wordsearch', score: number) => void;
}

const CATEGORIES = {
  general: ['COMPUTER', 'KEYBOARD', 'MONITOR', 'SOFTWARE', 'HARDWARE', 'NETWORK', 'DATABASE', 'PROGRAM'],
  technology: ['ARTIFICIAL', 'ALGORITHM', 'PROCESSOR', 'VIRTUAL', 'CLOUD', 'CRYPTOGRAPHY', 'CYBERSECURITY', 'ENCRYPTION'],
  science: ['BIOLOGY', 'CHEMISTRY', 'PHYSICS', 'ASTRONOMY', 'GENETICS', 'QUANTUM', 'GRAVITY', 'ELEMENT'],
  nature: ['MOUNTAIN', 'VALLEY', 'DESERT', 'FOREST', 'GLACIER', 'VOLCANO', 'WATERFALL', 'ECOSYSTEM']
};

export default function WordSearchGame({ onBack, playAudio, updateXp, recordGamePlayed }: WordSearchGameProps) {
  const [category, setCategory] = useState<keyof typeof CATEGORIES>('general');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gridSize, setGridSize] = useState<number>(12);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [foundWordsCount, setFoundWordsCount] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [hints, setHints] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Mouse selection state
  const [selectionStart, setSelectionStart] = useState<{ r: number; c: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ r: number; c: number } | null>(null);
  const [selectedCells, setSelectedCells] = useState<{ r: number; c: number }[]>([]);
  const [isDragSelecting, setIsDragSelecting] = useState<boolean>(false);

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

  // Adjust size on difficulty change
  useEffect(() => {
    setGridSize(difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 14);
  }, [difficulty]);

  const startNewGame = () => {
    playAudio('click');
    setScore(0);
    setTime(0);
    setHints(3);
    setFoundWordsCount(0);
    setIsCompleted(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedCells([]);
    setIsDragSelecting(false);

    const size = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 14;
    const wordList = CATEGORIES[category];
    const placed: PlacedWord[] = [];
    const tempGrid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

    // Vector directions
    const DIRECTIONS = [
      [0, 1],   // right
      [1, 0],   // down
      [1, 1],   // down-right
      [-1, 1],  // up-right
      [0, -1],  // left (medium/hard)
      [-1, 0],  // up (medium/hard)
      [-1, -1]  // up-left (hard)
    ];

    wordList.forEach(word => {
      let inserted = false;
      let attempts = 0;

      while (!inserted && attempts < 150) {
        attempts++;
        const drDcIdx = Math.floor(Math.random() * (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 7));
        const [dr, dc] = DIRECTIONS[drDcIdx];

        const startR = Math.floor(Math.random() * size);
        const startC = Math.floor(Math.random() * size);
        const endR = startR + dr * (word.length - 1);
        const endC = startC + dc * (word.length - 1);

        // Grid bounds boundary check
        if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
          // Verify overlapping intersections match
          let possible = true;
          const wordCells: { r: number; c: number }[] = [];

          for (let i = 0; i < word.length; i++) {
            const currR = startR + dr * i;
            const currC = startC + dc * i;
            const existing = tempGrid[currR][currC];
            if (existing !== '' && existing !== word[i]) {
              possible = false;
              break;
            }
            wordCells.push({ r: currR, c: currC });
          }

          if (possible) {
            for (let i = 0; i < word.length; i++) {
              const currR = startR + dr * i;
              const currC = startC + dc * i;
              tempGrid[currR][currC] = word[i];
            }
            placed.push({
              word,
              startR,
              startC,
              endR,
              endC,
              dr,
              dc,
              found: false,
              cells: wordCells
            });
            inserted = true;
          }
        }
      }
    });

    // Fill blank cells with random filler chars
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (tempGrid[r][c] === '') {
          tempGrid[r][c] = characters.charAt(Math.floor(Math.random() * characters.length));
        }
      }
    }

    setGrid(tempGrid);
    setPlacedWords(placed);
    setIsPlaying(true);
  };

  // Straight line math selection
  const handleCellClickStart = (r: number, c: number) => {
    setSelectedCells([{ r, c }]);
    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
    setIsDragSelecting(true);
    playAudio('click');
  };

  const handleCellHover = (r: number, c: number) => {
    if (!isDragSelecting || !selectionStart) return;

    // Check angle vectors matching vertical, horizontal, diagonal rules
    const dr = r - selectionStart.r;
    const dc = c - selectionStart.c;

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    let isStraight = false;
    let stepR = 0;
    let stepC = 0;

    if (dr === 0) {
      isStraight = true;
      stepC = Math.sign(dc);
    } else if (dc === 0) {
      isStraight = true;
      stepR = Math.sign(dr);
    } else if (absDr === absDc) {
      isStraight = true;
      stepR = Math.sign(dr);
      stepC = Math.sign(dc);
    }

    if (isStraight) {
      setSelectionEnd({ r, c });
      const pathCells: { r: number; c: number }[] = [];
      const steps = Math.max(absDr, absDc);

      for (let i = 0; i <= steps; i++) {
        pathCells.push({
          r: selectionStart.r + stepR * i,
          c: selectionStart.c + stepC * i
        });
      }
      setSelectedCells(pathCells);
    }
  };

  const handleCellSelectEnd = () => {
    if (!isDragSelecting) return;
    setIsDragSelecting(false);

    // Form selection characters string
    const wordStr = selectedCells.map(cell => grid[cell.r][cell.c]).join('');
    const reversedStr = [...wordStr].reverse().join('');

    // Locate matching placed words
    const matchedWord = placedWords.find(w => !w.found && (w.word === wordStr || w.word === reversedStr));

    if (matchedWord) {
      playAudio('success');
      const updated = placedWords.map(w => w.word === matchedWord.word ? { ...w, found: true } : w);
      setPlacedWords(updated);

      const bonus = Math.max(10, 100 - time);
      setScore(s => s + bonus);

      const foundCount = updated.filter(w => w.found).length;
      setFoundWordsCount(foundCount);

      if (foundCount === wordListActiveCount(updated)) {
        setIsCompleted(true);
        playAudio('victory');
        const scoreBonus = score + bonus + 150;
        updateXp(scoreBonus);
        recordGamePlayed('wordsearch', scoreBonus);
      }
    } else {
      playAudio('error');
    }

    setSelectedCells([]);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const wordListActiveCount = (words: PlacedWord[]): number => {
    return words.length;
  };

  const handleHint = () => {
    if (hints <= 0 || !isPlaying || isCompleted) return;
    const unfound = placedWords.filter(w => !w.found);
    if (unfound.length === 0) return;

    playAudio('success');
    setHints(h => h - 1);

    // Highlight starting cell of target word
    const target = unfound[0];
    setSelectionStart({ r: target.startR, c: target.startC });
    setSelectionEnd({ r: target.startR, c: target.startC });
    setSelectedCells([{ r: target.startR, c: target.startC }]);

    // auto release hint display after delay
    setTimeout(() => {
      setSelectedCells([]);
      setSelectionStart(null);
      setSelectionEnd(null);
    }, 1500);
  };

  const isCellPartOfFoundWord = (r: number, c: number): boolean => {
    return placedWords.some(w => w.found && w.cells.some(cell => cell.r === r && cell.c === c));
  };

  const isCellSelected = (r: number, c: number): boolean => {
    return selectedCells.some(cell => cell.r === r && cell.c === c);
  };

  const getFormatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
              <span>Word Search</span>
            </h1>
            <p className="text-xs text-slate-400">Find all hidden words in the letter grid</p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4 text-xs md:text-sm bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 font-mono">
            <div className="text-slate-400">
              TIME: <span className="text-white font-bold">{getFormatTime(time)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-400">
              FOUND: <span className="text-pink-400 font-bold">{foundWordsCount}/{placedWords.length}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-300">
              SCORE: <span className="text-amber-400 font-bold">{score}</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          /* Selection Configuration Panel */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-10"
          >
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl text-center flex flex-col gap-6">
              <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#00f5ff] flex items-center justify-center text-black shadow-lg shadow-[#00f5ff]/20">
                <Compass className="w-8 h-8 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Game Settings</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">Choose word category and difficulty</p>
              </div>

              {/* Categorization */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-left text-slate-400 pl-1 uppercase">GRID THEME CATEGORY</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).map((catName) => (
                    <button
                      key={catName}
                      onClick={() => setCategory(catName)}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase transition-all duration-200 border cursor-pointer ${
                        category === catName
                          ? 'bg-[#00f5ff] border-[#00f5ff] text-black font-black shadow-lg scale-[1.02]'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                      }`}
                    >
                      {catName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid sizes complexity */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-left text-slate-400 pl-1 uppercase">DIFFICULTY PRESET</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase transition-all duration-200 border cursor-pointer ${
                        difficulty === diff
                          ? 'bg-[#00f5ff] border-[#00f5ff] text-black font-black shadow-lg scale-[1.02]'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 py-4 rounded-xl font-black text-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,78,0,0.25)] active:scale-[0.98] transition-transform duration-100 cursor-pointer text-sm uppercase tracking-wider"
              >
                START GAME
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Gameplay Workspace */
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Grid Workspace */}
            <div className="lg:col-span-8 flex flex-col items-center">
              <div 
                className="p-3 bg-slate-950/80 rounded-3xl border-2 border-slate-700/60 shadow-2xl relative select-none cursor-crosshair touch-none"
                onMouseLeave={handleCellSelectEnd}
                onMouseUp={handleCellSelectEnd}
                onTouchEnd={handleCellSelectEnd}
              >
                <div 
                  className="grid gap-[2px] md:gap-[3px] p-2 bg-slate-950 rounded-2xl border border-white/5 overflow-hidden"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
                  }}
                >
                  {grid.map((row, rIdx) => (
                    <React.Fragment key={rIdx}>
                      {row.map((char, cIdx) => {
                        const isSelected = isCellSelected(rIdx, cIdx);
                        const isFound = isCellPartOfFoundWord(rIdx, cIdx);

                        let cellClass = 'h-8 w-8 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black font-mono transition-all duration-100 uppercase ';

                        if (isSelected) {
                          cellClass += 'bg-pink-600 text-white ring-2 ring-pink-400 z-10 scale-[1.05] shadow-lg shadow-pink-600/40 ';
                        } else if (isFound) {
                          cellClass += 'bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 ';
                        } else {
                          cellClass += 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 ';
                        }

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            onMouseDown={() => handleCellClickStart(rIdx, cIdx)}
                            onMouseEnter={() => handleCellHover(rIdx, cIdx)}
                            onTouchStart={(e) => {
                              // Touch starts mapping
                              const touch = e.touches[0];
                              const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                              if (elem) {
                                handleCellClickStart(rIdx, cIdx);
                              }
                            }}
                            onTouchMove={(e) => {
                              // Touch drags mapping
                              const touch = e.touches[0];
                              const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                              if (elem) {
                                const rect = elem.getBoundingClientRect();
                                const r = parseInt((elem as any).dataset?.row);
                                const c = parseInt((elem as any).dataset?.col);
                                if (!isNaN(r) && !isNaN(c)) {
                                  handleCellHover(r, c);
                                }
                              }
                            }}
                            data-row={rIdx}
                            data-col={cIdx}
                            className={cellClass}
                          >
                            {char}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Checklist items panel */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">WORD LIST</span>
                  <button
                    onClick={handleHint}
                    disabled={hints <= 0}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-lg text-[10px] font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Lightbulb className="w-3.5 h-3.5" /> HINT ({hints})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                  {placedWords.map((w) => (
                    <div
                      key={w.word}
                      className={`p-2 rounded-xl text-left font-mono font-bold text-[10px] sm:text-xs transition-colors overflow-hidden truncate ${
                        w.found
                          ? 'bg-emerald-600/10 text-emerald-400 line-through border border-emerald-500/20 opacity-60'
                          : 'bg-slate-800/60 text-slate-200 border border-white/5'
                      }`}
                    >
                      {w.word}
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra game panel actions */}
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

      {/* Completion Dialog Overlay */}
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
              <div className="mx-auto w-20 h-20 rounded-full bg-[#00f5ff]/10 border border-[#00f5ff]/30 flex items-center justify-center text-[#00f5ff]">
                <Award className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-3xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>All Words Found</h2>
                <p className="text-slate-400 text-xs uppercase tracking-wider mt-1.5">All hidden words located successfully!</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl text-left">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">SOLVE TIME</span>
                  <div className="text-base font-black text-white font-mono">{getFormatTime(time)}</div>
                </div>
                <div className="border-l border-white/10 pl-4">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">TOTAL SCORE</span>
                  <div className="text-base font-black text-amber-400 font-mono">{score} pts</div>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black py-4 rounded-xl font-black active:scale-[0.98] transition-transform duration-150 cursor-pointer text-sm uppercase tracking-wider"
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
