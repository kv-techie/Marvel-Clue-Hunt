import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTimer } from "../context/TimerContext";
import * as client from "../api/client";
import "../styles/QuestionRound.css";

const QuestionRound = ({ teamName, onQuestionComplete }) => {
  const { user } = useAuth();
  const { elapsedTime } = useTimer();

  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [powerupsAvailable, setPowerupsAvailable] = useState({});
  const [teamPowerups, setTeamPowerups] = useState([]);
  const [activePowerup, setActivePowerup] = useState(null);
  const [certaintyFeedback, setCertaintyFeedback] = useState(null);
  const [stone, setStone] = useState(null);
  const [showClue2, setShowClue2] = useState(false);

  // Load current question on component mount or when question changes
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
      console.log(`[QuestionRound] Loading question for team: ${teamName}`);
      const response = await client.getCurrentQuestion(teamName);
      
      console.log("[QuestionRound] Question response:", response);

      if (response.completed) {
        setQuestion({ completed: true, message: response.message });
        return;
      }

      setQuestion(response);
      setHintsRemaining(response.hints_remaining);
      setPowerupsAvailable(response.powerups_available);
      
      // Load team stone info
      const stoneData = await client.getTeamStone(teamName);
      console.log("[QuestionRound] Stone data:", stoneData);
      setStone(stoneData.stone);

      const powerupData = await client.getTeamPowerups(teamName);
      setTeamPowerups(powerupData.powerups || []);
    } catch (err) {
      console.error("[QuestionRound] Error loading question:", err);
      setError(
        err.response?.data?.detail ||
          "Failed to load question: " + err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError("Please enter an answer");
      return;
    }

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
        // Show success and load next question
        alert(`🎉 ${response.message}\nScore: +${response.score_earned} points`);
        if (response.next_question_ready) {
          loadCurrentQuestion();
        } else {
          setQuestion({ completed: true, message: "All questions completed!" });
        }
        if (response.powerups_available) {
          setPowerupsAvailable(response.powerups_available);
        }
        if (onQuestionComplete) onQuestionComplete(response);
      } else {
        // Incorrect answer - allow retry with cleared input
        setError(`❌ ${response.message}`);
        setAnswer(""); // Clear input field for another attempt
        // Focus back on input for easy retry
        setTimeout(() => {
          document.querySelector('.answer-input')?.focus();
        }, 100);
      }
    } catch (err) {
      console.error("[QuestionRound] Submit answer error:", err);
      setError("Failed to submit answer: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (hintsRemaining <= 0) {
      setError("No hints remaining");
      return;
    }

    try {
      const response = await client.requestHintQuestion({
        team_name: teamName,
        question_id: question.question_id,
      });

      setShowHint(true);
      setHintsRemaining(response.hints_remaining);
      setError(null);
    } catch (err) {
      setError(
        "Failed to get hint: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const handleCertaintyCheck = async () => {
    if (!answer.trim()) {
      setError("Enter an answer first");
      return;
    }

    try {
      const response = await client.certaintyCheck(
        teamName,
        question.question_id,
        answer
      );

      setCertaintyFeedback(response.feedback);
      setActivePowerup("Certainty Check");
    } catch (err) {
      setError(
        "Certainty Check failed: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const handleUsePowerup = (powerupId) => {
    if (!powerupsAvailable[powerupId]) {
      setError("This powerup is not available or already used");
      return;
    }

    setActivePowerup(powerupId);
    setError(null);
  };

  if (loading) return <div className="question-loading">Loading question...</div>;

  if (error) {
    return <div className="question-error">{error}</div>;
  }

  if (question?.completed) {
    return (
      <div className="question-completed">
        <h2>🏆 Congratulations!</h2>
        <p>{question.message}</p>
        <p className="final-score">Final Score: {question.current_score} points</p>
      </div>
    );
  }

  if (!question || !question.difficulty) {
    return <div className="question-error">Failed to load question - missing data</div>;
  }

  return (
    <div className="question-round-container">
      <div className="question-header">
        <div className="question-progress">
          Question {question.question_index + 1} of {question.total_questions}
        </div>
        <div className="question-stone">
          <span className="stone-badge">{stone}</span>
        </div>
        <div className="question-difficulty">
          <span className={`difficulty-${question.difficulty}`}>
            {question.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="question-content">
        <h2 className="question-text">{question.question_text}</h2>

        <div className="clues-section">
          <div className="clue clue-1">
            <strong>💡 Clue 1:</strong> {question.clue_1}
          </div>
          <button
            className="clue-toggle-btn"
            onClick={() => setShowClue2(!showClue2)}
          >
            {showClue2 ? "Hide Clue 2" : "Show Clue 2"}
          </button>
          {showClue2 && (
            <div className="clue clue-2">
              <strong>💡 Clue 2:</strong> {question.clue_2}
            </div>
          )}
        </div>

        {showHint && (
          <div className="hint-display">
            <strong>💬 Hint:</strong> {question.hint_text}
          </div>
        )}

        <div className="answer-input-section">
          <label htmlFor="question-answer-input" className="sr-only">
            Answer input
          </label>
          <input
            id="question-answer-input"
            type="text"
            className={`answer-input ${error ? 'error' : ''}`}
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              // Clear error when user starts typing a new answer
              if (e.target.value.length > 0 && error) {
                setError(null);
              }
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
            disabled={submitting}
          />
        </div>

        {certaintyFeedback && (
          <div className={`certainty-feedback ${certaintyFeedback.match_level}`}>
            <div className="feedback-level">
              {certaintyFeedback.feedback}
            </div>
            <div className="similarity-bar">
              <div
                className="similarity-fill"
                style={{
                  width: `${certaintyFeedback.similarity_percent}%`,
                }}
              >
                {certaintyFeedback.similarity_percent}%
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="actions-section">
        <div className="actions-left">
          <button
            className="hint-btn"
            onClick={handleRequestHint}
            disabled={hintsRemaining === 0 || submitting}
          >
            💭 Hint ({hintsRemaining}/3)
          </button>
        </div>

        <div className="actions-center">
          <button
            className="submit-btn"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || submitting}
          >
            {submitting ? "Submitting..." : "Submit Answer"}
          </button>
        </div>

        <div className="actions-right" />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="powerup-bar">
        <div className="powerups-label">⚡ PowerUps ({stone}):</div>
        <div className="powerups-list">
          {teamPowerups.map((powerup) => (
            <button
              key={powerup.id}
              className={`powerup-button ${
                powerupsAvailable[powerup.id] ? "available" : "used"
              } ${activePowerup === powerup.id ? "active" : ""}`}
              onClick={() =>
                powerupsAvailable[powerup.id] && handleUsePowerup(powerup.id)
              }
              disabled={!powerupsAvailable[powerup.id]}
              title={`${powerup.name}${
                !powerupsAvailable[powerup.id] ? " (locked/used)" : ""
              }`}
            >
              {powerup.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionRound;
