from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App settings
    app_name: str = "Marvel Clue Hunt"
    debug: bool = True
    
    # Game settings
    max_hints: int = 3
    hint_penalty: int = 10
    dialogue_rounds: int = 3
    qualification_threshold: int = 2
    
    # Scoring thresholds (in seconds)
    dialogue_1_excellent: int = 300  # 5 min
    dialogue_1_good: int = 480       # 8 min
    dialogue_2_excellent: int = 420  # 7 min
    dialogue_2_good: int = 600       # 10 min
    dialogue_3_excellent: int = 480  # 8 min
    dialogue_3_good: int = 720       # 12 min
    
    # Bonus points
    enactment_bonus: int = 50
    
    class Config:
        env_file = ".env"

settings = Settings()