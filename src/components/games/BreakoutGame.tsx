import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Trophy, Heart, Zap } from 'lucide-react';

interface BreakoutGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'breakout', score: number) => void;
}

const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 5;

export default function BreakoutGame({ onBack, playAudio, updateXp, recordGamePlayed }: BreakoutGameProps) {
  const [paddleX, setPaddleX] = useState<number>(150);
  const [ball, setBall] = useState<{ x: number; y: number; dx: number; dy: number }>({
    x: 200,
    y: 300,
    dx: 4,
    dy: -4
  });
  const [bricks, setBricks] = useState<{ x: number; y: number; active: boolean; color: string }[]>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('breakout_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [lives, setLives] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [level, setLevel] = useState<number>(1);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = 400;
  const containerHeight = 500;

  const BRICK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  const initBricks = (lvl: number) => {
    const newBricks = [];
    const effectiveRows = Math.min(BRICK_ROWS + lvl - 1, 8);
    const brickWidth = (containerWidth - (BRICK_COLS + 1) * BRICK_GAP) / BRICK_COLS;
    
    for (let row = 0; row < effectiveRows; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: BRICK_GAP + col * (brickWidth + BRICK_GAP),
          y: 50 + row * (BRICK_HEIGHT + BRICK_GAP),
          active: true,
          color: BRICK_COLORS[row % BRICK_COLORS.length]
        });
      }
    }
    return newBricks;
  };

  const startGame = () => {
    playAudio('click');
    setPaddleX((containerWidth - PADDLE_WIDTH) / 2);
    setBall({
      x: containerWidth / 2,
      y: containerHeight - 50,
      dx: 4 + level * 0.5,
      dy: -(4 + level * 0.5)
    });
    setBricks(initBricks(level));
    setScore(0);
    setLives(3);
    setIsPlaying(true);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const resetGame = () => {
    playAudio('click');
    setPaddleX((containerWidth - PADDLE_WIDTH) / 2);
    setBall({
      x: containerWidth / 2,
      y: containerHeight - 50,
      dx: 4,
      dy: -4
    });
    setBricks(initBricks(level));
    setScore(0);
    setLives(3);
    setIsPlaying(false);
    setIsGameOver(false);
    setIsVictory(false);
  };

  const nextLevel = () => {
    playAudio('success');
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setBall({
      x: containerWidth / 2,
      y: containerHeight - 50,
      dx: 4 + nextLvl * 0.5,
      dy: -(4 + nextLvl * 0.5)
    });
    setBricks(initBricks(nextLvl));
    setIsPlaying(true);
    setIsVictory(false);
  };

  useEffect(() => {
    if (!isPlaying || isGameOver || isVictory) return;

    const gameLoop = setInterval(() => {
      setBall(prevBall => {
        let { x, y, dx, dy } = prevBall;
        
        // Move ball
        x += dx;
        y += dy;

        // Wall collisions
        if (x - BALL_RADIUS <= 0 || x + BALL_RADIUS >= containerWidth) {
          dx = -dx;
          x = Math.max(BALL_RADIUS, Math.min(x, containerWidth - BALL_RADIUS));
        }
        if (y - BALL_RADIUS <= 0) {
          dy = -dy;
          y = BALL_RADIUS;
        }

        // Paddle collision
        if (
          y + BALL_RADIUS >= containerHeight - PADDLE_HEIGHT - 10 &&
          y - BALL_RADIUS <= containerHeight - 10 &&
          x >= paddleX &&
          x <= paddleX + PADDLE_WIDTH
        ) {
          dy = -Math.abs(dy);
          // Add spin based on where ball hit paddle
          const hitPos = (x - paddleX) / PADDLE_WIDTH;
          dx = (hitPos - 0.5) * 8;
          playAudio('flip');
        }

        // Bottom collision - lose life
        if (y + BALL_RADIUS >= containerHeight) {
          playAudio('error');
          const newLives = lives - 1;
          setLives(newLives);
          
          if (newLives <= 0) {
            setIsGameOver(true);
            setIsPlaying(false);
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem('breakout_highscore', String(score));
            }
            recordGamePlayed('breakout', score);
            updateXp(Math.floor(score / 10));
          } else {
            // Reset ball position
            return {
              x: containerWidth / 2,
              y: containerHeight - 50,
              dx: 4 + level * 0.5,
              dy: -(4 + level * 0.5)
            };
          }
        }

        // Brick collision
        const brickWidth = (containerWidth - (BRICK_COLS + 1) * BRICK_GAP) / BRICK_COLS;
        
        setBricks(prevBricks => {
          let bricksHit = false;
          const updatedBricks = prevBricks.map(brick => {
            if (!brick.active) return brick;
            
            const brickLeft = brick.x;
            const brickRight = brick.x + brickWidth;
            const brickTop = brick.y;
            const brickBottom = brick.y + BRICK_HEIGHT;
            
            if (
              x + BALL_RADIUS > brickLeft &&
              x - BALL_RADIUS < brickRight &&
              y + BALL_RADIUS > brickTop &&
              y - BALL_RADIUS < brickBottom
            ) {
              bricksHit = true;
              playAudio('success');
              setScore(s => s + 10);
              
              // Determine collision side
              const overlapLeft = x + BALL_RADIUS - brickLeft;
              const overlapRight = brickRight - (x - BALL_RADIUS);
              const overlapTop = y + BALL_RADIUS - brickTop;
              const overlapBottom = brickBottom - (y - BALL_RADIUS);
              
              const minOverlapX = Math.min(overlapLeft, overlapRight);
              const minOverlapY = Math.min(overlapTop, overlapBottom);
              
              if (minOverlapX < minOverlapY) {
                dx = -dx;
              } else {
                dy = -dy;
              }
              
              return { ...brick, active: false };
            }
            return brick;
          });
          
          // Check victory
          if (updatedBricks.every(b => !b.active)) {
            setIsVictory(true);
            setIsPlaying(false);
            if (score > highScore) {
              setHighScore(score + 100 * level);
              localStorage.setItem('breakout_highscore', String(score + 100 * level));
            }
            recordGamePlayed('breakout', score + 100 * level);
            updateXp(Math.floor((score + 100 * level) / 10));
            playAudio('victory');
          }
          
          return updatedBricks;
        });

        return { x, y, dx, dy };
      });
    }, 16);

    gameLoopRef.current = gameLoop;
    return () => clearInterval(gameLoop);
  }, [isPlaying, isGameOver, isVictory, paddleX, lives, score, highScore, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver || isVictory) return;
      
      const step = 20;
      if (e.key === 'ArrowLeft') {
        setPaddleX(x => Math.max(0, x - step));
      } else if (e.key === 'ArrowRight') {
        setPaddleX(x => Math.min(containerWidth - PADDLE_WIDTH, x + step));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver, isVictory]);

  const brickWidth = (containerWidth - (BRICK_COLS + 1) * BRICK_GAP) / BRICK_COLS;

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
          
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Breakout</h1>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{highScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-lg font-black text-blue-400">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-600'}`} 
                />
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm font-bold text-slate-400">Level {level}</span>
            </div>
          </div>
          
          <button
            onClick={isPlaying ? resetGame : startGame}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-black font-bold flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isPlaying ? 'Reset' : 'Start'}
          </button>
        </div>

        {/* Game Board */}
        <div 
          ref={containerRef}
          className="relative bg-slate-900 rounded-2xl border border-white/10 overflow-hidden mb-4"
          style={{ width: '100%', maxWidth: `${containerWidth}px`, height: `${containerHeight}px`, margin: '0 auto' }}
        >
          {/* Bricks */}
          {bricks.map((brick, idx) => (
            brick.active && (
              <div
                key={idx}
                className="absolute rounded-sm"
                style={{
                  left: brick.x,
                  top: brick.y,
                  width: brickWidth,
                  height: BRICK_HEIGHT,
                  backgroundColor: brick.color,
                  boxShadow: `0 0 10px ${brick.color}50`
                }}
              />
            )
          ))}

          {/* Paddle */}
          <div
            className="absolute bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            style={{
              left: paddleX,
              top: containerHeight - PADDLE_HEIGHT - 10,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
            }}
          />

          {/* Ball */}
          <div
            className="absolute bg-white rounded-full shadow-lg"
            style={{
              left: ball.x - BALL_RADIUS,
              top: ball.y - BALL_RADIUS,
              width: BALL_RADIUS * 2,
              height: BALL_RADIUS * 2,
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
            }}
          />

          {/* Game Over Overlay */}
          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-red-500 mb-2">GAME OVER</h2>
                <p className="text-white mb-4">Score: <span className="text-blue-400 font-bold">{score}</span></p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-black font-bold flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Play Again
                </button>
              </div>
            </motion.div>
          )}

          {/* Victory Overlay */}
          {isVictory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-emerald-400 mb-2">VICTORY!</h2>
                <p className="text-white mb-2">Score: <span className="text-blue-400 font-bold">{score + 100 * level}</span></p>
                <p className="text-slate-400 mb-4">Level {level} Complete!</p>
                <button
                  onClick={nextLevel}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center gap-2 mx-auto"
                >
                  Next Level
                </button>
              </div>
            </motion.div>
          )}

          {/* Start Overlay */}
          {!isPlaying && !isGameOver && !isVictory && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400 mb-4">Use arrow keys to move paddle</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-black font-bold flex items-center gap-2 mx-auto"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-slate-500 text-sm">
          <p>Use <span className="text-white font-bold">Arrow Keys</span> to move paddle</p>
          <p>Break all bricks to advance</p>
        </div>
      </div>
    </div>
  );
}
