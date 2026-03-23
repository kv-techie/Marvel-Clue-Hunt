import json
import os
from difflib import SequenceMatcher
from typing import Dict, List, Optional

# Load questions from JSON


class QuestionManager:
    def __init__(self, questions_file: str):
        self.questions_file = questions_file
        self.questions_by_stone: Dict[str, List[Dict]] = {}
        self.all_questions: Dict[str, Dict] = {}
        self._load_questions()

    def _load_questions(self):
        """Load questions from JSON file"""
        try:
            if not os.path.exists(self.questions_file):
                print(f"[QUESTION] File not found: {self.questions_file}")
                return

            with open(self.questions_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Organize by stone and build lookup table
            for stone_data in data.get("stones", []):
                stone_name = stone_data.get("stone")
                questions = stone_data.get("questions", [])

                # Store by stone
                self.questions_by_stone[stone_name] = questions

                # Build lookup by ID
                for question in questions:
                    self.all_questions[question["id"]] = {
                        **question,
                        "stone": stone_name,
                    }

            print(
                f"[QUESTION] Loaded {len(self.all_questions)} questions from {len(self.questions_by_stone)} stones"
            )
        except Exception as e:
            print(f"[QUESTION] Error loading questions: {e}")

    def get_questions_for_stone(self, stone_name: str) -> List[Dict]:
        """Get all questions for a specific stone"""
        return self.questions_by_stone.get(stone_name, [])

    def get_question(self, question_id: str) -> Optional[Dict]:
        """Get a specific question by ID"""
        return self.all_questions.get(question_id)

    def get_current_question(
        self, stone_name: str, question_index: int
    ) -> Optional[Dict]:
        """Get the current question for a team (by index number)"""
        questions = self.get_questions_for_stone(stone_name)
        if 0 <= question_index < len(questions):
            return questions[question_index]
        return None

    def get_question_for_display(self, question_id: str) -> Optional[Dict]:
        """Get question data for frontend display (excludes correct answer)"""
        question = self.get_question(question_id)
        if not question:
            return None

        return {
            "id": question["id"],
            "question_text": question["question_text"],
            "clue_1": question["clue_1"],
            "clue_2": question["clue_2"],
            "Stone": question.get("stone"),
            "difficulty": question["difficulty"],
            "base_points": question["base_points"],
            # Don't send correct_answer or hint_text to frontend
        }

    def validate_answer(
        self, question_id: str, submitted_answer: str, ignore_case: bool = True
    ) -> bool:
        """
        Validate if submitted answer matches correct answer.
        Uses fuzzy matching to account for typos (>85% match).

        Args:
            question_id: ID of the question
            submitted_answer: Answer submitted by team
            ignore_case: Whether to ignore case (default True)

        Returns:
            True if answer is correct, False otherwise
        """
        question = self.get_question(question_id)
        if not question:
            return False

        correct = question["correct_answer"]

        if ignore_case:
            submitted_answer = submitted_answer.strip().lower()
            correct = correct.lower()
        else:
            submitted_answer = submitted_answer.strip()

        # Exact match
        if submitted_answer == correct:
            return True

        # Fuzzy match (>85% similarity)
        similarity = SequenceMatcher(None, submitted_answer, correct).ratio()
        return similarity > 0.85

    def get_hint(self, question_id: str) -> Optional[str]:
        """Get hint text for a question"""
        question = self.get_question(question_id)
        if not question:
            return None
        return question["hint_text"]

    def get_answer_similarity(self, question_id: str, submitted_answer: str) -> float:
        """
        Get similarity score between submitted answer and correct answer.
        Used for 'Certainty Check' powerup.

        Returns:
            Similarity score from 0.0 to 1.0
        """
        question = self.get_question(question_id)
        if not question:
            return 0.0

        correct = question["correct_answer"].lower()
        submitted = submitted_answer.strip().lower()

        similarity = SequenceMatcher(None, submitted, correct).ratio()
        return min(similarity, 1.0)

    def get_answer_quality_feedback(
        self, question_id: str, submitted_answer: str
    ) -> Dict:
        """
        Get detailed feedback on answer quality for 'Certainty Check' powerup.

        Returns:
            Dict with:
            - match_level: "low" | "medium" | "high"
            - similarity_percent: 0-100
            - feedback: User-friendly message
        """
        question = self.get_question(question_id)
        if not question:
            return {
                "match_level": "low",
                "similarity_percent": 0,
                "feedback": "Unknown question",
            }

        similarity = self.get_answer_similarity(question_id, submitted_answer)
        similarity_percent = int(similarity * 100)

        # Determine match level
        if similarity >= 0.85:
            match_level = "high"
            feedback = "✅ This looks very close to the correct answer!"
        elif similarity >= 0.65:
            match_level = "medium"
            feedback = "🤔 This is partially correct. You might be missing something."
        else:
            match_level = "low"
            feedback = "❌ This doesn't match the expected answer. Try again!"

        return {
            "match_level": match_level,
            "similarity_percent": similarity_percent,
            "feedback": feedback,
            "hint_available": True,  # Can still use hint
        }

    def get_all_stone_names(self) -> List[str]:
        """Get list of all stone names"""
        return list(self.questions_by_stone.keys())


# Singleton instance
_questions_file = os.path.join(os.path.dirname(__file__), "data", "questions.json")
question_manager = QuestionManager(_questions_file)
