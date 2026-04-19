import time

class DebugSession:
    def __init__(self):
        self.start_time = time.time()
        self.attempts = 0
        self.errors = 0
        self.success = False

    def record_attempt(self, has_error: bool):
        self.attempts += 1
        if has_error:
            self.errors += 1
        else:
            self.success = True

    def calculate_score(self):
        total_time = time.time() - self.start_time

        if not self.success:
            return 20  # low score if never solved

        score = 100
        score -= self.attempts * 5
        score -= self.errors * 3
        score -= int(total_time / 10)

        return max(score, 10)
