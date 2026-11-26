# Picks which coding questions a student sees, based on the challenges they have already passed.


def current_progression(questions, completed_slugs):  # Returns (level, questions in that level, all completed?).
    tiers = sorted({question.tier for question in questions})  # Every tier that has questions, lowest first.

    for tier in tiers:
        tier_questions = [question for question in questions if question.tier == tier]
        unfinished = [question for question in tier_questions if question.slug not in completed_slugs]
        if unfinished:  # The student's level is the first tier they have not fully finished.
            return tier, tier_questions, False

    highest_tier = tiers[-1] if tiers else 1
    return highest_tier, [], True  # Every question is finished, so there is nothing left to show.
