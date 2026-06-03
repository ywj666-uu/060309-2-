import enum


class UserRole(str, enum.Enum):
    TEACHER = "teacher"
    STUDENT = "student"
    JUDGE = "judge"


class TrialStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrialPhase(str, enum.Enum):
    OPENING = "opening"
    EVIDENCE = "evidence"
    CROSS_EXAMINATION = "cross_examination"
    CLOSING = "closing"
    VERDICT = "verdict"


class GroupSide(str, enum.Enum):
    PLAINTIFF = "plaintiff"
    DEFENDANT = "defendant"


class SubmissionType(str, enum.Enum):
    ARGUMENT = "argument"
    EVIDENCE = "evidence"
    REBUTTAL = "rebuttal"


class DifficultyLevel(str, enum.Enum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class TrialWinner(str, enum.Enum):
    PLAINTIFF = "plaintiff"
    DEFENDANT = "defendant"
    DRAW = "draw"
