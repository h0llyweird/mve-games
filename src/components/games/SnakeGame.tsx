import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Trophy, Clock, Zap } from 'lucide-react';

interface SnakeGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'snake', score: number) => void;
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

export default function SnakeGame({ onBack, playAudio, updateXp, recordGamePlayed }: SnakeGameProps) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 5, y: 5 });
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('snake_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [gameTime, setGameTime] = useState<number>(0);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateFood = useCallback(() => {
    let newFood: { x: number; y: number };
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    return newFood;
  }, [snake]);

  const startGame = () => {
    playAudio('click');
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood(generateFood());
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPlaying(true);
    setIsGameOver(false);
    setGameTime(0);
  };

  const resetGame = () => {
    playAudio('click');
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood({ x: 5, y: 5 });
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPlaying(false);
    setIsGameOver(false);
    setGameTime(0);
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

  // Game loop
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      gameLoopRef.current = setInterval(() => {
        setSnake(prev => {
          const head = prev[0];
          const newHead = {
            x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
            y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE
          };

          // Check self-collision
          if (prev.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            setIsGameOver(true);
            setIsPlaying(false);
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem('snake_highscore', String(score));
            }
            recordGamePlayed('snake', score);
            updateXp(Math.floor(score / 10));
            playAudio('error');
            return prev;
          }

          // Check food collision
          if (newHead.x === food.x && newHead.y === food.y) {
            playAudio('success');
            const newScore = score + 10 + Math.floor(gameTime / 10);
            setScore(newScore);
            setFood(generateFood());
            // Increase speed every 50 points
            setSpeed(s => Math.max(50, INITIAL_SPEED - Math.floor(newScore / 50) * 10));
            return [newHead, ...prev];
          }

          return [newHead, ...prev.slice(0, -1)];
        });
      }, speed);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying, isGameOver, direction, food, speed, score, highScore, gameTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return;
      
      const key = e.key;
      if (key === 'ArrowUp' && direction.y !== 1) {
        setDirection({ x: 0, y: -1 });
      } else if (key === 'ArrowDown' && direction.y !== -1) {
        setDirection({ x: 0, y: 1 });
      } else if (key === 'ArrowLeft' && direction.x !== 1) {
        setDirection({ x: -1, y: 0 });
      } else if (key === 'ArrowRight' && direction.x !== -1) {
        setDirection({ x: 1, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPlaying, isGameOver]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Snake Rush</h1>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{highScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-lg font-black text-emerald-400">{score}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-mono text-slate-300">{formatTime(gameTime)}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={isPlaying ? resetGame : startGame}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isPlaying ? 'Reset' : 'Start'}
            </button>
          </div>
        </div>

        {/* Game Board */}
        <div className="relative bg-black/40 rounded-2xl border border-white/10 p-4 mb-4">
          <div 
            className="relative bg-slate-900 rounded-xl overflow-hidden"
            style={{
              width: '100%',
              aspectRatio: '1',
              maxHeight: '60vh'
            }}
          >
            {/* Grid */}
            <div 
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div 
                  key={i} 
                  className="border border-white/5"
                />
              ))}
            </div>

            {/* Food */}
            {food && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute w-[5%] h-[5%] bg-red-500 rounded-full shadow-lg shadow-red-500/50"
                style={{
                  left: `${(food.x / GRID_SIZE) * 100}%`,
                  top: `${(food.y / GRID_SIZE) * 100}%`,
                  transform: 'translate(50%, 50%)'
                }}
              />
            )}

            {/* Snake */}
            {snake.map((seg, idx) => (
              <div
                key={idx}
                className="absolute w-[5%] h-[5%]"
                style={{
                  left: `${(seg.x / GRID_SIZE) * 100}%`,
                  top: `${(seg.y / GRID_SIZE) * 100}%`,
                  transform: 'translate(50%, 50%)'
                }}
              >
                <div 
                  className={`w-full h-full rounded-sm ${idx === 0 ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-emerald-600'}`}
                />
              </div>
            ))}

            {/* Game Over Overlay */}
            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-black text-red-500 mb-2">GAME OVER</h2>
                  <p className="text-white mb-4">Score: <span className="text-emerald-400 font-bold">{score}</span></p>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Play Again
                  </button>
                </div>
              </motion.div>
            )}

            {/* Start Overlay */}
            {!isPlaying && !isGameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-400 mb-4">Use arrow keys to control the snake</p>
                  <button
                    onClick={startGame}
                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center gap-2 mx-auto"
                  >
                    <Play className="w-4 h-4" />
                    Start Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-slate-500 text-sm">
          <p>Use <span className="text-white font-bold">Arrow Keys</span> to move</p>
          <p>Eat food to grow and earn points</p>
        </div>
      </div>
    </div>
  );
}
