import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, RefreshCw, Lightbulb, CheckCircle2, ChevronRight, Activity, ArrowUpRight, HelpCircle } from 'lucide-react';
import { Difficulty } from '../../types';

interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  color: 'red' | 'black';
  faceUp: boolean;
}

interface MoveAction {
  type: 'draw' | 'tableau-to-tableau' | 'tableau-to-foundation' | 'waste-to-tableau' | 'waste-to-foundation' | 'foundation-to-tableau';
  fromIdx?: number;
  toIdx?: number;
  suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  cardsMovedCount?: number;
  turnedFaceUpIdx?: number; // store column index where card was flipped
}

interface SolitaireGameProps {
  onBack: () => void;
  playAudio: (type: 'click' | 'flip' | 'success' | 'error' | 'levelUp' | 'victory' | 'move') => void;
  updateXp: (amount: number) => void;
  recordGamePlayed: (gameType: 'solitaire', score: number) => void;
}

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const VALUE_MAP: { [key: string]: number } = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const SUIT_NAMES = {
  hearts: 'HEARTS',
  diamonds: 'DIAMONDS',
  clubs: 'CLUBS',
  spades: 'SPADES'
};

export default function SolitaireGame({ onBack, playAudio, updateXp, recordGamePlayed }: SolitaireGameProps) {
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<{ [key in typeof SUITS[number]]: Card[] }>({
    hearts: [], diamonds: [], clubs: [], spades: []
  });
  const [tableau, setTableau] = useState<Card[][]>(() => Array(7).fill(null).map(() => []));
  const [selectedCard, setSelectedCard] = useState<{ card: Card; source: { type: 'waste' | 'tableau' | 'foundation'; colIdx?: number; cardIdx?: number } } | null>(null);
  
  const [moves, setMoves] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<{
    stock: Card[];
    waste: Card[];
    foundations: { [key in typeof SUITS[number]]: Card[] };
    tableau: Card[][];
    score: number;
    moves: number;
  }[]>([]);

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

  // Handle deck creation and initial distribution
  const startNewGame = () => {
    playAudio('click');
    setIsCompleted(false);
    setMoves(0);
    setScore(0);
    setTime(0);
    setSelectedCard(null);
    setUndoStack([]);

    // Create a standard deck
    const deck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        deck.push({
          id: `${value}-${suit}`,
          suit,
          value,
          color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
          faceUp: false
        });
      });
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Distribute into 7 Tableau columns
    const initialTableau: Card[][] = Array(7).fill(null).map(() => []);
    let cardIdx = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[cardIdx++];
        if (j === i) card.faceUp = true;
        initialTableau[j].push(card);
      }
    }

    // Remaining cards go to Stock pile
    const initialStock = deck.slice(cardIdx);

    setTableau(initialTableau);
    setStock(initialStock);
    setWaste([]);
    setFoundations({ hearts: [], diamonds: [], clubs: [], spades: [] });
    setIsPlaying(true);
  };

  const saveToUndo = () => {
    const backup = {
      stock: stock.map(c => ({ ...c })),
      waste: waste.map(c => ({ ...c })),
      foundations: {
        hearts: foundations.hearts.map(c => ({ ...c })),
        diamonds: foundations.diamonds.map(c => ({ ...c })),
        clubs: foundations.clubs.map(c => ({ ...c })),
        spades: foundations.spades.map(c => ({ ...c }))
      },
      tableau: tableau.map(col => col.map(c => ({ ...c }))),
      score,
      moves
    };
    setUndoStack(prev => [...prev, backup]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    playAudio('flip');
    const previousState = undoStack[undoStack.length - 1];
    setStock(previousState.stock);
    setWaste(previousState.waste);
    setFoundations(previousState.foundations);
    setTableau(previousState.tableau);
    setScore(previousState.score);
    setMoves(previousState.moves);
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setSelectedCard(null);
  };

  // Draw card from Stock to Waste pile
  const handleStockClick = () => {
    if (stock.length === 0 && waste.length === 0) return;
    playAudio('flip');
    saveToUndo();
    setMoves(m => m + 1);

    if (stock.length > 0) {
      const nextCard = { ...stock[stock.length - 1], faceUp: true };
      setStock(prev => prev.slice(0, prev.length - 1));
      setWaste(prev => [...prev, nextCard]);
    } else {
      // Recycle waste back to stock in reverse order
      const recycled = [...waste].reverse().map(c => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
    }
  };

  const handleCardClick = (card: Card, source: typeof selectedCard['source']) => {
    if (!isPlaying || isCompleted) return;
    playAudio('click');

    // Deselect if already selected
    if (selectedCard && selectedCard.card.id === card.id) {
      setSelectedCard(null);
      return;
    }

    // 1. If we are aiming to perform a move actions
    if (selectedCard) {
      const { card: movingCard, source: movingSource } = selectedCard;

      // Rule validators
      if (source.type === 'tableau' && source.colIdx !== undefined) {
        const targetColIdx = source.colIdx;
        const targetCol = tableau[targetColIdx];
        const isLastInCol = source.cardIdx === targetCol.length - 1;

        if (isLastInCol) {
          // Tableau matching rule: alternating color, descending rank
          if (movingCard.color !== card.color && VALUE_MAP[movingCard.value] === VALUE_MAP[card.value] - 1) {
            executeMove(movingSource, { type: 'tableau', colIdx: targetColIdx });
            return;
          }
        }
      } else if (source.type === 'foundation' && source.colIdx === undefined) {
        // Double check placing directly on card of foundation
        const targetSuit = card.suit;
        const targetFound = foundations[targetSuit];
        if (movingCard.suit === targetSuit && VALUE_MAP[movingCard.value] === VALUE_MAP[targetFound[targetFound.length - 1].value] + 1) {
          executeMove(movingSource, { type: 'foundation', colIdx: undefined });
          return;
        }
      }
    }

    // 2. Otherwise update current selection
    if (card.faceUp) {
      setSelectedCard({ card, source });
    }
  };

  const handleEmptyColumnClick = (colIdx: number) => {
    if (!selectedCard) return;
    const { card: movingCard, source: movingSource } = selectedCard;

    // Rule: Only Kings (value 'K') can be placed in empty columns
    if (movingCard.value === 'K') {
      playAudio('move');
      executeMove(movingSource, { type: 'tableau', colIdx });
    } else {
      playAudio('error');
    }
  };

  const handleFoundationSlotClick = (suit: typeof SUITS[number]) => {
    if (!selectedCard) return;
    const { card: movingCard, source: movingSource } = selectedCard;

    const targetFound = foundations[suit];
    const canPlace = (targetFound.length === 0 && movingCard.value === 'A') ||
                     (targetFound.length > 0 && movingCard.suit === suit && VALUE_MAP[movingCard.value] === VALUE_MAP[targetFound[targetFound.length - 1].value] + 1);

    if (canPlace) {
      playAudio('success');
      executeMove(movingSource, { type: 'foundation' });
    } else {
      playAudio('error');
    }
  };

  const handleCardDoubleTab = (card: Card, source: typeof selectedCard['source']) => {
    if (!isPlaying || isCompleted || !card.faceUp) return;

    // Fast-tracking attempt: try to push directly to suitable foundation pile
    const suit = card.suit;
    const targetFound = foundations[suit];
    const canPlace = (targetFound.length === 0 && card.value === 'A') ||
                     (targetFound.length > 0 && VALUE_MAP[card.value] === VALUE_MAP[targetFound[targetFound.length - 1].value] + 1);

    if (canPlace) {
      playAudio('success');
      saveToUndo();
      setMoves(m => m + 1);
      setScore(s => s + 10);

      // Remove from source
      if (source.type === 'waste') {
        setWaste(prev => prev.slice(0, prev.length - 1));
      } else if (source.type === 'tableau' && source.colIdx !== undefined && source.cardIdx !== undefined) {
        const colIdx = source.colIdx;
        const col = [...tableau[colIdx]];
        col.splice(source.cardIdx, 1);
        
        // Auto flip previous card
        if (col.length > 0 && !col[col.length - 1].faceUp) {
          col[col.length - 1].faceUp = true;
          setScore(s => s + 5);
        }
        setTableau(prev => {
          const next = [...prev];
          next[colIdx] = col;
          return next;
        });
      }

      setFoundations(prev => ({
        ...prev,
        [suit]: [...prev[suit], card]
      }));

      setSelectedCard(null);
      checkWinCondition();
    }
  };

  const executeMove = (
    from: typeof selectedCard['source'],
    to: { type: 'tableau' | 'foundation'; colIdx?: number }
  ) => {
    saveToUndo();
    setMoves(m => m + 1);

    let movedCards: Card[] = [];

    // 1. Gather moving cards from source
    if (from.type === 'waste') {
      movedCards = [waste[waste.length - 1]];
      setWaste(prev => prev.slice(0, prev.length - 1));
    } else if (from.type === 'tableau' && from.colIdx !== undefined && from.cardIdx !== undefined) {
      const fromColIdx = from.colIdx;
      const col = [...tableau[fromColIdx]];
      movedCards = col.slice(from.cardIdx);
      const remaining = col.slice(0, from.cardIdx);

      // Flip the new end card faceUp
      if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
        remaining[remaining.length - 1].faceUp = true;
        setScore(s => s + 5);
      }

      setTableau(prev => {
        const next = [...prev];
        next[fromColIdx] = remaining;
        return next;
      });
    }

    // 2. Append to target
    if (to.type === 'tableau' && to.colIdx !== undefined) {
      const targetColIdx = to.colIdx;
      setTableau(prev => {
        const next = [...prev];
        next[targetColIdx] = [...next[targetColIdx], ...movedCards];
        return next;
      });
      setScore(s => s + 5);
    } else if (to.type === 'foundation') {
      const suit = movedCards[0].suit;
      setFoundations(prev => ({
        ...prev,
        [suit]: [...prev[suit], ...movedCards]
      }));
      setScore(s => s + 10);
    }

    setSelectedCard(null);
    checkWinCondition();
  };

  const checkWinCondition = () => {
    // Check if foundations have 13 cards each
    setTimeout(() => {
      setFoundations(current => {
        const win = SUITS.every(suit => current[suit].length === 13);
        if (win) {
          setIsCompleted(true);
          playAudio('victory');
          const finalScoreBonus = Math.max(10, 800 - moves - Math.floor(time / 2));
          updateXp(finalScoreBonus);
          recordGamePlayed('solitaire', finalScoreBonus);
        }
        return current;
      });
    }, 100);
  };

  const getCardClasses = (card: Card, isSelected: boolean) => {
    let classes = 'w-10 h-14 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-lg cursor-pointer flex flex-col justify-between p-1 sm:p-2 border transition-transform relative select-none ';

    if (card.faceUp) {
      classes += 'bg-[#020205] border-white/10 ';
      if (card.color === 'red') {
        classes += 'text-rose-500 ';
      } else {
        classes += 'text-slate-200 ';
      }
    } else {
      // faceDown Back design
      classes += 'bg-[#120824] border-white/15 text-transparent ';
    }

    if (isSelected) {
      classes += 'ring-2 ring-[#00f5ff] scale-105 shadow-xl shadow-[#00f5ff]/30 -translate-y-2 z-35 ';
    } else {
      classes += 'shadow-md shadow-black/30 hover:brightness-110 ';
    }

    return classes;
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
              Klondike Solitaire
            </h1>
            <p className="text-[10px] text-slate-400/80 uppercase tracking-widest">Classic card sorting game</p>
          </div>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4 text-xs bg-[#020205] px-4 py-2.5 rounded-xl border border-white/5 font-mono select-none">
            <div className="text-slate-400">
              TIME: <span className="text-white font-bold">{getFormatTime(time)}</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="text-slate-400">
              MOVES: <span className="text-[#00f5ff] font-bold">{moves}</span>
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
          /* Game Setup Lobby Portal */
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center py-10"
          >
            <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-8 rounded-[32px] backdrop-blur-2xl text-center flex flex-col gap-6">
              <div className="mx-auto w-16 h-16 rounded-[20px] bg-[#00f5ff] flex items-center justify-center text-black shadow-lg shadow-[#00f5ff]/20">
                <Play className="w-6 h-6 fill-black text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic" style={{ fontFamily: 'var(--font-serif)' }}>Klondike Solitaire</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider">Shuffle and deal a standard 52-card deck</p>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,78,0,0.25)] active:scale-[0.98] transition-transform duration-100 cursor-pointer text-sm uppercase tracking-wider"
              >
                  SHUFFLE & DEAL
              </button>
            </div>
          </motion.div>
        ) : (
          /* Main Klondike Grid Desk */
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Top Deck Row: Stock, Waste, and Foundations */}
            <div className="grid grid-cols-7 gap-2 md:gap-4 justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 relative z-20">
              {/* Stack & Pile (Stock & Waste) */}
              <div className="col-span-3 flex gap-2 md:gap-4">
                {/* Stock Pile */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">STOCK</span>
                  <div 
                    onClick={handleStockClick}
                    className="w-10 h-14 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-lg border border-dashed border-white/20 bg-slate-950/50 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
                  >
                    {stock.length > 0 ? (
                      <div className="w-full h-full bg-[#120824] border border-white/15 rounded-lg flex items-center justify-center relative">
                        {/* Chip design symbol */}
                        <div className="w-4 h-4 md:w-8 md:h-8 rounded uppercase text-[8px] md:text-sm font-bold border border-white/15 bg-white/5 flex items-center justify-center text-white/50">M</div>
                      </div>
                    ) : (
                      <RefreshCw className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Waste Pile */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">WASTE</span>
                  <div className="w-10 h-14 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-lg border border-dashed border-white/10 bg-[#020205] relative">
                    {waste.length > 0 && (
                      <div
                        onClick={() => handleCardClick(waste[waste.length - 1], { type: 'waste' })}
                        onDoubleClick={() => handleCardDoubleTab(waste[waste.length - 1], { type: 'waste' })}
                        className={getCardClasses(
                          waste[waste.length - 1],
                          selectedCard?.card.id === waste[waste.length - 1].id
                        )}
                      >
                        <div className="flex justify-between items-start text-xs md:text-sm font-black leading-none">
                          <span>{waste[waste.length - 1].value}</span>
                          <span>{SUIT_SYMBOLS[waste[waste.length - 1].suit]}</span>
                        </div>
                        <div className="text-center text-xl md:text-3xl font-normal leading-none self-center">
                          {SUIT_SYMBOLS[waste[waste.length - 1].suit]}
                        </div>
                        <div className="flex justify-between items-end rotate-180 text-xs md:text-sm font-black leading-none">
                          <span>{waste[waste.length - 1].value}</span>
                          <span>{SUIT_SYMBOLS[waste[waste.length - 1].suit]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Spacing gap */}
              <div className="col-span-1" />

              {/* 4 Foundations */}
              <div className="col-span-3 flex justify-end gap-1 sm:gap-2">
                {SUITS.map(suit => {
                  const items = foundations[suit];
                  const hasCards = items.length > 0;
                  return (
                    <div key={suit} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase">{suit.substring(0,4)}</span>
                      <div 
                        onClick={() => handleFoundationSlotClick(suit)}
                        className={`w-10 h-14 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-lg border border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer relative ${
                          selectedCard && selectedCard.card.suit === suit ? 'border-amber-400 bg-amber-500/5' : 'border-white/20 bg-slate-950/40 hover:border-slate-400'
                        }`}
                      >
                        {hasCards ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(items[items.length - 1], { type: 'foundation', colIdx: undefined });
                            }}
                            className={getCardClasses(
                              items[items.length - 1],
                              selectedCard?.card.id === items[items.length - 1].id
                            )}
                          >
                            <div className="flex justify-between items-start text-xs md:text-sm font-black leading-none">
                              <span>{items[items.length - 1].value}</span>
                              <span>{SUIT_SYMBOLS[suit]}</span>
                            </div>
                            <div className="text-center text-xl md:text-3xl font-normal leading-none self-center">
                              {SUIT_SYMBOLS[suit]}
                            </div>
                            <div className="flex justify-between items-end rotate-180 text-xs md:text-sm font-black leading-none">
                              <span>{items[items.length - 1].value}</span>
                              <span>{SUIT_SYMBOLS[suit]}</span>
                            </div>
                          </div>
                        ) : (
                          <span className={`text-base md:text-3xl font-light opacity-25 ${suit === 'hearts' || suit === 'diamonds' ? 'text-rose-500' : 'text-slate-500'}`}>
                            {SUIT_SYMBOLS[suit]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7 Tableau Columns Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 bg-slate-950/10 min-h-[50vh] p-2 rounded-2xl relative z-10">
              {tableau.map((col, colIdx) => (
                <div 
                  key={colIdx} 
                  className="flex flex-col items-center relative min-h-[300px]"
                >
                  {/* Empty Slot Placeholder */}
                  {col.length === 0 ? (
                    <div
                      onClick={() => handleEmptyColumnClick(colIdx)}
                      className="w-10 h-14 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-lg border-2 border-dashed border-white/10 bg-slate-900/10 flex items-center justify-center hover:border-white/30 transition-colors cursor-pointer"
                    >
                      <span className="text-slate-600 text-xs font-bold leading-none uppercase">K</span>
                    </div>
                  ) : (
                    <div className="w-full relative h-[450px]">
                      {col.map((card, cardIdx) => {
                        const isSelected = selectedCard?.card.id === card.id;
                        // Cascade stack height
                        const topStyle = {
                          position: 'absolute' as const,
                          top: `${cardIdx * (window.innerWidth < 640 ? 12 : 22)}px`,
                          zIndex: cardIdx + 1,
                        };
                        return (
                          <div
                            key={card.id}
                            style={topStyle}
                            onClick={() => handleCardClick(card, { type: 'tableau', colIdx, cardIdx })}
                            onDoubleClick={() => handleCardDoubleTab(card, { type: 'tableau', colIdx, cardIdx })}
                            className={getCardClasses(card, isSelected)}
                          >
                            {card.faceUp ? (
                              <div className="flex flex-col justify-between h-full w-full">
                                <div className="flex justify-between items-start text-[10px] sm:text-xs md:text-sm font-black leading-none">
                                  <span>{card.value}</span>
                                  <span>{SUIT_SYMBOLS[card.suit]}</span>
                                </div>
                                <div className="text-center text-sm sm:text-2xl md:text-3xl font-normal leading-none self-center">
                                  {SUIT_SYMBOLS[card.suit]}
                                </div>
                                <div className="flex justify-between items-end rotate-180 text-[10px] sm:text-xs md:text-sm font-black leading-none">
                                  <span>{card.value}</span>
                                  <span>{SUIT_SYMBOLS[card.suit]}</span>
                                </div>
                              </div>
                            ) : (
                              /* Back decoration pattern */
                              <div className="absolute inset-0.5 rounded-md border border-white/5 bg-slate-950/40 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-indigo-500/20" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Admin Game Functions */}
            <div className="relative z-25 flex flex-wrap items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed uppercase"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" /> UNDO
              </button>

              <button
                onClick={startNewGame}
                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase"
              >
                NEW GAME
              </button>

              <button
                onClick={() => setIsPlaying(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-white uppercase"
              >
                RESET TABLE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Celebration Overlay Banner */}
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
                <h2 className="text-3xl font-serif italic text-white" style={{ fontFamily: 'var(--font-serif)' }}>Solitaire Complete</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">All foundations built in perfect order!</p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl">
                <div className="text-left font-mono">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">TIME</span>
                  <div className="text-base font-black text-white mt-0.5">{getFormatTime(time)}</div>
                </div>
                <div className="text-left font-mono border-l border-white/10 pl-3">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">MOVES</span>
                  <div className="text-base font-black text-white mt-0.5">{moves}</div>
                </div>
                <div className="text-left font-mono border-l border-white/10 pl-3">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">SCORE</span>
                  <div className="text-base font-black text-[#00f5ff] mt-0.5">{score}</div>
                </div>
              </div>

              <button
                onClick={startNewGame}
                className="w-full bg-[#00f5ff] hover:bg-[#00f5ff]/90 text-black py-4 rounded-xl font-bold active:scale-[0.98] transition-transform duration-150 cursor-pointer text-sm uppercase tracking-wider"
              >
                PLAY AGAIN
              </button>

              <button
                onClick={onBack}
                className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-black text-slate-400 hover:text-white transition-all cursor-pointer text-xs uppercase tracking-widest"
              >
                BACK TO ARCADE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
