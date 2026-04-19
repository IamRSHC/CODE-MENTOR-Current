# ================================
# Persistent In-Memory Student DB
# ================================

student_profiles = {}

def update_student_profile(user_id, score, state):

    # create new profile if first time user
    if user_id not in student_profiles:
        student_profiles[user_id] = {
            "attempts": 0,
            "total_score": 0,
            "level": "beginner"
        }

    profile = student_profiles[user_id]

    # update stats
    profile["attempts"] += 1
    profile["total_score"] += score

    avg_score = profile["total_score"] / profile["attempts"]

    # ================================
    # LEVEL LOGIC (STABLE)
    # ================================
    if profile["attempts"] < 3:
        level = "beginner"

    elif avg_score > 70:
        level = "advanced"

    elif avg_score > 40:
        level = "intermediate"

    else:
        level = "beginner"

    profile["level"] = level

    # ================================
    # MEMORY DEBUG PRINT
    # ================================
    print("\n====== MEMORY DEBUG ======")
    print("USER:", user_id)
    print("ATTEMPTS:", profile["attempts"])
    print("TOTAL SCORE:", profile["total_score"])
    print("AVG SCORE:", avg_score)
    print("LEVEL:", profile["level"])
    print("==========================\n")

    return profile["level"]
