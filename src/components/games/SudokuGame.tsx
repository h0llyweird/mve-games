import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Lightbulb, CheckCircle2, Eraser, Edit, Trophy, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Difficulty } from '../../types';

interface SudokuGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'sudoku', score: number) => void;
}

export default function SudokuGame({ onBack, playAudio, updateXp, recordGamePlayed }: SudokuGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [initialBoard, setInitialBoard] = useState<number[][]>(() => Array(9).fill(null).map(() => Array(9).fill(0)));
  const [board, setBoard] = useState<number[][]>(() => Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState<number[][]>(() => Array(9).fill(null).map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [notes, setNotes] = useState<boolean[][]>(() => Array(81).fill(null).map(() => Array(10).fill(false))); // index = r*9 + c, note number = 1-9
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hints, setHints] = useState<number>(3);
  const [time, setTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  
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

  // Sudoku Generator
  const generateNewPuzzle = (diff: Difficulty) => {
    playAudio('click');
    setIsCompleted(false);
    setMistakes(0);
    setHints(3);
    setTime(0);
    setSelectedCell(null);
    setNotes(Array(81).fill(null).map(() => Array(10).fill(false)));

    // 1. Solve a blank board to get a full complete valid solution
    const solved = Array(9).fill(null).map(() => Array(9).fill(0));
    solveToGenerate(solved);
    const solvedCopy = solved.map(row => [...row]);
    setSolution(solvedCopy);

    // 2. Remove cells based on difficulty
    const puzzle = solved.map(row => [...row]);
    let cellsToRemove = diff === 'easy' ? 32 : diff === 'medium' ? 45 : 56;
    
    while (cellsToRemove > 0) {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      if (puzzle[r][c] !== 0) {
        puzzle[r][c] = 0;
        cellsToRemove--;
      }
    }

    setInitialBoard(puzzle.map(row => [...row]));
    setBoard(puzzle.map(row => [...row]));
    setIsPlaying(true);
  };

  const solveToGenerate = (grid: number[][]): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValidPlacement(grid, r, c, num)) {
              grid[r][c] = num;
              if (solveToGenerate(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const shuffleArray = (arr: number[]): number[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const isValidPlacement = (grid: number[][], r: number, c: number, num: number): boolean => {
    for (let x = 0; x < 9; x++) {
      if (grid[r][x] === num && x !== c) return false;
      if (grid[x][c] === num && x !== r) return false;
    }
    const boxRow = Math.floor(r / 3) * 3;
    const boxCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const rowIdx = boxRow + i;
        const colIdx = boxCol + j;
        if (grid[rowIdx][colIdx] === num && (rowIdx !== r || colIdx !== c)) return false;
      }
    }
    return true;
  };

  const handleCellSelect = (r: number, c: number) => {
    if (!isPlaying || isCompleted) return;
    playAudio('click');
    setSelectedCell({ r, c });
  };

  // Keyboard and Keypad actions
  const handleNumberInput = (num: number) => {
    if (!selectedCell || !isPlaying || isCompleted) return;
    const { r, c } = selectedCell;

    // Fixed cell cannot be replaced
    if (initialBoard[r][c] !== 0) return;

    if (notesMode) {
      playAudio('flip');
      const index = r * 9 + c;
      const updatedNotes = [...notes];
      updatedNotes[index] = [...updatedNotes[index]];
      updatedNotes[index][num] = !updatedNotes[index][num];
      setNotes(updatedNotes);
    } else {
      // Inputting concrete number
      const updatedBoard = board.map(row => [...row]);
      
      if (solution[r][c] === num) {
        // Correct answer!
        updatedBoard[r][c] = num;
        setBoard(updatedBoard);
        playAudio('success');

        // Clear notes for this cell and related row/col/box
        const updatedNotes = [...notes];
        const cellIdx = r * 9 + c;
        updatedNotes[cellIdx] = Array(10).fill(false);
        setNotes(updatedNotes);

        // Check victory
        if (isBoardFull(updatedBoard)) {
          triggerVictory();
        }
      } else {
        // Incorrect input
        playAudio('error');
        setMistakes(m => {
          const next = m + 1;
          if (next >= 5) {
            // Game Over warning or simple limit
          }
          return next;
        });
      }
    }
  };

  const isBoardFull = (grid: number[][]): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return false;
      }
    }
    return true;
  };

  const triggerVictory = () => {
    setIsCompleted(true);
    playAudio('victory');
    const scoreBonus = Math.max(10, 500 - mistakes * 40 - Math.floor(time / 2));
    updateXp(scoreBonus);
    recordGamePlayed('sudoku', scoreBonus);
  };

  const handleErase = () => {
    if (!selectedCell || !isPlaying || isCompleted) return;
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return; // Cannot delete initial

    playAudio('click');
    const updatedBoard = board.map(row => [...row]);
    updatedBoard[r][c] = 0;
    setBoard(updatedBoard);

    const cellIdx = r * 9 + c;
    const updatedNotes = [...notes];
    updatedNotes[cellIdx] = Array(10).fill(false);
    setNotes(updatedNotes);
  };

  const triggerHint = () => {
    if (!selectedCell || !isPlaying || isCompleted || hints <= 0) return;
    const { r, c } = selectedCell;
    if (board[r][c] === solution[r][c]) return;

    playAudio('success');
    setHints(h => h - 1);
    const updatedBoard = board.map(row => [...row]);
    updatedBoard[r][c] = solution[r][c];
    setBoard(updatedBoard);

    // check victory
    if (isBoardFull(updatedBoard)) {
      triggerVictory();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || !isPlaying || isCompleted) return;
      const { r, c } = selectedCell;

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode(n => !n);
      } else if (e.key === 'ArrowUp') {
        setSelectedCell({ r: Math.max(0, r - 1), c });
      } else if (e.key === 'ArrowDown') {
        setSelectedCell({ r: Math.min(8, r + 1), c });
      } else if (e.key === 'ArrowLeft') {
        setSelectedCell({ r, c: Math.max(0, c - 1) });
      } else if (e.key === 'ArrowRight') {
        setSelectedCell({ r, c: Math.min(8, c + 1) });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isPlaying, isCompleted, notesMode, board]);

  const getCellClasses = (r: number, c: number) => {
    let classes = 'relative flex items-center justify-center font-sans font-bold transition-all duration-150 text-base md:text-xl border border-white/5 cursor-pointer h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 select-none ';

    const cellVal = board[r][c];
    const isFixed = initialBoard[r][c] !== 0;

    // Thin borders, grouping borders (3x3 blocks outlined heavily)
    if (c === 2 || c === 5) classes += 'border-r-2 md:border-r-[3px] border-r-[#00f5ff]/40 ';
    if (r === 2 || r === 5) classes += 'border-b-2 md:border-b-[3px] border-b-[#00f5ff]/40 ';

    const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
    const sameNumberHighlight = selectedCell && board[selectedCell.r][selectedCell.c] !== 0 && board[selectedCell.r][selectedCell.c] === cellVal;
    const sameClusterHighlight = selectedCell && (selectedCell.r === r || selectedCell.c === c || (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));

    if (isSelected) {
      classes += 'bg-[#00f5ff]/30 text-white ring-2 ring-[#00f5ff] z-10 ';
    } else if (sameNumberHighlight) {
      classes += 'bg-[#6b21ff]/30 text-indigo-100 ';
    } else if (sameClusterHighlight) {
      classes += 'bg-white/[0.04] text-slate-300 ';
    } else {
      classes += 'bg-[#020205] hover:bg-white/[0.06] ';
    }

    if (isFixed) {
      if (!isSelected && !sameNumberHighlight) {
        classes += 'text-amber-400 font-extrabold ';
      }
    } else {
      if (cellVal !== 0 && !isSelected && !sameNumberHighlight) {
        classes += 'text-[#00f5ff] ';
      }
    }

    return classes;
  };

  const getFormatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-2 md:p-6 text-white min-h-[90vh]">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5 bg-black/40 p-5 rounded-[24px] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center justify-center py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-slate-300 hover:text-white border border-white/5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>PORTALS</span>
          </button>
          
          <div>
            <h1 className="text-xl md:text-2xl font-serif italic text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              Sudoku
            </h1>
            <p className="text-[10px] text-slate-400/80 uppercase tracking-widest">Classic number placement puzzle</p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4 text-xs bg-[#020205] px-4 py-2.5 rounded-xl border border-white/5 font-mono select-none">
            <div className="text-slate-400">
              TIME: <span className="text-white font-bold">{getFormatTime(time)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-400">
              MISTAKES: <span className={`font-bold ${mistakes > 3 ? 'text-red-400' : 'text-[#00f5ff]'}`}>{mistakes}/5</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          /* Game Configuration Entry Portal */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-10"
          >
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl text-center flex flex-col gap-6">
              <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#00f5ff] flex items-center justify-center text-black shadow-lg shadow-[#00f5ff]/20">
                <Trophy className="w-7 h-7 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic" style={{ fontFamily: 'var(--font-serif)' }}>New Puzzle</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">Select difficulty to generate a new puzzle</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-left text-slate-400 pl-1 font-bold uppercase">DIFFICULTY PRESET</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                        difficulty === diff
                          ? 'bg-[#00f5ff] border-[#00f5ff] text-black shadow-lg shadow-[#00f5ff]/25 scale-[1.03]'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => generateNewPuzzle(difficulty)}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,78,0,0.25)] active:scale-[0.98] transition-transform duration-100 cursor-pointer text-sm uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-black text-black" /> START GAME
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Gameplay Engine Active */
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Sudoku Interactive Grid Board */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center">
              <div className="p-4 bg-white/[0.02] rounded-[32px] border border-white/10 shadow-2xl relative backdrop-blur-xl">
                {/* 3x3 Outer Borders mapping rows container */}
                <div className="grid grid-cols-9 gap-0 border-2 border-[#00f5ff]/40 rounded-xl overflow-hidden bg-[#020205] select-none shadow-[0_0_20px_rgba(255,78,0,0.05)]">
                  {Array(9).fill(null).map((_, r) => (
                    <React.Fragment key={r}>
                      {Array(9).fill(null).map((_, c) => {
                        const cellVal = board[r][c];
                        const cellNotes = notes[r * 9 + c];
                        return (
                          <div
                            key={`${r}-${c}`}
                            onClick={() => handleCellSelect(r, c)}
                            className={getCellClasses(r, c)}
                          >
                            {cellVal !== 0 ? (
                              cellVal
                            ) : (
                              /* Active pencil notes mini-grid layout nested inside cell */
                              <div className="absolute inset-[2px] grid grid-cols-3 gap-0 text-[8px] sm:text-[9px] text-[#6b21ff]/80 font-mono leading-none">
                                {Array(9).fill(null).map((_, idx) => {
                                  const num = idx + 1;
                                  return (
                                    <div key={num} className="flex items-center justify-center">
                                      {cellNotes[num] ? num : ''}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Console Pad & Inputs */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Controls Utility Bar */}
              <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between gap-3">
                <button
                  onClick={() => setNotesMode(n => !n)}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border font-bold transition-all duration-150 cursor-pointer text-xs ${
                    notesMode 
                      ? 'bg-[#6b21ff]/40 border-[#6b21ff]/50 text-white shadow-inner' 
                      : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  <span>NOTES ({notesMode ? 'ON' : 'OFF'})</span>
                </button>

                <button
                  onClick={triggerHint}
                  disabled={hints <= 0}
                  className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent hover:border-[#00f5ff]/30 font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>HINT ({hints})</span>
                </button>

                <button
                  onClick={handleErase}
                  className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 font-bold transition-all duration-150 cursor-pointer text-xs"
                >
                  <Eraser className="w-4 h-4" />
                  <span>ERASE</span>
                </button>
              </div>

              {/* Number Pad Grid */}
              <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Keypad Panel</div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberInput(num)}
                      className="py-4 bg-[#020205] hover:bg-[#6b21ff]/80 hover:text-white text-[#00f5ff] font-black text-xl rounded-xl border border-white/5 hover:border-[#6b21ff]/40 transition-all active:scale-[0.95] cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Game Admin Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => generateNewPuzzle(difficulty)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" /> NEW GAME
                </button>

                <button
                  onClick={() => setIsPlaying(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  DIFFICULTY
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Overlay Portal Modal */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020205]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#020205] rounded-[32px] p-8 border border-white/10 shadow-2xl text-center flex flex-col gap-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-[#00f5ff]/10 border border-[#00f5ff]/30 flex items-center justify-center text-[#00f5ff]">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h2 className="text-3xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Sudoku Solved</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Puzzle completed successfully!</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl font-mono">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">TIME</span>
                  <div className="text-base font-black text-white mt-0.5">{getFormatTime(time)}</div>
                </div>
                <div className="text-left border-l border-white/10 pl-4">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">MISTAKES</span>
                  <div className="text-base font-black text-white mt-0.5">{mistakes}/5</div>
                </div>
              </div>

              <button
                onClick={() => generateNewPuzzle(difficulty)}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black py-4 rounded-xl font-bold active:scale-[0.98] transition-transform duration-150 cursor-pointer text-sm uppercase tracking-wider"
              >
                PLAY AGAIN
              </button>

              <button
                onClick={onBack}
                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-black text-slate-400 hover:text-white transition-all cursor-pointer text-xs uppercase tracking-widest"
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
