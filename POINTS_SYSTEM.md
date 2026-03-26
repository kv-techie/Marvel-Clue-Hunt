# Marvel Clue Hunt — Points Rewarding System

## 1. Game Structure

Each team plays **20 questions** split into two phases:

| Phase | Questions | Difficulty | Active From |
|-------|-----------|------------|-------------|
| **Standard Round** | Q1–Q15 | 5 Easy + 5 Medium + 5 Hard | Game start |
| **Bonus Round** | Q16–Q20 | 5 Bonus (Extremely Hard) | Unlocked on qualification |

### Bonus Round Unlock Conditions
The bonus round unlocks **only** if both criteria are met when Q15 is completed:
1. ⏱️ **Time**: All 15 standard questions answered within **20 minutes** of timer start
2. ✅ **Qualification**: ≥2 easy + ≥3 medium + ≥3 hard answered **correctly**

If either condition fails, the game ends at Q15.

## 2. Base Points
Each question has a `base_points` value defined in `questions.json`, varying by difficulty:
- **Easy**: 100 points
- **Medium**: 200 points
- **Hard**: 300 points
- **Bonus (Extremely Hard)**: 450 points

## 3. Speed Multiplier (1.0x – 1.5x)
Faster answers earn a bonus multiplier on top of base points:

| Difficulty | Baseline Time | Formula |
|------------|--------------|---------|
| Easy | 30 seconds | `1.0 + ((30 - time) / 30) × 0.5` |
| Medium | 60 seconds | `1.0 + ((60 - time) / 60) × 0.5` |
| Hard | 90 seconds | `1.0 + ((90 - time) / 90) × 0.5` |
| Bonus | 120 seconds | `1.0 + ((120 - time) / 120) × 0.5` |

Answering **slower** than baseline = **1.0x** (no bonus, no penalty).

## 4. Combo Multiplier (1.0x – 3.0x)
Consecutive **fast** correct answers stack a combo:

| Answer Speed | Combo Boost |
|-------------|------------|
| ≤ 15 seconds | 1.5x |
| 16–30 seconds | 1.25x |
| > 30 seconds | 1.0x (no combo) |
| Wrong answer | **Resets combo to 1.0x** |

The combo multiplies on itself each question (capped at **3.0x**).

## 5. Final Question Score Formula
```
Score = base_points × speed_multiplier × combo_multiplier
```
Minimum score per question is **0** (can't go negative per question).

## 6. Deductions

| Source | Penalty |
|--------|---------|
| **Hint used** | −10 pts each (max 3 hints = −30 pts total) |
| **Tab switch** (after 3 free) | −50 pts per switch |
| **Manual deduction** by admin/volunteer | Custom amount with reason |

## 7. Final Team Score
```
Final Score = Sum(all question scores) − tab violation penalties + manual adjustments (rewards − deductions)
```
Final score **can go negative** if deductions are heavy.

## 8. PowerUp Bonuses
- **Power Surge / Jeopardy** type powerups: **2× points** on that question
- Powerups unlock through performance:
  - Speed < 10s → unlocks 1st powerup
  - Streak ≥ 3 → unlocks 2nd powerup
  - Combo ≥ 2.0x → unlocks 3rd powerup

## 9. Qualification & Disqualification
- **Qualifies**: Correctly answered ≥2 easy + ≥3 medium + ≥3 hard questions
- **Auto-disqualified**: Total deductions ≥ 500 points

