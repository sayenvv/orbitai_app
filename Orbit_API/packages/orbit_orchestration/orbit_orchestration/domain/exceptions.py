class HumanInputRequired(Exception):
    """Legacy marker for API-driven HITL (prefer :data:`~orbit_orchestration.domain.constants.HITL_PAUSE_SENTINEL`)."""

    def __init__(self, prompt: str) -> None:
        self.prompt = prompt
        super().__init__(prompt)
