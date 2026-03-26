# Marvel Clue Hunt: Powerups Deep Dive ⚡

The Powerup system in Marvel Clue Hunt provides strategic advantages to teams, uniquely tied to the **Infinity Stone** they are assigned (Mind, Power, Time, Space, Reality, or Soul). 

Teams do not start with powerups unlocked. Instead, powerups are earned organically through exceptional gameplay performance during the hunt.

---

## 🔓 How Powerups are Earned

Each team has three specific powerups associated with their Infinity Stone. They are unlocked sequentially by achieving specific gameplay milestones during a Question Round:

1. **Tier 1 Powerup (Lightning Speed!)**
   - **Requirement:** Answer a question correctly in under **10 seconds**.
   - **Unlock:** Grants the first powerup in the team's stone arsenal.

2. **Tier 2 Powerup (Streak Unlocked!)**
   - **Requirement:** Build a hot streak of **3 consecutive correct answers**.
   - **Unlock:** Grants the second powerup.

3. **Tier 3 Powerup (Combo Mastery!)**
   - **Requirement:** Achieve a combo multiplier of **2.0x or higher** (awarded for sustained rapid, accurate answers).
   - **Unlock:** Grants the third and final powerup.

Once unlocked, a powerup becomes "Available". A team can choose to activate a single available powerup before submitting their answer to a question. Once used, the powerup is consumed for that question.

---

## 💎 The Infinity Stones & Their Powerups

Below is the deep brief of all powerups categorized by their respective Infinity Stones:

### 🧠 Mind Stone (Mental Acuity & Forgiveness)
The Mind Stone focuses on providing extra information and protecting against intellectual missteps.
- **Insight Surge:** Reveals an extra hidden clue for the current question to help the team solve it.
- **Logic Lock:** Temporarily activates a "fuzzy match boost," causing the system to be highly forgiving of typos or spelling variations in the submitted answer.
- **Cerebral Fortress:** Acts as a mental shield for the next incorrect answer, preventing the team's streak from resetting to zero.

### 💥 Power Stone (Raw Scoring Potential)
The Power Stone is aggressive, designed to drastically maximize point outputs.
- **Power Surge:** Applies a massive 2x score multiplier to the next correct answer's base points.
- **Force Amplifier:** Permanently increases the team's combo multiplier boundary by +0.5x, allowing for higher score ceilings on subsequent fast answers.
- **Unstoppable:** Saves the team's combo multiplier counter from breaking and resetting if they submit a wrong answer.

### ⏳ Time Stone (Temporal Manipulation)
The Time Stone manipulates the ticking clock, alleviating the pressure of speed-based scoring.
- **Time Rewind:** Adds 30 extra seconds to the current question's timer, slowing down the speed deduction curve.
- **Chronosphere:** Slows down the timer significantly (time is calculated as moving 50% slower).
- **Temporal Shift:** Allows the team to skip the current question entirely without breaking their streak or suffering a penalty.

### 🌌 Space Stone (Bypassing Bounds)
The Space Stone allows teams to bypass standard game restrictions and traverse the quiz quickly.
- **Spatial Expansion:** Unlocks both hidden clues immediately without needing to wait or spend hints.
- **Dimensional Rift:** Skip the current question completely penalty-free.
- **Cosmic Shield:** Prevents the next wrong answer from breaking the team's ongoing streak.

### 🔴 Reality Stone (Altering the Rules)
The Reality Stone warps the structural reality of the game itself—altering difficulties and providing unparalleled insights.
- **Reality Distortion:** Artificially reduces the logged difficulty of the question, granting bonus points as if the team solved a harder tier.
- **Probability Collapse:** Collapses the infinite possibilities by revealing the first letter of the correct answer.
- **Certainty Check (Truth Manifestation):** An interactive powerup that evaluates the team's drafted answer *before* submission, providing an AI-driven percentage on how similar it is to the correct answer. The team can revise their answer based on this feedback without penalty.

### ☄️ Soul Stone (Cooperation & Restoration)
The Soul Stone ties the fate of the team to others, offering restorative and cooperative benefits.
- **Soul Bond:** Shares 15% of the points earned on the current question with all 5 other active teams, fostering global cooperation.
- **Spirit Guide:** Automatically corrects minor typos in the submitted answer behind the scenes.
- **Life Force:** Restores one used hint back to the team's available pool (up to the maximum of 3).

---

## ⚙️ Backend Mechanics (Implementation Notes)
When a team submits an answer:
1. The backend cross-references the `powerup_used` flag with the team's `powerups_available` dictionary.
2. If valid, the powerup is marked as `False` in available powerups and appended to `powerups_used`.
3. Specialized logic (such as `Certainty Check` calling the `/certainty-check` endpoint, or `Power Surge` multiplying the `question_score *= 2`) intersects with the standard scoring algorithm in `submit_question` to determine final point yields and streak preservations.
