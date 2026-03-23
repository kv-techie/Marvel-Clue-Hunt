import json
import os
from typing import Dict, List, Optional

# Path candidates for dialogue data file
APP_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(APP_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

DIALOGUE_FILE_CANDIDATES = [
    os.path.join(APP_DIR, "data", "team_dialogues.json"),
    os.path.join(PROJECT_ROOT, "sample_data", "team_dialogues.json"),
]


class DialogueManager:
    """Manages loading and retrieving character-specific dialogues with hints"""

    def __init__(self, dialogue_path: Optional[str] = None):
        if dialogue_path:
            self.dialogue_path = dialogue_path
        else:
            self.dialogue_path = DIALOGUE_FILE_CANDIDATES[0]
            for candidate in DIALOGUE_FILE_CANDIDATES:
                if os.path.exists(candidate):
                    self.dialogue_path = candidate
                    break
        self.dialogues: Dict = {}
        self.load_dialogues()

    def load_dialogues(self):
        """Load dialogues from JSON file"""
        try:
            if os.path.exists(self.dialogue_path):
                with open(self.dialogue_path, "r", encoding="utf-8") as f:
                    self.dialogues = json.load(f)
                print(
                    f"[OK] Loaded dialogues for characters: {list(self.dialogues.keys())}"
                )
            else:
                print(
                    f"[WARN] Dialogue file not found at: {os.path.abspath(self.dialogue_path)}"
                )
        except Exception as e:
            print(f"[ERROR] Error loading dialogues: {e}")

    def get_dialogue(self, character: str, dialogue_number: int) -> Optional[Dict]:
        """
        Get a specific dialogue for a character

        Args:
            character: Character name (e.g., "Iron Man")
            dialogue_number: 1, 2, or 3

        Returns:
            Dictionary with clue, dialogue, and hints
        """
        if character not in self.dialogues:
            return None

        character_dialogues = self.dialogues[character]
        for dialogue in character_dialogues:
            if dialogue.get("dialogue_number") == dialogue_number:
                return dialogue

        return None

    def get_clue(self, character: str, dialogue_number: int) -> Optional[str]:
        """Get the clue for a dialogue"""
        dialogue = self.get_dialogue(character, dialogue_number)
        return dialogue.get("clue") if dialogue else None

    def get_answer(self, character: str, dialogue_number: int) -> Optional[str]:
        """Get the correct answer for a dialogue"""
        dialogue = self.get_dialogue(character, dialogue_number)
        return dialogue.get("dialogue") if dialogue else None

    def get_hints(self, character: str, dialogue_number: int) -> List[str]:
        """
        Get all hints for a dialogue

        Returns:
            List of 3 hints
        """
        dialogue = self.get_dialogue(character, dialogue_number)
        if not dialogue:
            return []

        hints = []
        for i in range(1, 4):
            hint_key = f"hint_{i}"
            if hint_key in dialogue:
                hints.append(dialogue[hint_key])

        return hints

    def get_hint(
        self, character: str, dialogue_number: int, hint_number: int
    ) -> Optional[str]:
        """
        Get a specific hint (1, 2, or 3) for a dialogue

        Args:
            character: Character name
            dialogue_number: 1, 2, or 3
            hint_number: 1, 2, or 3

        Returns:
            Hint text or None
        """
        hints = self.get_hints(character, dialogue_number)
        if 0 <= hint_number - 1 < len(hints):
            return hints[hint_number - 1]
        return None

    def validate_answer(
        self, character: str, dialogue_number: int, answer: str
    ) -> bool:
        """
        Check if an answer is correct (case-insensitive, whitespace-trimmed)

        Args:
            character: Character name
            dialogue_number: 1, 2, or 3
            answer: User's answer

        Returns:
            True if correct, False otherwise
        """
        correct = self.get_answer(character, dialogue_number)
        if not correct:
            return False

        return answer.strip().lower() == correct.strip().lower()

    def get_all_characters(self) -> List[str]:
        """Get list of all available characters"""
        return list(self.dialogues.keys())

    def character_exists(self, character: str) -> bool:
        """Check if a character has dialogues"""
        return character in self.dialogues


# Create a global instance
dialogue_manager = DialogueManager()
