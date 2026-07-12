import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Trophy, Zap } from 'lucide-react';

interface PongGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'pong', score: number) => void;
}

const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 12;
const BALL_RADIUS = 8;
const WINNING_SCORE = 5;

export default function PongGame({ onBack, playAudio, updateXp, recordGamePlayed }: PongGameProps) {
  const [playerY, setPlayerY] = useState<number>(200);
  const [aiY, setAiY] = useState<number>(200);
  const [ball, setBall] = useState<{ x: number; y: number; dx: number; dy: number }>({
    x: 300,
    y: 250,
    dx: 5,
    dy: 3
  });
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('pong_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const containerWidth = 600;
  const containerHeight = 400;

  const getAiSpeed = () => {
    switch (difficulty) {
      case 'easy': return 3;
      case 'medium': return 5;
      case 'hard': return 8;
    }
  };

  const startGame = () => {
    playAudio('click');
    setPlayerY((containerHeight - PADDLE_HEIGHT) / 2);
    setAiY((containerHeight - PADDLE_HEIGHT) / 2);
    setBall({
      x: containerWidth / 2,
      y: containerHeight / 2,
      dx: 5 * (Math.random() > 0.5 ? 1 : -1),
      dy: (Math.random() * 4 - 2)
    });
    setPlayerScore(0);
    setAiScore(0);
    setIsPlaying(true);
    setIsGameOver(false);
    setWinner(null);
  };

  const resetGame = () => {
    playAudio('click');
    setPlayerY((containerHeight - PADDLE_HEIGHT) / 2);
    setAiY((containerHeight - PADDLE_HEIGHT) / 2);
    setBall({
      x: containerWidth / 2,
      y: containerHeight / 2,
      dx: 5,
      dy: 3
    });
    setPlayerScore(0);
    setAiScore(0);
    setIsPlaying(false);
    setIsGameOver(false);
    setWinner(null);
  };

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const gameLoop = setInterval(() => {
      setBall(prevBall => {
        let { x, y, dx, dy } = prevBall;
        
        // Move ball
        x += dx;
        y += dy;

        // Top/bottom wall collision
        if (y - BALL_RADIUS <= 0 || y + BALL_RADIUS >= containerHeight) {
          dy = -dy;
          y = Math.max(BALL_RADIUS, Math.min(y, containerHeight - BALL_RADIUS));
        }

        // Left wall - AI scores
        if (x - BALL_RADIUS <= 0) {
          playAudio('error');
          const newAiScore = aiScore + 1;
          setAiScore(newAiScore);
          
          if (newAiScore >= WINNING_SCORE) {
            setIsGameOver(true);
            setIsPlaying(false);
            setWinner('ai');
            recordGamePlayed('pong', playerScore);
            updateXp(playerScore * 5);
          }
          
          return {
            x: containerWidth / 2,
            y: containerHeight / 2,
            dx: -5,
            dy: (Math.random() * 4 - 2)
          };
        }

        // Right wall - Player scores
        if (x + BALL_RADIUS >= containerWidth) {
          playAudio('success');
          const newPlayerScore = playerScore + 1;
          setPlayerScore(newPlayerScore);
          
          if (newPlayerScore >= WINNING_SCORE) {
            setIsGameOver(true);
            setIsPlaying(false);
            setWinner('player');
            if (newPlayerScore > highScore) {
              setHighScore(newPlayerScore);
              localStorage.setItem('pong_highscore', String(newPlayerScore));
            }
            recordGamePlayed('pong', newPlayerScore);
            updateXp(newPlayerScore * 10);
            playAudio('victory');
          }
          
          return {
            x: containerWidth / 2,
            y: containerHeight / 2,
            dx: 5,
            dy: (Math.random() * 4 - 2)
          };
        }

        // Player paddle collision
        if (
          x - BALL_RADIUS <= PADDLE_WIDTH + 10 &&
          x + BALL_RADIUS >= 10 &&
          y >= playerY &&
          y <= playerY + PADDLE_HEIGHT
        ) {
          dx = Math.abs(dx);
          const hitPos = (y - playerY) / PADDLE_HEIGHT;
          dy = (hitPos - 0.5) * 8;
          playAudio('flip');
        }

        // AI paddle collision
        if (
          x + BALL_RADIUS >= containerWidth - PADDLE_WIDTH - 10 &&
          x - BALL_RADIUS <= containerWidth - 10 &&
          y >= aiY &&
          y <= aiY + PADDLE_HEIGHT
        ) {
          dx = -Math.abs(dx);
          const hitPos = (y - aiY) / PADDLE_HEIGHT;
          dy = (hitPos - 0.5) * 8;
        }

        return { x, y, dx, dy };
      });

      // AI movement
      setAiY(prevAiY => {
        const aiCenter = prevAiY + PADDLE_HEIGHT / 2;
        const targetY = ball.y;
        const aiSpeed = getAiSpeed();
        
        if (aiCenter < targetY - 10) {
          return Math.min(prevAiY + aiSpeed, containerHeight - PADDLE_HEIGHT);
        } else if (aiCenter > targetY + 10) {
          return Math.max(prevAiY - aiSpeed, 0);
        }
        return prevAiY;
      });

    }, 16);

    gameLoopRef.current = gameLoop;
    return () => clearInterval(gameLoop);
  }, [isPlaying, isGameOver, playerScore, aiScore, playerY, aiY, ball, difficulty, highScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return;
      
      const step = 25;
      if (e.key === 'ArrowUp' || e.key === 'w') {
        setPlayerY(y => Math.max(0, y - step));
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        setPlayerY(y => Math.min(containerHeight - PADDLE_HEIGHT, y + step));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

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
          
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Pong Classic</h1>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{highScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
              <span className="text-2xl font-black text-rose-400">YOU</span>
              <span className="text-3xl font-black text-white">{playerScore}</span>
            </div>
            <span className="text-slate-500 font-bold">:</span>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-3xl font-black text-white">{aiScore}</span>
              <span className="text-2xl font-black text-slate-400">AI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold"
              disabled={isPlaying}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              onClick={isPlaying ? resetGame : startGame}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-bold flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isPlaying ? 'Reset' : 'Start'}
            </button>
          </div>
        </div>

        {/* Game Board */}
        <div 
          className="relative bg-slate-900 rounded-2xl border border-white/10 overflow-hidden mb-4"
          style={{ width: '100%', maxWidth: `${containerWidth}px`, height: `${containerHeight}px`, margin: '0 auto' }}
        >
          {/* Center line */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-full h-8 bg-white/20 my-2" />
            ))}
          </div>

          {/* Player paddle */}
          <div
            className="absolute bg-gradient-to-b from-rose-400 to-rose-600 rounded-full"
            style={{
              left: 10,
              top: playerY,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
              boxShadow: '0 0 15px rgba(244, 63, 94, 0.5)'
            }}
          />

          {/* AI paddle */}
          <div
            className="absolute bg-gradient-to-b from-slate-400 to-slate-600 rounded-full"
            style={{
              right: 10,
              top: aiY,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT,
              boxShadow: '0 0 15px rgba(148, 163, 184, 0.5)'
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
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)'
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
                <h2 className={`text-3xl font-black mb-2 ${winner === 'player' ? 'text-emerald-400' : 'text-red-500'}`}>
                  {winner === 'player' ? 'YOU WIN!' : 'AI WINS!'}
                </h2>
                <p className="text-white mb-4">Final Score: {playerScore} - {aiScore}</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-bold flex items-center gap-2 mx-auto"
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
                <p className="text-slate-400 mb-4">Use arrow keys or W/S to move</p>
                <p className="text-slate-500 text-sm mb-2">First to {WINNING_SCORE} wins!</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-bold flex items-center gap-2 mx-auto"
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
          <p>Use <span className="text-white font-bold">Arrow Keys</span> or <span className="text-white font-bold">W/S</span> to move paddle</p>
          <p>First to {WINNING_SCORE} points wins!</p>
        </div>
      </div>
    </div>
  );
}
