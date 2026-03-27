import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTimer } from "../context/TimerContext";
import * as client from "../api/client";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import HackerText from '../components/HackerText';
import ElectricOverlay from '../components/ElectricOverlay';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useDeviceTier } from '../hooks/useDeviceTier';
import { motion, AnimatePresence } from 'framer-motion';
import "../styles/QuestionRound.css";

const QuestionRound = ({ teamName, onQuestionComplete }) => {
  const { user } = useAuth();
  const { elapsedTime, formatTime } = useTimer();
  const { width, height } = useWindowSize();
  const prefersReducedMotion = useReducedMotion();
  const tier = useDeviceTier();

  // Hardware optimizations
  const confettiConfig = {
    low: { numberOfPieces: 50, gravity: 0.4, recycle: false },
    mid: { numberOfPieces: 120, gravity: 0.3, recycle: false },
    high: { numberOfPieces: 250, gravity: 0.25, recycle: false },
  };

  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Clues & Hints
  const [showClue2, setShowClue2] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  
  // Powerups & Gamification
  const [powerupsAvailable, setPowerupsAvailable] = useState({});
  const [teamPowerups, setTeamPowerups] = useState([]);
  const [activePowerup, setActivePowerup] = useState(null);
  const [certaintyFeedback, setCertaintyFeedback] = useState(null);
  const [stone, setStone] = useState(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  
  // UI States
  const [shake, setShake] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const inputRef = useRef(null);

  const isOvercharged = activePowerup || streak >= 3;

  const normalizePowerupEffect = (powerup) => {
    if (!powerup) return null;
    if (powerup.id === "truth_manifestation") return "certainty_check";
    return powerup.effect;
  };

  const getPowerupEffect = (powerupId) => {
    return normalizePowerupEffect(teamPowerups.find((p) => p.id === powerupId));
  };

  const activeEffect = activePowerup ? getPowerupEffect(activePowerup) : null;
  const revealClue2 =
    showClue2 || activeEffect === "extra_clue" || activeEffect === "reveal_all_clues";
  const revealBonusHint = showHint || activeEffect === "reveal_all_clues";
  const revealFirstLetter = activeEffect === "reveal_first_letter";

  // Evaluate Keyboard Visibility (Responsive Footer)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      // Shrinking vertical height strictly indicates a soft-keyboard opening
      if (isMobile && window.innerHeight < 500) {
        setKeyboardOpen(true);
      } else {
        setKeyboardOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync state cleanly on mount
  useEffect(() => {
    loadCurrentQuestion();
  }, [teamName]);

  const loadCurrentQuestion = async () => {
    setLoading(true);
    setError(null);
    setAnswer("");
    setShowHint(false);
    setCertaintyFeedback(null);
    setShowClue2(false);
    setActivePowerup(null);

    try {
      const response = await client.getCurrentQuestion(teamName);

      if (response.completed) {
        setQuestion({ completed: true, message: response.message, current_score: response.current_score });
        return;
      }

      setQuestion(response);
      setHintsRemaining(response.hints_remaining);
      setPowerupsAvailable(response.powerups_available);

      const stoneData = await client.getTeamStone(teamName);
      setStone(stoneData.stone);
      setStreak(stoneData.current_streak || 0);

      const powerupData = await client.getTeamPowerups(teamName);
      setTeamPowerups(powerupData.powerups || []);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to load question securely."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCertaintyCheck = async () => {
    if (activeEffect !== "certainty_check") {
      triggerError("Activate Logic Lock to verify your answer.");
      return;
    }
    if (!answer.trim()) {
      triggerError("Enter an answer first to check its certainty.");
      return;
    }
    try {
      const response = await client.certaintyCheck(
        teamName,
        question.question_id,
        answer
      );
      setCertaintyFeedback(response.feedback);
      if (activePowerup) {
        setPowerupsAvailable((prev) => ({ ...prev, [activePowerup]: false }));
        setTeamPowerups((prev) =>
          prev.map((item) =>
            item.id === activePowerup
              ? { ...item, available: false, used: true }
              : item
          )
        );
      }
      setActivePowerup(null);
    } catch (err) {
      triggerError("Certainty Check failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!answer.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await client.submitQuestion({
        team_name: teamName,
        question_id: question.question_id,
        answer: answer.trim(),
        time_taken: elapsedTime,
        powerup_used: activePowerup,
      });

      if (response.correct) {
        setSuccessMessage(`🎉 ${response.message} (+${response.score_earned} points)`);
        setScore(response.current_score || score + response.score_earned);
        
        setTimeout(() => setSuccessMessage(null), 3000);
        
        if (response.next_question_ready) {
          loadCurrentQuestion();
        } else {
          setQuestion({ completed: true, message: "All questions completed!", current_score: response.current_score });
        }
        
        if (response.powerups_available) {
          setPowerupsAvailable(response.powerups_available);
        }
        
        if (onQuestionComplete) onQuestionComplete(response);
      } else {
        triggerError(`❌ ${response.message}`);
        setAnswer("");
        
        if (response.next_question_ready !== undefined) {
          setTimeout(() => {
            setError(null);
            if (response.next_question_ready) {
              loadCurrentQuestion();
            } else {
              setQuestion({ completed: true, message: "All questions completed!" });
            }
          }, 2000);
        } else {
          inputRef.current?.focus();
        }
      }
    } catch (err) {
      triggerError("Failed to submit: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (hintsRemaining <= 0) return;
    try {
      const response = await client.requestHintQuestion({
        team_name: teamName,
        question_id: question.question_id,
      });
      setShowHint(true);
      setHintsRemaining(response.hints_remaining);
      setError(null);
    } catch (err) {
      triggerError("Hint extraction blocked: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUsePowerup = (powerupId) => {
    if (activePowerup === powerupId) {
      setActivePowerup(null); // Deselect
      setCertaintyFeedback(null);
    } else {
      setActivePowerup(powerupId);
      if (getPowerupEffect(powerupId) !== "certainty_check") {
        setCertaintyFeedback(null);
      }
    }
  };

  const triggerError = (msg) => {
    setError(msg);
    if (!prefersReducedMotion) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (loading) return <div className="qr-container"><div className="qr-center-pane">Initiating Challenge Matrix...</div></div>;
  
  if (question?.completed) {
    return (
      <div className="qr-container">
        <motion.div 
          className="qr-center-pane"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2ecc71' }}>🏆 Tesseract Complete!</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{question.message}</p>
          <div className="qr-score-pill" style={{ marginTop: '2rem', fontSize: '1.5rem', padding: '1rem 2rem' }}>
            Final Score: {question.current_score}
          </div>
          {!prefersReducedMotion && <Confetti width={width} height={height} {...confettiConfig[tier]} recycle={true} />}
        </motion.div>
      </div>
    );
  }

  if (!question || !question.difficulty) {
    return <div className="qr-container"><div className="qr-center-pane qr-feedback-box">Critical Error: Connection Intercepted.</div></div>;
  }

  return (
    <div className="qr-container">
      {/* ── TOP NAV HEADER ── */}
      <header className="qr-header">
        <div className="qr-header-left">
          <div className="qr-progress">
            Q{question.question_index + 1} / {question.total_questions}
          </div>
          {streak > 0 && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="qr-score-pill" 
              style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)' }}
            >
              🔥 {streak}x
            </motion.div>
          )}
        </div>
        
        <div className="qr-header-right">
          <div className="qr-timer">
            <span className="qr-timer-icon">⏱</span>
            {formatTime(elapsedTime).substring(3)} {/* Show MM:SS */}
          </div>
        </div>
      </header>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <main className="qr-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.question_id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`qr-card ${isOvercharged ? 'overcharged' : ''} ${shake ? 'error-shake' : ''}`}
          >
            {isOvercharged && !prefersReducedMotion && <ElectricOverlay />}

            <div className="qr-meta-row">
              <div className={`qr-difficulty-badge qr-difficulty-${question.difficulty}`}>
                {question.difficulty} (+{document.querySelector('body')?.dataset?.base || 100} pts)
              </div>
              <div className="qr-meta-stone">
                <span style={{fontSize: '1.2rem'}}>💎</span> {stone}
              </div>
            </div>

            <h2 className="qr-clue-text">
              <HackerText text={question.question_text} delay={0} />
            </h2>

            <div className="qr-clues-container">
              <div className="qr-clue-item">
                <strong style={{color: 'var(--text-primary)'}}>Hint 1:</strong> {question.clue_1}
              </div>
              
              <AnimatePresence>
                {revealClue2 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="qr-clue-item"
                  >
                    <strong style={{color: 'var(--text-primary)'}}>Hint 2:</strong> {question.clue_2}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!revealClue2 && (
                <button className="qr-action-btn" onClick={() => setShowClue2(true)}>
                  Reveal Hint 2 <span>▼</span>
                </button>
              )}

              {revealFirstLetter && question.hint_text && (
                <div className="qr-clue-item" style={{ borderLeftColor: 'var(--accent-secondary)' }}>
                  <strong style={{color: 'var(--accent-secondary)'}}>First Letter:</strong> {question.hint_text.trim().charAt(0)}
                </div>
              )}

              {/* Hints Drawer */}
              <AnimatePresence>
                {revealBonusHint && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }}
                    className="qr-clue-item" 
                    style={{ background: 'rgba(245,158,11,0.05)', borderLeftColor: '#f59e0b' }}
                  >
                    <strong style={{color: '#f59e0b'}}>Bonus Hint:</strong> {question.hint_text}
                  </motion.div>
                )}
              </AnimatePresence>

              {!revealBonusHint && (
                <button 
                  className="qr-action-btn qr-hint-btn" 
                  onClick={handleRequestHint} 
                  disabled={hintsRemaining <= 0 || submitting}
                >
                  Request Bonus Hint ({hintsRemaining} left) <span>💬</span>
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── STICKY FOOTER INTERFACE ── */}
      <footer className="qr-footer">
        <div className="qr-footer-content">
          
          {/* Powerups Tray (Hides when mobile keyboard covers screen) */}
          {!keyboardOpen && teamPowerups.length > 0 && (
            <div className="qr-powerups-wrap">
              <div className="qr-powerups-label">Powerups</div>
              <div className="qr-powerups-scroll">
                {teamPowerups.map((p) => (
                  <button
                    key={p.id}
                    className={`qr-powerup-pill ${activePowerup === p.id ? "active" : ""}`}
                    onClick={() => powerupsAvailable[p.id] && handleUsePowerup(p.id)}
                    disabled={!powerupsAvailable[p.id]}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Certainty Check Display */}
          {certaintyFeedback && activeEffect === "certainty_check" && (
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="qr-certainty-wrap">
              <div className="qr-certainty-label">
                <span style={{ color: certaintyFeedback.similarity_percent > 80 ? '#2ecc71' : '#f59e0b' }}>
                  {certaintyFeedback.feedback}
                </span>
                <span>{certaintyFeedback.similarity_percent}% Match</span>
              </div>
              <div className="qr-certainty-track">
                <div 
                  className="qr-certainty-fill" 
                  style={{ 
                    width: `${certaintyFeedback.similarity_percent}%`,
                    background: certaintyFeedback.similarity_percent > 80 ? '#2ecc71' : '#f59e0b'
                  }} 
                />
              </div>
            </motion.div>
          )}

          {/* Input & Submit Row */}
          <form className="qr-input-group" onSubmit={handleSubmitAnswer}>
            <input
              ref={inputRef}
              type="text"
              className={`qr-input ${error ? 'error' : ''}`}
              placeholder="Intercept answer..."
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (error) setError(null);
                if (certaintyFeedback) setCertaintyFeedback(null);
              }}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button 
              type="submit" 
              className="qr-submit"
              disabled={
                !answer.trim() ||
                submitting ||
                (activeEffect === "certainty_check" && !certaintyFeedback)
              }
            >
              {submitting ? "..." : "Lock In"}
            </button>
          </form>

          {activeEffect === "certainty_check" && (
            <div className="qr-certainty-actions">
              <button
                type="button"
                className="qr-action-btn"
                onClick={handleCertaintyCheck}
                disabled={!answer.trim() || submitting || Boolean(certaintyFeedback)}
              >
                {certaintyFeedback ? "Verified" : "Verify Answer"}
              </button>
              <span className="qr-certainty-note">
                Check answer certainty before submitting.
              </span>
            </div>
          )}

          {/* Error / Success Banners */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="qr-feedback-box">
                {error}
              </motion.div>
            )}
            {successMessage && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="qr-feedback-box success">
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </footer>

      {/* Global Hardware-Accelerated Confetti */}
      {successMessage && !prefersReducedMotion && (
        <Confetti width={width} height={height} {...confettiConfig[tier]} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default QuestionRound;
