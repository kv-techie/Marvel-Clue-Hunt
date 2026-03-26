# Marvel Clue Hunt — Points Rewarding System

## 1. Base Points
Each question has a `base_points` value defined in `questions.json`, varying by difficulty:
- **Easy**: 100 points
- **Medium**: 200 points
- **Hard**: 300 points

## 2. Speed Multiplier (1.0x – 1.5x)
Faster answers earn a bonus multiplier on top of base points:

| Difficulty | Baseline Time | Formula |
|------------|--------------|---------|
| Easy | 30 seconds | `1.0 + ((30 - time) / 30) × 0.5` |
| Medium | 60 seconds | `1.0 + ((60 - time) / 60) × 0.5` |
| Hard | 90 seconds | `1.0 + ((90 - time) / 90) × 0.5` |

Answering **slower** than baseline = **1.0x** (no bonus, no penalty).

## 3. Combo Multiplier (1.0x – 3.0x)
Consecutive **fast** correct answers stack a combo:

| Answer Speed | Combo Boost |
|-------------|------------|
| ≤ 15 seconds | 1.5x |
| 16–30 seconds | 1.25x |
| > 30 seconds | 1.0x (no combo) |
| Wrong answer | **Resets combo to 1.0x** |

The combo multiplies on itself each question (capped at **3.0x**).

## 4. Final Question Score Formula
```
Score = base_points × speed_multiplier × combo_multiplier
```
Minimum score per question is **0** (can't go negative per question).

## 5. Deductions

| Source | Penalty |
|--------|---------|
| **Hint used** | −10 pts each (max 3 hints = −30 pts total) |
| **Tab switch** (after 3 free) | −50 pts per switch |
| **Manual deduction** by admin/volunteer | Custom amount with reason |

## 6. Final Team Score
```
Final Score = Sum(all question scores) − tab violation penalties + manual adjustments (rewards − deductions)
```
Final score **can go negative** if deductions are heavy.

## 7. PowerUp Bonuses
- **Power Surge / Jeopardy** type powerups: **2× points** on that question
- Powerups unlock through performance:
  - Speed < 10s → unlocks 1st powerup
  - Streak ≥ 3 → unlocks 2nd powerup
  - Combo ≥ 2.0x → unlocks 3rd powerup

## 8. Qualification & Disqualification
- **Qualifies**: Completed ≥ 2 questions
- **Auto-disqualified**: Total deductions ≥ 200 points
