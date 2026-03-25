from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App settings
    app_name: str = "Marvel Clue Hunt"
    debug: bool = True

    # Game settings
    max_hints: int = 3
    hint_penalty: int = 10
    dialogue_rounds: int = 3
    qualification_threshold: int = 2
    disqualification_deduction_threshold: int = (
        500  # Auto-disqualify if deductions exceed this
    )

    # Scoring thresholds (in seconds) - 90 minute event duration
    dialogue_1_excellent: int = 1080  # 18 min
    dialogue_1_good: int = 1500  # 25 min
    dialogue_2_excellent: int = 1200  # 20 min
    dialogue_2_good: int = 1680  # 28 min
    dialogue_3_excellent: int = 1320  # 22 min
    dialogue_3_good: int = 1800  # 30 min

    # Bonus points
    enactment_bonus: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
