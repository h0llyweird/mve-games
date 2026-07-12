import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Trophy, Clock, Zap } from 'lucide-react';

interface TetrisGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'tetris', score: number) => void;
}

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffff00' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#bf00ff' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff00' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff8800' }
};

type TetrominoKey = keyof typeof TETROMINOES;

export default function TetrisGame({ onBack, playAudio, updateXp, recordGamePlayed }: TetrisGameProps) {
  const [board, setBoard] = useState<string[][]>(() => 
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  );
  const [currentPiece, setCurrentPiece] = useState<{ shape: number[][]; color: string; x: number; y: number } | null>(null);
  const [nextPiece, setNextPiece] = useState<{ shape: number[][]; color: string } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('tetris_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameTime, setGameTime] = useState<number>(0);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getRandomPiece = useCallback((): { shape: number[][]; color: string } => {
    const keys = Object.keys(TETROMINOES) as TetrominoKey[];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const piece = TETROMINOES[randomKey];
    return { 
      shape: piece.shape.map(row => [...row]), 
      color: piece.color 
    };
  }, []);

  const isValidPosition = useCallback((piece: { shape: number[][]; x: number; y: number }, boardState: string[][]) => {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const newX = piece.x + col;
          const newY = piece.y + row;
          
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return false;
          }
          
          if (newY >= 0 && boardState[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const spawnPiece = useCallback(() => {
    const piece = nextPiece || getRandomPiece();
    const newNextPiece = getRandomPiece();
    setNextPiece(newNextPiece);

    const newPiece = {
      shape: piece.shape,
      color: piece.color,
      x: Math.floor((COLS - piece.shape[0].length) / 2),
      y: piece.shape.length === 1 ? 0 : -1
    };

    if (!isValidPosition(newPiece, board)) {
      setIsGameOver(true);
      setIsPlaying(false);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('tetris_highscore', String(score));
      }
      recordGamePlayed('tetris', score);
      updateXp(Math.floor(score / 10));
      playAudio('error');
      return false;
    }

    setCurrentPiece(newPiece);
    return true;
  }, [nextPiece, board, isValidPosition, getRandomPiece, score, highScore, recordGamePlayed, updateXp, playAudio]);

  const clearLines = useCallback((boardState: string[][]) => {
    let clearedLines = 0;
    const newBoard = boardState.filter(row => {
      const isFull = row.every(cell => cell !== '');
      if (isFull) clearedLines++;
      return !isFull;
    });

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(''));
    }

    if (clearedLines > 0) {
      playAudio('success');
      const points = [0, 100, 300, 500, 800][clearedLines] * level;
      setScore(s => s + points);
      setLines(l => l + clearedLines);
      
      // Level up every 10 lines
      const newLevel = Math.floor((lines + clearedLines) / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        playAudio('levelUp');
      }
    }

    return newBoard;
  }, [playAudio, level, lines]);

  const lockPiece = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const boardY = currentPiece.y + row;
          const boardX = currentPiece.x + col;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = currentPiece.color;
          }
        }
      }
    }

    const clearedBoard = clearLines(newBoard);
    setBoard(clearedBoard);
    
    if (!spawnPiece()) {
      // Game over handled in spawnPiece
    }
  }, [currentPiece, board, clearLines, spawnPiece]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece) return;

    const rotated = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
      )
    };

    if (isValidPosition(rotated, board)) {
      setCurrentPiece(rotated);
      playAudio('flip');
    } else {
      // Try wall kick
      const kicks = [-1, 1, -2, 2];
      for (const kick of kicks) {
        const kicked = { ...rotated, x: rotated.x + kick };
        if (isValidPosition(kicked, board)) {
          setCurrentPiece(kicked);
          playAudio('flip');
          return;
        }
      }
    }
  }, [currentPiece, board, isValidPosition, playAudio]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || !isPlaying || isGameOver) return;

    const moved = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };
    
    if (isValidPosition(moved, board)) {
      setCurrentPiece(moved);
      if (dx !== 0) playAudio('move');
      return true;
    }
    
    if (dy > 0) {
      lockPiece();
      return false;
    }
    
    return false;
  }, [currentPiece, board, isPlaying, isGameOver, isValidPosition, lockPiece, playAudio]);

  const startGame = () => {
    playAudio('click');
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameTime(0);
    setIsGameOver(false);
    
    const firstPiece = getRandomPiece();
    setNextPiece(getRandomPiece());
    
    const newPiece = {
      shape: firstPiece.shape,
      color: firstPiece.color,
      x: Math.floor((COLS - firstPiece.shape[0].length) / 2),
      y: firstPiece.shape.length === 1 ? 0 : -1
    };
    
    setCurrentPiece(newPiece);
    setIsPlaying(true);
  };

  const resetGame = () => {
    playAudio('click');
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameTime(0);
    setIsPlaying(false);
    setIsGameOver(false);
    setCurrentPiece(null);
    setNextPiece(null);
  };

  // Game timer
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      timerRef.current = setInterval(() => {
        setGameTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isGameOver]);

  // Game loop - falling pieces
  useEffect(() => {
    if (!isPlaying || isGameOver || !currentPiece) return;

    const dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
    
    gameLoopRef.current = setInterval(() => {
      movePiece(0, 1);
    }, dropSpeed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, isGameOver, currentPiece, level, movePiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
        case 's':
          movePiece(0, 1);
          break;
        case 'ArrowUp':
        case 'w':
          rotatePiece();
          break;
        case ' ':
          // Hard drop
          while (movePiece(0, 1)) {}
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver, movePiece, rotatePiece]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Tetris Blocks</h1>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{highScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-lg font-black text-purple-400">{score}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 font-bold">LINES</span>
              <span className="text-sm font-black text-white">{lines}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400 font-bold">LEVEL</span>
              <span className="text-sm font-black text-white">{level}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-mono text-slate-300">{formatTime(gameTime)}</span>
            </div>
          </div>
          
          <button
            onClick={isPlaying ? resetGame : startGame}
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-black font-bold flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isPlaying ? 'Reset' : 'Start'}
          </button>
        </div>

        <div className="flex gap-4 items-start">
          {/* Game Board */}
          <div 
            className="relative bg-slate-900 rounded-2xl border border-white/10 p-2"
            style={{ 
              width: COLS * BLOCK_SIZE + 8, 
              height: ROWS * BLOCK_SIZE + 8 
            }}
          >
            {/* Grid */}
            <div 
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="border border-white/5"
                    style={{
                      width: BLOCK_SIZE,
                      height: BLOCK_SIZE,
                      backgroundColor: cell || 'transparent'
                    }}
                  />
                ))
              )}
            </div>

            {/* Current piece */}
            {currentPiece && currentPiece.y >= 0 && currentPiece.shape.map((row, dy) =>
              row.map((cell, dx) => 
                cell ? (
                  <div
                    key={`piece-${dy}-${dx}`}
                    className="absolute rounded-sm"
                    style={{
                      left: (currentPiece.x + dx) * BLOCK_SIZE + 4,
                      top: (currentPiece.y + dy) * BLOCK_SIZE + 4,
                      width: BLOCK_SIZE,
                      height: BLOCK_SIZE,
                      backgroundColor: currentPiece.color,
                      boxShadow: `0 0 10px ${currentPiece.color}80`
                    }}
                  />
                ) : null
              )
            )}

            {/* Game Over Overlay */}
            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-black text-red-500 mb-2">GAME OVER</h2>
                  <p className="text-white mb-2">Score: <span className="text-purple-400 font-bold">{score}</span></p>
                  <p className="text-slate-400 text-sm mb-4">Lines: {lines} | Level: {level}</p>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-black font-bold flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Play Again
                  </button>
                </div>
              </motion.div>
            )}

            {/* Start Overlay */}
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                <div className="text-center">
                  <p className="text-slate-400 mb-4">Use arrow keys to play</p>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-black font-bold flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-4 h-4" />
                    Start Game
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="flex flex-col gap-4">
            {/* Next piece */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Next</h3>
              <div 
                className="grid gap-1"
                style={{
                  gridTemplateColumns: 'repeat(4, 20px)',
                  gridTemplateRows: 'repeat(4, 20px)'
                }}
              >
                {Array.from({ length: 16 }).map((_, i) => {
                  const row = Math.floor(i / 4);
                  const col = i % 4;
                  const nextPieceShape = nextPiece?.shape || [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
                  const hasCell = nextPieceShape[row] && nextPieceShape[row][col];
                  return (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-sm"
                      style={{
                        backgroundColor: hasCell ? nextPiece?.color : 'transparent'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Controls</h3>
              <div className="flex flex-col gap-2 text-xs text-slate-500">
                <p><span className="text-white">←→</span> Move</p>
                <p><span className="text-white">↑</span> Rotate</p>
                <p><span className="text-white">↓</span> Soft Drop</p>
                <p><span className="text-white">Space</span> Hard Drop</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
