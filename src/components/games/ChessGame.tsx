import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Lightbulb, CheckCircle2, ChevronRight, User, Shield, Compass } from 'lucide-react';
import { Difficulty } from '../../types';

interface ChessGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'chess', score: number) => void;
}

// Represent pieces: e.g. 'wp' (white pawn), 'br' (black rook)
type Piece = string; // '' is empty, 'wp', 'wr', 'wn', 'wb', 'wq', 'wk', 'bp', 'br', 'bn', 'bb', 'bq', 'bk'

const START_BOARD: Piece[][] = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

const UNICODE_PIECES: { [key: string]: string } = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

const PIECE_NAMES: { [key: string]: string } = {
  'p': 'Pawn', 'r': 'Rook', 'n': 'Knight', 'b': 'Bishop', 'q': 'Queen', 'k': 'King'
};

export default function ChessGame({ onBack, playAudio, updateXp, recordGamePlayed }: ChessGameProps) {
  const [board, setBoard] = useState<Piece[][]>(() => START_BOARD.map(row => [...row]));
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ r: number; c: number }[]>([]);
  const [lastMove, setLastMove] = useState<{ from: { r: number; c: number }; to: { r: number; c: number } } | null>(null);
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]); // captured black pieces are white's trophy
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [time, setTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isWinner, setIsWinner] = useState<'Draw' | 'White' | 'Black' | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [isKingChecked, setIsKingChecked] = useState<'white' | 'black' | null>(null);

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

  // AI Trigger
  useEffect(() => {
    if (isPlaying && !isCompleted && currentPlayer === 'black' && !aiThinking) {
      setAiThinking(true);
      // Let AI process with some latency delay for realism
      setTimeout(() => {
        triggerAiMove();
      }, 700);
    }
  }, [currentPlayer, isPlaying]);

  const handleStartGame = () => {
    playAudio('click');
    setBoard(START_BOARD.map(row => [...row]));
    setCurrentPlayer('white');
    setSelectedCell(null);
    setValidMoves([]);
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setTime(0);
    setHistory([]);
    setIsWinner(null);
    setIsCompleted(false);
    setIsKingChecked(null);
    setIsPlaying(true);
  };

  const selectPiece = (r: number, c: number) => {
    if (!isPlaying || isCompleted || aiThinking) return;
    const piece = board[r][c];

    // If a valid destination is clicked
    if (selectedCell && validMoves.some(m => m.r === r && m.c === c)) {
      movePiece(selectedCell.r, selectedCell.c, r, c);
      return;
    }

    if (!piece || !piece.startsWith(currentPlayer === 'white' ? 'w' : 'b')) {
      setSelectedCell(null);
      setValidMoves([]);
      return;
    }

    playAudio('click');
    setSelectedCell({ r, c });
    const moves = calculateMoves(board, r, c);
    setValidMoves(moves);
  };

  const movePiece = (fromR: number, fromC: number, toR: number, toC: number) => {
    const freshBoard = board.map(row => [...row]);
    const movingPiece = freshBoard[fromR][fromC];
    const destinationPiece = freshBoard[toR][toC];

    // Record Captures
    if (destinationPiece !== '') {
      playAudio('success'); // combat clash sound
      if (destinationPiece.startsWith('b')) {
        setCapturedWhite(prev => [...prev, destinationPiece]);
      } else {
        setCapturedBlack(prev => [...prev, destinationPiece]);
      }
    } else {
      playAudio('move');
    }

    // Pawn Promotion (Default to Queen for simplicity)
    let finalPiece = movingPiece;
    if (movingPiece === 'wp' && toR === 0) finalPiece = 'wq';
    if (movingPiece === 'bp' && toR === 7) finalPiece = 'bq';

    // Move Piece on duplicate board
    freshBoard[fromR][fromC] = '';
    freshBoard[toR][toC] = finalPiece;

    setBoard(freshBoard);
    setLastMove({ from: { r: fromR, c: fromC }, to: { r: toR, c: toC } });
    setSelectedCell(null);
    setValidMoves([]);

    // Record History in Algebraic layout (e.g. e2e4 or Nh3)
    const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const pCode = finalPiece[1] === 'p' ? '' : finalPiece[1].toUpperCase();
    const actionNotation = `${pCode}${columns[fromC]}${8 - fromR}${destinationPiece !== '' ? 'x' : ''}${columns[toC]}${8 - toR}`;
    setHistory(prev => [...prev, actionNotation]);

    // Check King constraints
    const opponent = currentPlayer === 'white' ? 'black' : 'white';
    const checked = isKingInCheck(freshBoard, opponent);
    setIsKingChecked(checked ? opponent : null);

    // Switch turns
    setCurrentPlayer(opponent);
    setAiThinking(false);
  };

  // Basic Chess Logic calculators
  const calculateMoves = (grid: Piece[][], fromR: number, fromC: number): { r: number; c: number }[] => {
    const piece = grid[fromR][fromC];
    if (piece === '') return [];

    const side = piece[0]; // 'w' or 'b'
    const type = piece[1]; // 'p', 'r', 'n', 'b', 'q', 'k'
    const moves: { r: number; c: number }[] = [];

    const addMoveIfValid = (r: number, c: number) => {
      if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
      const target = grid[r][c];
      if (target === '') {
        moves.push({ r, c });
        return true;
      }
      if (target[0] !== side) {
        moves.push({ r, c });
      }
      return false; // blocks path
    };

    switch (type) {
      case 'p': {
        const dir = side === 'w' ? -1 : 1;
        const startRow = side === 'w' ? 6 : 1;
        
        // Single space forward
        if (fromR + dir >= 0 && fromR + dir < 8 && grid[fromR + dir][fromC] === '') {
          moves.push({ r: fromR + dir, c: fromC });
          // Double space forward
          if (fromR === startRow && grid[fromR + 2 * dir][fromC] === '') {
            moves.push({ r: fromR + 2 * dir, c: fromC });
          }
        }
        // Diagonals capture
        [-1, 1].forEach(offset => {
          const nextR = fromR + dir;
          const nextC = fromC + offset;
          if (nextR >= 0 && nextR < 8 && nextC >= 0 && nextC < 8) {
            const diagPiece = grid[nextR][nextC];
            if (diagPiece !== '' && diagPiece[0] !== side) {
              moves.push({ r: nextR, c: nextC });
            }
          }
        });
        break;
      }
      case 'r': {
        const directions = [[1,0], [-1,0], [0,1], [0,-1]];
        directions.forEach(([dr, dc]) => {
          let step = 1;
          while (true) {
            const nextR = fromR + dr * step;
            const nextC = fromC + dc * step;
            if (nextR < 0 || nextR >= 8 || nextC < 0 || nextC >= 8) break;
            const target = grid[nextR][nextC];
            if (target === '') {
              moves.push({ r: nextR, c: nextC });
            } else {
              if (target[0] !== side) {
                moves.push({ r: nextR, c: nextC });
              }
              break; // blocked
            }
            step++;
          }
        });
        break;
      }
      case 'n': {
        const potentialOffsets = [
          [2,1], [2,-1], [-2,1], [-2,-1],
          [1,2], [1,-2], [-1,2], [-1,-2]
        ];
        potentialOffsets.forEach(([dr, dc]) => {
          addMoveIfValid(fromR + dr, fromC + dc);
        });
        break;
      }
      case 'b': {
        const directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
        directions.forEach(([dr, dc]) => {
          let step = 1;
          while (true) {
            const nextR = fromR + dr * step;
            const nextC = fromC + dc * step;
            if (nextR < 0 || nextR >= 8 || nextC < 0 || nextC >= 8) break;
            const target = grid[nextR][nextC];
            if (target === '') {
              moves.push({ r: nextR, c: nextC });
            } else {
              if (target[0] !== side) {
                moves.push({ r: nextR, c: nextC });
              }
              break;
            }
            step++;
          }
        });
        break;
      }
      case 'q': {
        const directions = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
        directions.forEach(([dr, dc]) => {
          let step = 1;
          while (true) {
            const nextR = fromR + dr * step;
            const nextC = fromC + dc * step;
            if (nextR < 0 || nextR >= 8 || nextC < 0 || nextC >= 8) break;
            const target = grid[nextR][nextC];
            if (target === '') {
              moves.push({ r: nextR, c: nextC });
            } else {
              if (target[0] !== side) {
                moves.push({ r: nextR, c: nextC });
              }
              break;
            }
            step++;
          }
        });
        break;
      }
      case 'k': {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            addMoveIfValid(fromR + dr, fromC + dc);
          }
        }
        break;
      }
    }

    return moves;
  };

  const isKingInCheck = (grid: Piece[][], sideColor: 'white' | 'black'): boolean => {
    // Find King coordinates
    let kingR = -1;
    let kingC = -1;
    const targetKingCode = sideColor === 'white' ? 'wk' : 'bk';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (grid[r][c] === targetKingCode) {
          kingR = r;
          kingC = c;
          break;
        }
      }
    }

    if (kingR === -1 || kingC === -1) return false;

    // Scan if any opponent piece can capture this slot
    const opponentSide = sideColor === 'white' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = grid[r][c];
        if (p !== '' && p[0] === opponentSide) {
          const attacks = calculateMoves(grid, r, c);
          if (attacks.some(m => m.r === kingR && m.c === kingC)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // AI processing moves generator
  const triggerAiMove = () => {
    // Find all valid moves for black
    const allMoves: { from: { r: number; c: number }; to: { r: number; c: number }; captureScore: number }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell !== '' && cell.startsWith('b')) {
          const validDestinations = calculateMoves(board, r, c);
          validDestinations.forEach(dest => {
            const destPiece = board[dest.r][dest.c];
            let score = 0;
            if (destPiece !== '') {
              const pieceVals: { [key: string]: number } = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
              score = pieceVals[destPiece[1]] || 0;
            }
            allMoves.push({
              from: { r, c },
              to: { r: dest.r, c: dest.c },
              captureScore: score
            });
          });
        }
      }
    }

    if (allMoves.length === 0) {
      // Checkmate or Stalemate
      const checked = isKingInCheck(board, 'black');
      if (checked) {
        setIsWinner('White');
      } else {
        setIsWinner('Draw');
      }
      setIsCompleted(true);
      setAiThinking(false);
      return;
    }

    // AI Decision levels
    let chosenMove = allMoves[0];

    if (difficulty === 'easy') {
      // Random action
      chosenMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    } else if (difficulty === 'medium') {
      // Prioritize capture, otherwise random
      allMoves.sort((a, b) => b.captureScore - a.captureScore);
      const topCaptures = allMoves.filter(m => m.captureScore > 0);
      if (topCaptures.length > 0 && Math.random() > 0.3) {
        chosenMove = topCaptures[Math.floor(Math.random() * topCaptures.length)];
      } else {
        chosenMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      }
    } else {
      // Hard: Always get the highest capture or center positions
      allMoves.sort((a, b) => {
        if (b.captureScore !== a.captureScore) return b.captureScore - a.captureScore;
        // Position score (prefer center files)
        const aCenterScore = Math.abs(3.5 - a.to.c) + Math.abs(3.5 - a.to.r);
        const bCenterScore = Math.abs(3.5 - b.to.c) + Math.abs(3.5 - b.to.r);
        return aCenterScore - bCenterScore; // lower deviation first
      });
      chosenMove = allMoves[0];
    }

    // Execute Move
    movePiece(chosenMove.from.r, chosenMove.from.c, chosenMove.to.r, chosenMove.to.c);
  };

  const getFormatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-2 md:p-6 text-white min-h-[95vh]">
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
              Chess
            </h1>
            <p className="text-[10px] text-slate-400/80 uppercase tracking-widest">Play against AI with adjustable difficulty</p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4 text-xs bg-[#020205] px-4 py-2.5 rounded-xl border border-white/5 font-mono select-none">
            <div className="text-slate-400">
              TIME: <span className="text-white font-bold">{getFormatTime(time)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-400">
              TURN: <span className="text-[#00f5ff] font-bold uppercase">{currentPlayer === 'white' ? 'PLAYER' : 'AI ENGINE'}</span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          /* Game Lobby Setup Portal */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-10"
          >
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl text-center flex flex-col gap-6">
              <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#00f5ff] flex items-center justify-center text-black shadow-lg shadow-[#00f5ff]/20">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Chess Settings</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">Choose AI difficulty and start a new game</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-left text-slate-400 pl-1 uppercase tracking-widest font-bold">AI DIFFICULTY</label>
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
                onClick={handleStartGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,78,0,0.25)] active:scale-[0.98] transition-transform duration-100 cursor-pointer text-sm uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-black text-black" /> START GAME
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Interactive Chess Battleground */
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Board */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Captured Whites (captured black pieces shown at top) */}
              <div className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-t-xl text-[10px] text-slate-400 font-mono justify-between select-none uppercase tracking-widest">
                <span>WHITE CAPTURED:</span>
                <div className="flex gap-1.5 text-lg">
                  {capturedWhite.map((piece, idx) => (
                    <span key={idx} className="text-[#00f5ff] drop-shadow-[0_0_5px_rgba(255,78,0,0.4)]">{UNICODE_PIECES[piece]}</span>
                  ))}
                </div>
              </div>

              {/* Grid 8x8 Board Container */}
              <div className="p-4 bg-white/[0.02] rounded-b-xl border-x border-b border-white/10 shadow-2xl relative select-none">
                <div className="grid grid-cols-8 gap-0 border border-white/10 rounded-lg overflow-hidden bg-[#020205]">
                  {board.map((row, rIdx) => (
                    <div key={rIdx} className="contents">
                      {row.map((piece, cIdx) => {
                        const isLight = (rIdx + cIdx) % 2 === 0;
                        const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;
                        const isValidDest = validMoves.some(m => m.r === rIdx && m.c === cIdx);
                        const isLastMoveCell = lastMove && ((lastMove.from.r === rIdx && lastMove.from.c === cIdx) || (lastMove.to.r === rIdx && lastMove.to.c === cIdx));
                        const isKingThreatChecked = isKingChecked && piece === `${isKingChecked === 'white' ? 'w' : 'b'}k`;

                        let cellClass = 'w-9 h-9 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-100 relative cursor-pointer text-2xl md:text-4xl ';

                        if (isSelected) {
                          cellClass += 'bg-[#00f5ff]/30 ring-2 ring-[#00f5ff] z-10 ';
                        } else if (isValidDest) {
                          cellClass += 'bg-[#6b21ff]/40 hover:bg-[#6b21ff]/50 ring-1 ring-[#6b21ff] z-10 ';
                        } else if (isKingThreatChecked) {
                          cellClass += 'bg-red-500/40 animate-pulse ring-2 ring-red-500 z-10 ';
                        } else if (isLastMoveCell) {
                          cellClass += 'bg-[#00f5ff]/15 ';
                        } else {
                          cellClass += isLight ? 'bg-white/[0.04] text-[#00f5ff]' : 'bg-[#020205] text-[#6b21ff]';
                        }

                        return (
                          <div
                            key={cIdx}
                            onClick={() => selectPiece(rIdx, cIdx)}
                            className={cellClass}
                          >
                            {/* Render Piece Representation */}
                            {piece && (
                              <span className={`font-semibold filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none ${piece.startsWith('w') ? 'text-[#00f5ff] font-normal' : 'text-[#6b21ff] font-bold'}`}>
                                {UNICODE_PIECES[piece]}
                              </span>
                            )}

                            {/* Chess column notation indicators inside edges */}
                            {cIdx === 0 && (
                              <span className="absolute top-0.5 left-1 text-[8px] font-bold opacity-30 select-none text-slate-400">
                                {8 - rIdx}
                              </span>
                            )}
                            {rIdx === 7 && (
                              <span className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-30 select-none uppercase text-slate-400">
                                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][cIdx]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Captured Blacks (captured white pieces shown at bottom) */}
              <div className="w-full flex items-center gap-2 px-4 py-2 mt-2 bg-white/[0.03] border border-white/5 rounded-t-xl text-[10px] text-slate-400 font-mono justify-between select-none uppercase tracking-widest">
                <span>BLACK CAPTURED:</span>
                <div className="flex gap-1.5 text-lg">
                  {capturedBlack.map((piece, idx) => (
                    <span key={idx} className="text-[#6b21ff] drop-shadow-[0_0_5px_rgba(107,33,255,0.45)]">{UNICODE_PIECES[piece]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Game Stats, History & Logs */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Interactive AI Controller Status */}
              <div className="bg-white/[0.03] border border-white/10 p-4.5 rounded-2xl backdrop-blur-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${aiThinking ? 'bg-amber-400 animate-ping' : 'bg-green-400'}`} />
                  <div>
                    <span className="text-slate-500 text-[10px] block font-bold tracking-wider uppercase">AI ENGINE SYSTEM</span>
                    <span className="text-xs font-semibold text-white">
                      {aiThinking ? 'Thinking...' : 'Your turn'}
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 text-xs">
                  DIFFICULTY: <span className="text-amber-400 font-bold uppercase">{difficulty}</span>
                </div>
              </div>

              {/* Algebraic Action notation histories */}
              <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl backdrop-blur-md flex flex-col gap-3">
                <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Move History Log</div>
                <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1 font-mono text-xs pr-2 scrollbar-thin">
                  {history.length === 0 ? (
                    <div className="text-slate-500 italic py-4 text-center text-xs">No move histories documented yet. Initialize deployments to log.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Array(Math.ceil(history.length / 2)).fill(null).map((_, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-500">{idx + 1}.</span>
                          <span className="text-white font-bold">{history[idx * 2]}</span>
                          <span className="text-[#00f5ff] font-bold">{history[idx * 2 + 1] || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Game adjustments buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleStartGame}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" /> NEW GAME
                </button>

                <button
                  onClick={() => setIsPlaying(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase"
                >
                  DIFFICULTY
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
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
                <h2 className="text-3xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Game Over</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">
                  {isWinner === 'Draw' ? 'Stalemate! The game ended in a draw.' : `${isWinner} wins by checkmate!`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl text-left font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">TOTAL PLAY TIME</span>
                  <div className="text-base font-black text-white mt-0.5">{getFormatTime(time)}</div>
                </div>
                <div className="border-l border-white/10 pl-4 font-mono">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">TOTAL ACTION MOVES</span>
                  <div className="text-base font-black text-white mt-0.5">{history.length}</div>
                </div>
              </div>

              <button
                onClick={handleStartGame}
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
