# Focus Friction Philosophy

XPlus is not meant to shame someone for wanting a break, and it is not trying to make X impossible to use. The focus features are built around a simpler idea: when the urge to open the feed appears, add enough friction that the user has a real moment to choose.

For feeds like Home and Explore, the problem is often not one deliberate decision to spend an hour scrolling. It is a chain of small decisions: five minutes now, another five minutes later, then one more quick check. The extension should notice that pattern and respond gently, before the user has to rely on willpower alone.

## Research Ideas In Plain Language

### Present Bias And Temporal Discounting

People tend to overvalue immediate rewards compared with future benefits. Behavioral science often calls this present bias or temporal discounting. In this context, the immediate reward is the feed: novelty, social information, outrage, humor, or a small dopamine spike. The future benefit is harder to feel in the moment: focus, sleep, calm, or finishing the thing that matters.

The practical lesson for XPlus: the app should not assume the user will always make the long-term choice at the exact moment the short-term reward is available. A waiting period gives the future-oriented self a chance to come back online.

Reference:
- [Restricting Temptations: Neural Mechanisms of Precommitment](https://pmc.ncbi.nlm.nih.gov/articles/PMC3725418/)

### Precommitment Beats In-The-Moment Willpower

Precommitment means choosing limits before the tempting moment arrives. Research on temptation and self-control suggests that precommitment can work better than simply trying harder in the moment, especially for people who know they are vulnerable to impulsive choices.

XPlus is a soft precommitment device. The user still has control. They can take a break. But the extension asks them to wait first, because the waiting period protects the choice they made earlier: "I do not want the feed to be too easy to access."

References:
- [Restricting Temptations: Neural Mechanisms of Precommitment](https://pmc.ncbi.nlm.nih.gov/articles/PMC3725418/)
- [Behavioral Economics Toolkit: Commitment Devices](https://www.ncbi.nlm.nih.gov/books/NBK593511/)

### Self-Control Failure Is Often Repeated, Not One-Time

Social media self-control failure often shows up as repeated small lapses. A single short break may be harmless. The risk appears when the user keeps returning during the same vulnerable window.

The practical lesson for XPlus: the extension should not treat every break request as identical. If the last 24 hours already include meaningful break time, the next request should have a little more friction and more relevant copy.

Reference:
- [A brief measure of social media self-control failure](https://doi.org/10.1016/j.chb.2018.02.002)

## Why The Friction Is Stepped, Not Exponential

The goal is to create a pause, not a punishment. If friction grows too aggressively, the user may feel trapped, disable the extension, or look for a workaround. That would defeat the purpose.

The current model uses a risk-state score instead of raw time alone. It looks at:

- Actual break time in the last 24 hours.
- Actual break time in the last 3 hours.
- How many breaks started in the last 3 hours.
- Whether the user repeatedly chose 5-minute breaks.
- Whether the last break ended very recently or was well spaced.

This matters because repeated 5-minute breaks close together are more likely to represent a checking loop than one 15-minute break followed by another break several hours later.

The score maps to stepped states:

- Steady: normal waiting time.
- Watchful: 1.5x waiting time.
- Checking loop: 2x waiting time.
- High friction: 3x waiting time, capped at 10 minutes.

This is intentionally firm but bounded. It says, "Something is happening here; slow down," without turning the extension into an adversary.

## Why We Count Actual Used Time

If a user asks for a 30 minute break but turns focus protection back on after 7 minutes, the extension should count about 7 minutes, not 30. That behavior matters philosophically and practically.

It rewards recovery. If the user catches themselves and returns to focus early, the app should recognize that choice. Counting granted time would make the report feel unfair and would make adaptive friction too aggressive.

So XPlus tracks the elapsed time while protection is actually snoozed:

- If the snooze expires naturally, it counts the full elapsed snooze.
- If the user turns protection back on early, it counts only the time used.
- If the countdown is cancelled before the snooze starts, it counts nothing.

## Tone Guidelines

The focus copy should be direct, calm, and non-shaming.

Good:
- "You have already taken a short break recently."
- "This may be turning into a loop. Consider closing X after this."
- "This pause is here to help you choose intentionally."

Avoid:
- Calling the user weak, addicted, lazy, or out of control.
- Overstating medical or clinical claims.
- Making the app feel like it is punishing the user.

The product promise is simple: XPlus adds a deliberate pause between urge and action.
